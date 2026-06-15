"""Tests for MANAS generation stop message formatting."""
from apps.agents.tasks import _stopped_content, _STOPPED_MESSAGE


class TestStoppedContent:
    def test_not_cancelled_unchanged(self):
        assert _stopped_content("Hello", cancelled=False) == "Hello"

    def test_cancelled_empty(self):
        assert _stopped_content("", cancelled=True) == _STOPPED_MESSAGE

    def test_cancelled_partial(self):
        result = _stopped_content("Partial answer", cancelled=True)
        assert "Partial answer" in result
        assert _STOPPED_MESSAGE in result

    def test_cancelled_idempotent(self):
        once = _stopped_content("Hi", cancelled=True)
        twice = _stopped_content(once, cancelled=True)
        assert twice == once
