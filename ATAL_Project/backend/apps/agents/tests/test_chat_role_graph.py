"""Tests for MANAS role advisory graph (0.8b workers → 9b context)."""
from types import SimpleNamespace

from apps.agents.chat_role_graph import resolve_manas_roles


class TestResolveManasRoles:
    def test_empty_role_no_user(self):
        assert resolve_manas_roles("", None) == []

    def test_technician(self):
        assert resolve_manas_roles("technician", None) == ["technician"]

    def test_supervisor(self):
        assert resolve_manas_roles("supervisor", None) == ["supervisor"]

    def test_admin_gets_both(self):
        assert resolve_manas_roles("admin", None) == ["technician", "supervisor"]

    def test_falls_back_to_django_user_role(self):
        user = SimpleNamespace(role="admin")
        assert resolve_manas_roles("", user) == ["technician", "supervisor"]

    def test_unknown_role_ignored(self):
        assert resolve_manas_roles("operator", None) == []
