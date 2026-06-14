"""Tests for MANAS thumbs-up/down style learning."""
from types import SimpleNamespace

import pytest
from django.contrib.auth import get_user_model

from apps.agents.preference_profile import (
    analyze_response_traits,
    get_preference_patch,
    record_message_feedback,
)

User = get_user_model()

CONCISE_REPLY = "Check FeCl₂ level. Drain if above 2 g/L. Monitor daily."
STEP_REPLY = (
    "**Corrective Action:**\n"
    "1. Isolate the pickling line [1]\n"
    "2. Drain and inspect the tank\n"
    "3. Replace acid per SOP\n"
    "4. Verify β₁₀(c) ≥ 200 after restart [1]"
)


@pytest.mark.django_db
class TestAnalyzeResponseTraits:
    def test_short_reply_scores_more_concise_than_step_list(self):
        short = analyze_response_traits(CONCISE_REPLY)
        steps = analyze_response_traits(STEP_REPLY)
        assert short["concise"] > steps["concise"]
        assert steps["step_by_step"] > short["step_by_step"]
        assert steps["citation_heavy"] > short["citation_heavy"]

    def test_empty_content_returns_neutral_traits(self):
        traits = analyze_response_traits("")
        assert all(v == 0.5 for v in traits.values())


@pytest.mark.django_db
class TestRecordMessageFeedback:
    @pytest.fixture
    def user(self):
        return User.objects.create_user(username="style_tester", password="test-pass-123")

    def test_thumbs_up_on_step_reply_increases_step_by_step(self, user):
        before = user.notification_prefs.get("manas_style", {}).get("traits", {})
        before_step = float(before.get("step_by_step", 0.5))

        profile = record_message_feedback(
            user,
            SimpleNamespace(content=STEP_REPLY),
            "up",
        )
        user.refresh_from_db()

        assert profile["feedback_count"] == 1
        assert profile["traits"]["step_by_step"] > before_step
        assert "numbered steps" in profile["summary"].lower() or "step" in profile["summary"].lower()
        assert user.notification_prefs["manas_style"]["feedback_count"] == 1

    def test_thumbs_down_on_step_reply_decreases_step_by_step(self, user):
        # Prime profile toward step-by-step
        record_message_feedback(user, SimpleNamespace(content=STEP_REPLY), "up")
        user.refresh_from_db()
        mid = user.notification_prefs["manas_style"]["traits"]["step_by_step"]

        record_message_feedback(user, SimpleNamespace(content=STEP_REPLY), "down")
        user.refresh_from_db()
        after = user.notification_prefs["manas_style"]["traits"]["step_by_step"]

        assert after < mid

    def test_thumbs_up_on_concise_reply_increases_concise(self, user):
        profile = record_message_feedback(
            user,
            SimpleNamespace(content=CONCISE_REPLY),
            "up",
        )
        assert profile["traits"]["concise"] > 0.5

    def test_invalid_rating_raises(self, user):
        with pytest.raises(ValueError, match="up.*down"):
            record_message_feedback(user, SimpleNamespace(content="hi"), "sideways")


@pytest.mark.django_db
class TestGetPreferencePatch:
    @pytest.fixture
    def user(self):
        return User.objects.create_user(username="patch_tester", password="test-pass-123")

    def test_empty_before_any_feedback(self, user):
        assert get_preference_patch(user) == ""

    def test_includes_summary_after_feedback(self, user):
        record_message_feedback(user, SimpleNamespace(content=STEP_REPLY), "up")
        patch = get_preference_patch(user)
        assert "User Response Style" in patch
        assert len(patch) > 40
