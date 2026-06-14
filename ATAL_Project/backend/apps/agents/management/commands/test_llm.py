"""Ollama smoke test — P2-042 validation gate."""
import sys

import httpx
from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Smoke-test Ollama chat completion endpoint (P2-042)."

    def handle(self, *args, **options):
        url = f"{settings.OLLAMA_BASE_URL}/v1/chat/completions"
        payload = {
            "model": settings.OLLAMA_MODEL,
            "messages": [
                {"role": "system", "content": "You are a maintenance assistant. Reply in one sentence."},
                {"role": "user", "content": "What is ISO 4406 hydraulic oil cleanliness code for servo systems?"},
            ],
            "max_tokens": 128,
            "temperature": 0.1,
            "think": False,
        }

        try:
            with httpx.Client(timeout=120) as client:
                resp = client.post(url, json=payload)
                resp.raise_for_status()
                data = resp.json()
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f"P2-042 FAIL: Ollama unreachable — {exc}"))
            sys.exit(1)

        content = data["choices"][0]["message"]["content"]
        self.stdout.write(self.style.SUCCESS("P2-042 PASS: Ollama chat completion OK"))
        self.stdout.write(f"Response preview: {content[:200]}...")
