from django.core.management.base import BaseCommand
from django.db import connection

# Tables that need TimescaleDB hypertable + composite PK fix.
# Each entry: (table, pk_constraint_name, time_column)
HYPERTABLES = [
    ("telemetry_sensor_reading", "telemetry_sensor_reading_pkey", "time"),
    ("twins_state_history",      "twins_state_history_pkey",      "time"),
]


class Command(BaseCommand):
    help = "Idempotent — convert sensor/twin tables to TimescaleDB hypertables."

    def handle(self, *args, **options):
        with connection.cursor() as cur:
            for table, pk_name, time_col in HYPERTABLES:
                # Check if already a hypertable
                cur.execute(
                    "SELECT COUNT(*) FROM timescaledb_information.hypertables WHERE hypertable_name = %s",
                    [table],
                )
                if cur.fetchone()[0]:
                    self.stdout.write(f"  {table}: already a hypertable, skipping.")
                    continue

                # Drop single-column PK; recreate as (id, time) so TimescaleDB is happy
                cur.execute(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {pk_name};")
                cur.execute(f"ALTER TABLE {table} ADD PRIMARY KEY (id, {time_col});")
                cur.execute(
                    f"SELECT create_hypertable('{table}', '{time_col}', if_not_exists => TRUE);"
                )
                self.stdout.write(f"  {table}: hypertable created.")

        self.stdout.write(self.style.SUCCESS("[timescaledb] Setup complete."))
