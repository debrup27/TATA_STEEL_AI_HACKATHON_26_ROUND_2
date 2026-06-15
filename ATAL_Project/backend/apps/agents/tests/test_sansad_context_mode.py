"""Tests for MANAS /sansad persistent context mode."""
from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from apps.agents.models import ChatSession
from apps.agents.sansad_context_mode import (
    _SANSAD_META_KEYS,
    activate_sansad_mode,
    collect_plant_context_bundle,
    deactivate_sansad_mode,
    increment_sansad_turn_and_maybe_refresh,
    sansad_llm_answer,
    summarize_sansad_context,
)
from apps.agents.tasks import _sansad_context_addendum

User = get_user_model()


@override_settings(OLLAMA_MOCK=1)
class SansadContextBundleTests(TestCase):
    def test_collect_plant_context_bundle_keys(self):
        bundle = collect_plant_context_bundle()
        for key in (
            "generated_at",
            "anomaly_flags",
            "factory_snapshots",
            "alarms",
            "maintenance_events",
            "reports",
            "kpis",
            "action_plans",
            "diagnostics_highlights",
        ):
            self.assertIn(key, bundle)


@override_settings(OLLAMA_MOCK=1)
class SansadMetadataLifecycleTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="sansad_ctx", password="testpass123")
        self.session = ChatSession.objects.create(user=self.user, session_metadata={})

    @patch("apps.agents.sansad_context_mode._sync_sansad_context")
    def test_activate_sets_mode_flags(self, mock_sync):
        activate_sansad_mode(str(self.session.id))
        self.session.refresh_from_db()
        self.assertTrue(self.session.session_metadata.get("sansad_mode"))
        self.assertEqual(self.session.session_metadata.get("sansad_turn_count"), 0)
        self.assertEqual(self.session.session_metadata.get("sansad_refresh_every"), 5)
        mock_sync.assert_called_once_with(str(self.session.id), is_refresh=False)

    @patch("apps.agents.sansad_context_mode._sync_sansad_context")
    def test_update_requires_mode_and_replaces(self, mock_sync):
        self.session.session_metadata = {"sansad_mode": True, "sansad_context_summary": "old"}
        self.session.save()
        from apps.agents.sansad_context_mode import update_sansad_context

        update_sansad_context(str(self.session.id))
        mock_sync.assert_called_once_with(str(self.session.id), is_refresh=True, replace=True)

    def test_update_raises_when_mode_inactive(self):
        from apps.agents.sansad_context_mode import update_sansad_context

        with self.assertRaises(ValueError):
            update_sansad_context(str(self.session.id))

    def test_deactivate_clears_metadata(self):
        self.session.session_metadata = {
            "sansad_mode": True,
            "sansad_context_summary": "Plant briefing",
            "sansad_context_updated_at": "2026-01-01T00:00:00",
            "sansad_turn_count": 3,
            "sansad_refresh_every": 5,
            "title": "Keep me",
        }
        self.session.save()

        with patch("apps.agents.stream_registry.send_to_stream") as mock_send:
            deactivate_sansad_mode(str(self.session.id))

        self.session.refresh_from_db()
        meta = self.session.session_metadata
        for key in _SANSAD_META_KEYS:
            self.assertNotIn(key, meta)
        self.assertEqual(meta.get("title"), "Keep me")
        mock_send.assert_called_once()

    def test_addendum_includes_summary_when_mode_active(self):
        session = SimpleNamespace(
            asset_id=None,
            session_metadata={
                "sansad_mode": True,
                "sansad_context_summary": "## Plant status\nSRF bearing vibration elevated.",
                "sansad_context_updated_at": "2026-06-15T12:00:00",
            },
        )
        addendum = _sansad_context_addendum(session)
        self.assertIn("SRF bearing vibration elevated", addendum)
        self.assertIn("SANSAD plant context", addendum)
        self.assertIn("Factory 1 / F1 = Horizon", addendum)
        self.assertIn("Historical maintenance logs", addendum)

    @patch("apps.agents.sansad_context_mode.collect_plant_context_bundle")
    def test_addendum_fetches_historical_slice_for_log_questions(self, mock_bundle):
        mock_bundle.return_value = {
            "maintenance_events": [
                {
                    "date": "2026-01-01",
                    "factory": "Zephyr",
                    "asset": "FS-02",
                    "event_type": "corrective",
                    "description": "bearing inspection",
                    "downtime_hours": 2.0,
                }
            ],
            "reports": [],
            "historical_dossiers": [],
            "alarm_history_90d": [],
            "kpis": {},
        }
        session = SimpleNamespace(
            asset_id=None,
            session_metadata={
                "sansad_mode": True,
                "sansad_context_summary": "## Plant status\nNominal.",
                "sansad_context_updated_at": "2026-06-15T12:00:00",
            },
        )
        addendum = _sansad_context_addendum(
            session,
            "any historical maintenance logs i should be aware of",
        )
        self.assertIn("SANSAD query fetch", addendum)
        self.assertIn("bearing inspection", addendum)


@override_settings(OLLAMA_MOCK=1)
class SansadTurnCounterTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="sansad_turn", password="testpass123")
        self.session = ChatSession.objects.create(
            user=self.user,
            session_metadata={
                "sansad_mode": True,
                "sansad_context_summary": "briefing",
                "sansad_turn_count": 4,
                "sansad_refresh_every": 5,
            },
        )

    @patch("threading.Thread")
    def test_increment_triggers_refresh_on_fifth_turn(self, mock_thread):
        increment_sansad_turn_and_maybe_refresh(str(self.session.id))
        self.session.refresh_from_db()
        self.assertEqual(self.session.session_metadata.get("sansad_turn_count"), 5)
        mock_thread.assert_called_once()
        args, kwargs = mock_thread.call_args
        self.assertEqual(kwargs.get("target").__name__, "maybe_refresh_sansad_context")

    @patch("threading.Thread")
    def test_increment_no_refresh_before_interval(self, mock_thread):
        self.session.session_metadata["sansad_turn_count"] = 2
        self.session.save()
        increment_sansad_turn_and_maybe_refresh(str(self.session.id))
        self.session.refresh_from_db()
        self.assertEqual(self.session.session_metadata.get("sansad_turn_count"), 3)
        mock_thread.assert_not_called()


@override_settings(OLLAMA_MOCK=1)
class SansadSummarizerTests(TestCase):
    @patch("apps.agents.llm.client.invoke_guarded")
    def test_summarize_returns_model_output(self, mock_invoke):
        mock_invoke.return_value = (
            "## Plant status\n"
            "Horizon average health 92% with three assets on maintenance watch this shift.",
            None,
        )
        summary = summarize_sansad_context({"asset_count": 8, "factory_snapshots": []})
        self.assertIn("Plant status", summary)
        self.assertIn("Horizon", summary)
        mock_invoke.assert_called()

    @patch("apps.agents.llm.client.invoke_guarded")
    def test_summarize_fallback_when_empty(self, mock_invoke):
        mock_invoke.side_effect = [("", None), ("", None)]
        summary = summarize_sansad_context({"asset_count": 3, "factory_snapshots": []})
        self.assertIn("# Plant data bundle", summary)

    @patch("apps.agents.llm.client.invoke_guarded")
    def test_summarize_fallback_when_thinking_only(self, mock_invoke):
        mock_invoke.side_effect = [("Thinking", None), ("Thinking", None)]
        bundle = {
            "asset_count": 2,
            "factory_snapshots": [{
                "factory_name": "Horizon",
                "factory_code": "F1",
                "factory_label": "Factory 1",
                "layman_summary": "Horizon: line is in good shape.",
                "plant_health_score": 88,
                "avg_rul_hours": 120,
                "assets_needing_attention": 1,
                "assets": [],
            }],
        }
        summary = summarize_sansad_context(bundle)
        self.assertIn("Factory 1", summary)
        self.assertIn("Horizon", summary)


class SansadLlmAnswerTests(TestCase):
    @patch("apps.agents.llm.client._invoke_ollama_chat_completions_parts")
    def test_sansad_llm_answer_uses_model_output(self, mock_parts):
        mock_parts.return_value = (
            "## Zephyr status\nFS-02 RUL 48h with elevated vibration.",
            "",
        )
        answer = sansad_llm_answer(
            "brief me on zephyr",
            "## Plant status\n### Factory 2 — Zephyr (F2)\nFS-02 RUL 48h",
        )
        self.assertIn("FS-02", answer)
        mock_parts.assert_called()

    @patch("apps.agents.llm.client._invoke_ollama_chat_completions_parts")
    def test_sansad_llm_answer_retries_on_empty(self, mock_parts):
        mock_parts.side_effect = [
            ("", "planning only"),
            ("Horizon line stable at 92% health with no active trips on priority assets.", ""),
        ]
        answer = sansad_llm_answer("plant status", "## Plant status\nHorizon stable.")
        self.assertIn("Horizon", answer)
        self.assertGreaterEqual(mock_parts.call_count, 2)

    def test_briefing_excerpt_factory_one(self):
        from apps.agents.sansad_context_mode import sansad_briefing_excerpt

        briefing = (
            "## Plant status\n"
            "### Factory 1 — Horizon (F1)\n"
            "SRF anomaly active; health 72%.\n\n"
            "### Factory 2 — Zephyr (F2)\n"
            "Nominal."
        )
        excerpt = sansad_briefing_excerpt("condition of factory 1", briefing)
        self.assertIn("Horizon", excerpt)
        self.assertIn("SRF", excerpt)
        self.assertNotIn("Zephyr", excerpt)
