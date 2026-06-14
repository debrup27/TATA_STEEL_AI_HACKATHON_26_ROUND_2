"""
manage.py test_orchestration

Smoke test for the SANSAD two-tier agentic orchestration pipeline.
Requires a running Ollama instance with qwen3.5:9b and qwen3.5:0.8b loaded.

Usage:
  docker compose exec django-backend python manage.py test_orchestration
  # Or with a specific asset UUID:
  docker compose exec django-backend python manage.py test_orchestration --asset-id <uuid>
"""
import sys
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Smoke-test the SANSAD LangGraph agentic orchestration pipeline."

    def add_arguments(self, parser):
        parser.add_argument(
            "--asset-id",
            type=str,
            default="",
            help="Asset UUID to run orchestration on (uses first asset in DB if omitted)",
        )

    def handle(self, *args, **options):

        # Resolve asset
        asset_id = options["asset_id"]
        if not asset_id:
            from apps.assets.models import Asset
            asset = Asset.objects.first()
            if not asset:
                raise CommandError("No assets in DB. Run migrations + seed fixtures first.")
            asset_id = str(asset.id)
            self.stdout.write(f"Using first asset: {asset.name} ({asset_id})")

        self.stdout.write(f"\n=== SANSAD Orchestration Smoke Test ===")
        self.stdout.write(f"Asset ID: {asset_id}")

        from apps.agents.graph.runner import run_sansad_orchestration
        from apps.agents.models import AgentAuditLog

        audit_before = AgentAuditLog.objects.count()

        try:
            decision = run_sansad_orchestration(asset_id, trigger="smoke_test")
        except Exception as exc:
            raise CommandError(f"Orchestration raised: {exc}")

        if decision is None:
            raise CommandError("Orchestration returned None — check logs for errors.")

        # Verify decision shape
        required_keys = {"diagnosis", "rca", "risk_level", "urgency_score"}
        missing = required_keys - set(decision.keys())
        if missing:
            raise CommandError(f"DecisionOutput missing keys: {missing}")

        risk = decision["risk_level"]
        if risk not in ("low", "medium", "high", "critical"):
            raise CommandError(f"Invalid risk_level: {risk!r}")

        urgency = decision["urgency_score"]
        if not (0.0 <= urgency <= 1.0):
            raise CommandError(f"urgency_score out of range: {urgency}")

        # Verify audit log rows were written
        audit_after = AgentAuditLog.objects.count()
        new_audit_rows = audit_after - audit_before

        # Verify worker outputs
        worker_outputs = decision.get("worker_outputs", {})

        self.stdout.write("\n=== Results ===")
        self.stdout.write(f"  diagnosis:       {decision['diagnosis'][:80]}")
        self.stdout.write(f"  risk_level:      {risk}")
        self.stdout.write(f"  urgency_score:   {urgency:.2f}")
        self.stdout.write(f"  tools_used:      {decision.get('tools_used', [])}")
        self.stdout.write(f"  worker_outputs:  {list(worker_outputs.keys())}")
        self.stdout.write(f"  audit_log_rows:  {new_audit_rows} written")
        self.stdout.write(f"  citations:       {len(decision.get('citations', []))} found")

        # Gate checks
        gates = [
            ("DecisionOutput has all required keys", not missing),
            ("risk_level valid", risk in ("low", "medium", "high", "critical")),
            ("urgency_score in [0,1]", 0.0 <= urgency <= 1.0),
            ("≥1 tool dispatched (audit log)", new_audit_rows >= 1),
            ("≥1 worker output present", len(worker_outputs) >= 1),
        ]

        self.stdout.write("\n=== Gate Checks ===")
        all_pass = True
        for label, passed in gates:
            icon = "✅" if passed else "❌"
            self.stdout.write(f"  {icon} {label}")
            if not passed:
                all_pass = False

        if all_pass:
            self.stdout.write(self.style.SUCCESS("\n✅ ALL GATES PASS — SANSAD orchestration pipeline OK"))
        else:
            raise CommandError("One or more gate checks FAILED — see above.")
