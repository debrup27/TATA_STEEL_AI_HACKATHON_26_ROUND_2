"""
Live matrix test for MANAS chat modes — runs run_chat_logic() for each combo.

Usage:
  python manage.py test_manas_mode_matrix
  python manage.py test_manas_mode_matrix --quick   # skip deep thinking
"""
from __future__ import annotations

import uuid

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

QUESTION = "What is the zinc pot temperature target? One short paragraph."
DOC_TITLE = "CGP Pot Temperature Management SOP"


class Command(BaseCommand):
    help = "Exercise MANAS chat mode combinations (plain, RAG, role, advice, deep thinking)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--quick",
            action="store_true",
            help="Skip deep-thinking combo (saves ~60s).",
        )

    def handle(self, *args, **options):
        from apps.agents.models import ChatSession, ChatMessage
        from apps.agents.tasks import run_chat_logic

        user = User.objects.filter(username="tech_demo").first()
        if not user:
            self.stderr.write("tech_demo user missing — run create_demo_users")
            return

        combos = [
            {
                "name": "plain",
                "kwargs": {},
                "rag_titles": [],
                "rag_collections": [],
            },
            {
                "name": "rag_docs",
                "kwargs": {},
                "rag_titles": [DOC_TITLE],
                "rag_collections": ["sop"],
            },
            {
                "name": "rag+technician",
                "kwargs": {"user_role": "technician"},
                "rag_titles": [DOC_TITLE],
                "rag_collections": ["sop"],
            },
            {
                "name": "rag+advice",
                "kwargs": {"advice_mode": True},
                "rag_titles": [DOC_TITLE],
                "rag_collections": ["sop"],
            },
            {
                "name": "rag+admin",
                "kwargs": {"user_role": "admin"},
                "rag_titles": [DOC_TITLE],
                "rag_collections": ["sop"],
            },
        ]
        if not options["quick"]:
            combos.append({
                "name": "rag+deep_thinking",
                "kwargs": {"deep_thinking": True},
                "rag_titles": [DOC_TITLE],
                "rag_collections": ["sop"],
            })

        passed = 0
        failed = 0
        for combo in combos:
            session = ChatSession.objects.create(user=user)
            msg = ChatMessage.objects.create(session=session, role="user", content=QUESTION)
            try:
                result = run_chat_logic(
                    str(session.id),
                    str(msg.id),
                    combo["rag_collections"],
                    rag_document_titles=combo["rag_titles"],
                    **combo["kwargs"],
                )
                assistant = (
                    ChatMessage.objects.filter(session=session, role="assistant")
                    .order_by("-timestamp")
                    .first()
                )
                content = (assistant.content or "").strip() if assistant else ""
                reasoning = (assistant.reasoning or "").strip() if assistant else ""
                ok = result.get("status") == "ok" and bool(content or reasoning)
                if combo["kwargs"].get("deep_thinking") and not content and reasoning:
                    ok = False
                    note = "deep thinking: empty content"
                elif ok:
                    note = f"{len(content)} chars"
                    if reasoning:
                        note += f", reasoning {len(reasoning)} chars"
                else:
                    note = result.get("error") or "empty response"

                if ok:
                    passed += 1
                    self.stdout.write(self.style.SUCCESS(f"  PASS  {combo['name']}: {note}"))
                else:
                    failed += 1
                    self.stdout.write(self.style.ERROR(f"  FAIL  {combo['name']}: {note}"))
            except Exception as exc:
                failed += 1
                self.stdout.write(self.style.ERROR(f"  FAIL  {combo['name']}: {exc}"))
            finally:
                session.delete()

        self.stdout.write("")
        self.stdout.write(f"Matrix: {passed} passed, {failed} failed")
        if failed:
            raise SystemExit(1)
