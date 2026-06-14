"""
Management command: train or retrain per-asset ML models from synthetic data.

Usage:
  python manage.py train_models                      # train all asset types
  python manage.py train_models --skip-if-exists     # boot-time: skip if artifacts present
  python manage.py train_models --asset-types SRF,HHPD
  python manage.py train_models --rich               # 7-day retrain with larger dataset
  python manage.py train_models --scenarios 1000 --rich
"""
import json
import time
from django.core.management.base import BaseCommand
from apps.ml.trainer import ALL_ASSET_TYPES, train_all


class Command(BaseCommand):
    help = "Train XGBoost + IsolationForest models for all asset types from synthetic data"

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-if-exists",
            action="store_true",
            help="Skip training an asset type if all three production artifacts already exist on disk",
        )
        parser.add_argument(
            "--asset-types",
            default="",
            help="Comma-separated asset types to train (default: all)",
        )
        parser.add_argument(
            "--scenarios",
            type=int,
            default=300,
            help="Number of synthetic scenarios per asset type (default: 300)",
        )
        parser.add_argument(
            "--rich",
            action="store_true",
            help="Rich mode: wider parameter space for 7-day scheduled retraining",
        )

    def handle(self, *args, **options):
        asset_types = None
        if options["asset_types"]:
            asset_types = [t.strip().upper() for t in options["asset_types"].split(",")]
            unknown = [t for t in asset_types if t not in ALL_ASSET_TYPES]
            if unknown:
                self.stderr.write(self.style.ERROR(f"Unknown asset types: {unknown}"))
                return

        skip = options["skip_if_exists"]
        n_scenarios = options["scenarios"]
        rich = options["rich"]

        self.stdout.write(self.style.MIGRATE_HEADING(
            f"[train_models] Starting ML training pipeline"
        ))
        self.stdout.write(
            f"  asset_types={asset_types or 'ALL'}  "
            f"scenarios={n_scenarios}  rich={rich}  skip_if_exists={skip}"
        )

        t0 = time.time()
        results = train_all(
            asset_types=asset_types,
            n_scenarios=n_scenarios,
            rich=rich,
            skip_if_exists=skip,
        )

        elapsed = round(time.time() - t0, 1)
        ok, skipped, failed = 0, 0, 0

        for at, model_results in results.items():
            if model_results.get("skipped"):
                skipped += 1
                self.stdout.write(f"  {at}: SKIPPED (artifacts exist)")
            elif "error" in model_results:
                failed += 1
                self.stdout.write(self.style.ERROR(f"  {at}: FAILED — {model_results['error']}"))
            else:
                ok += 1
                for mt, metrics in model_results.items():
                    if "error" in metrics:
                        self.stdout.write(self.style.WARNING(f"  {at}/{mt}: {metrics['error']}"))
                    else:
                        display = {k: v for k, v in metrics.items() if k != "feature_names"}
                        self.stdout.write(f"  {at}/{mt}: {display}")

        status_msg = f"Trained {ok} | Skipped {skipped} | Failed {failed} | {elapsed}s"
        if failed:
            self.stdout.write(self.style.ERROR(f"[train_models] Done with errors: {status_msg}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"[train_models] Complete: {status_msg}"))
