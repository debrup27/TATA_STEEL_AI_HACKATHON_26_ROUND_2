"""Tests for MANAS chat history compaction."""
from __future__ import annotations

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from apps.agents.compaction import compact_history, should_compact
from apps.agents.models import ChatMessage, ChatSession

User = get_user_model()


@override_settings(OLLAMA_MOCK=1)
class CompactionForceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="compact_user", password="testpass123")
        self.session = ChatSession.objects.create(user=self.user)

    def _seed_messages(self, count: int) -> None:
        for i in range(count):
            ChatMessage.objects.create(
                session=self.session,
                role="user" if i % 2 == 0 else "assistant",
                content=f"Message {i + 1} about bearing vibration and ISO thresholds.",
            )

    @patch("apps.agents.llm.client.invoke_raw", side_effect=Exception("offline"))
    @patch("apps.agents.stream_registry.send_to_stream")
    def test_force_compact_works_from_three_messages(self, _mock_send, _mock_invoke):
        self._seed_messages(3)
        replaced = compact_history(str(self.session.id), force=True)
        self.assertEqual(replaced, 1)
        remaining = ChatMessage.objects.filter(session=self.session).count()
        self.assertEqual(remaining, 3)
        self.assertTrue(
            ChatMessage.objects.filter(session=self.session, role="system").exists()
        )

    @patch("apps.agents.stream_registry.send_to_stream")
    def test_force_compact_skips_when_only_two_messages(self, mock_send):
        self._seed_messages(2)
        replaced = compact_history(str(self.session.id), force=True)
        self.assertEqual(replaced, 0)
        mock_send.assert_called_once()
        self.assertTrue(mock_send.call_args[0][1].get("skipped"))


@override_settings(OLLAMA_MOCK=1)
class CompactionAutoTests(TestCase):
    def test_should_compact_at_seven_messages(self):
        self.assertFalse(should_compact([{"content": "a"}] * 6))
        self.assertTrue(should_compact([{"content": "a"}] * 7))

    def setUp(self):
        self.user = User.objects.create_user(username="compact_auto", password="testpass123")
        self.session = ChatSession.objects.create(user=self.user)

    def _seed_messages(self, count: int) -> None:
        for i in range(count):
            ChatMessage.objects.create(
                session=self.session,
                role="user" if i % 2 == 0 else "assistant",
                content=f"Message {i + 1} about bearing vibration.",
            )

    @patch("apps.agents.llm.client.invoke_raw", return_value="Summary of earlier chat.")
    @patch("apps.agents.stream_registry.send_to_stream")
    def test_auto_compact_at_seven_messages(self, _mock_send, _mock_invoke):
        self._seed_messages(7)
        replaced = compact_history(str(self.session.id), force=False)
        self.assertEqual(replaced, 1)
        self.assertEqual(ChatMessage.objects.filter(session=self.session).count(), 7)

    @patch("apps.agents.stream_registry.send_to_stream")
    def test_auto_compact_skips_below_seven(self, mock_send):
        self._seed_messages(6)
        replaced = compact_history(str(self.session.id), force=False)
        self.assertEqual(replaced, 0)
        mock_send.assert_not_called()
