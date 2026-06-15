"""Tests for MANAS role advisory graph (0.8b workers → 9b context)."""
from apps.agents.chat_role_graph import resolve_manas_roles


class TestResolveManasRoles:
    def test_no_role_no_advice(self):
        assert resolve_manas_roles("", advice_mode=False) == []

    def test_technician_role(self):
        assert resolve_manas_roles("technician") == ["technician"]

    def test_supervisor_role(self):
        assert resolve_manas_roles("supervisor") == ["supervisor"]

    def test_admin_gets_both(self):
        assert resolve_manas_roles("admin") == ["technician", "supervisor"]

    def test_advice_only_gets_both(self):
        assert resolve_manas_roles("", advice_mode=True) == ["technician", "supervisor"]

    def test_advice_with_technician_role(self):
        assert resolve_manas_roles("technician", advice_mode=True) == ["technician"]

    def test_unknown_role_without_advice(self):
        assert resolve_manas_roles("operator") == []

    def test_does_not_infer_from_django_user(self):
        """Explicit UI only — empty user_role must not trigger workers."""
        assert resolve_manas_roles("", advice_mode=False) == []
