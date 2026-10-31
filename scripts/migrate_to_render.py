"""
LIFORA Local-to-Render Database Migration & Verification Utility
Safety Guarantee: The local database is strictly accessed in READ-ONLY mode.
"""

import argparse
import os
import subprocess
import sys
from urllib.parse import urlparse

import psycopg2
from psycopg2.extras import RealDictCursor

# Order of tables to ensure Foreign Key dependency resolution
TABLE_ORDER = [
    "users",
    "user_profiles",
    "user_goals",
    "dashboard_configs",
    "foods",
    "exercises",
    "expense_categories",
    "custom_modules",
    "custom_module_fields",
    "custom_module_records",
    "water_goals",
    "water_entries",
    "weekly_plans",
    "weekly_plan_items",
    "weekly_reports",
    "workout_sessions",
    "workout_exercises",
    "workout_templates",
    "workout_template_items",
    "food_entries",
    "food_entry_items",
    "food_ai_analyses",
    "expense_entries",
    "income_entries",
    "budgets",
    "savings_goals",
    "salary_records",
    "recurring_transactions",
    "screen_time_goals",
    "tracked_applications",
    "screen_time_imports",
    "screen_time_sessions",
    "activity_sessions",
    "weight_entries",
    "ai_conversations",
    "ai_messages",
    "refresh_sessions",
    "alembic_version",
]


def normalize_sync_url(url: str) -> str:
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    if url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql+asyncpg://", "postgresql://", 1)
    if url.startswith("postgresql+psycopg2://"):
        return url.replace("postgresql+psycopg2://", "postgresql://", 1)
    return url


def get_local_db_url() -> str:
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend", ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("SYNC_DATABASE_URL="):
                    return normalize_sync_url(line.split("=", 1)[1].strip().strip('"').strip("'"))
                if line.startswith("DATABASE_URL=") and "SYNC_DATABASE_URL=" not in line:
                    return normalize_sync_url(line.split("=", 1)[1].strip().strip('"').strip("'"))
    return os.getenv("LOCAL_DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/fitpulse_db")


def verify_tables(local_conn, remote_conn) -> dict[str, tuple[int, int]]:
    results = {}
    with local_conn.cursor() as l_cur, remote_conn.cursor() as r_cur:
        for tbl in TABLE_ORDER:
            # Check if table exists on remote
            r_cur.execute(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = %s);",
                (tbl,)
            )
            exists = r_cur.fetchone()[0]
            if not exists:
                results[tbl] = (-1, -1)
                continue

            l_cur.execute(f'SELECT COUNT(*) FROM "{tbl}";')
            l_cnt = l_cur.fetchone()[0]

            r_cur.execute(f'SELECT COUNT(*) FROM "{tbl}";')
            r_cnt = r_cur.fetchone()[0]

            results[tbl] = (l_cnt, r_cnt)
    return results


def migrate_data(local_url: str, remote_url: str, dry_run: bool = False):
    print("=" * 70)
    print(" LIFORA: SAFE LOCAL-TO-RENDER POSTGRESQL DATA MIGRATION")
    print("=" * 70)

    local_url = normalize_sync_url(local_url)
    remote_url = normalize_sync_url(remote_url)

    print(f"[*] Connecting to local database (READ-ONLY)...")
    try:
        local_conn = psycopg2.connect(local_url)
        local_conn.set_session(readonly=True)
    except Exception as e:
        print(f"[!] Error connecting to local database: {e}")
        sys.exit(1)

    print(f"[*] Connecting to Render remote database...")
    try:
        remote_conn = psycopg2.connect(remote_url)
    except Exception as e:
        print(f"[!] Error connecting to Render database: {e}")
        print("[!] Tip: Ensure your client IP is allowed in Render PostgreSQL IP Allow List if using external connection.")
        sys.exit(1)

    # 1. Check Alembic version on remote
    with local_conn.cursor() as cur:
        cur.execute("SELECT version_num FROM alembic_version;")
        local_rev = cur.fetchone()[0]
    print(f"[+] Local Database Alembic Revision: {local_rev}")

    with remote_conn.cursor() as cur:
        cur.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='alembic_version');")
        has_alembic = cur.fetchone()[0]
        remote_rev = None
        if has_alembic:
            cur.execute("SELECT version_num FROM alembic_version;")
            row = cur.fetchone()
            remote_rev = row[0] if row else None

    print(f"[+] Render Database Alembic Revision: {remote_rev or 'None (Schema not initialized)'}")

    if dry_run:
        print("\n[*] DRY RUN: Inspecting tables and counts without modifying remote database:")
        counts = verify_tables(local_conn, remote_conn)
        print(f"{'Table Name':<30} | {'Local Rows':<12} | {'Render Rows':<12} | Status")
        print("-" * 70)
        for tbl, (l, r) in counts.items():
            status = "MATCH" if l == r else ("EMPTY_REMOTE" if r == 0 else "MISMATCH")
            print(f"{tbl:<30} | {l:<12} | {r:<12} | {status}")
        return

    # Check if backup SQL exists
    backup_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "backups",
        "fitpulse_db_data_only.sql"
    )

    print(f"\n[*] Transferring records into Render database...")
    # Transfer table by table in dependency order
    with local_conn.cursor(cursor_factory=RealDictCursor) as l_cur, remote_conn.cursor() as r_cur:
        # Disable triggers during bulk load
        r_cur.execute("SET session_replication_role = 'replica';")

        total_inserted = 0
        for tbl in TABLE_ORDER:
            l_cur.execute(f'SELECT * FROM "{tbl}";')
            rows = l_cur.fetchall()
            if not rows:
                continue

            columns = list(rows[0].keys())
            cols_str = ", ".join([f'"{c}"' for c in columns])
            placeholders = ", ".join(["%s"] * len(columns))
            stmt = f'INSERT INTO "{tbl}" ({cols_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING;'

            batch_data = [[row[c] for c in columns] for row in rows]
            r_cur.executemany(stmt, batch_data)
            inserted = r_cur.rowcount
            total_inserted += len(batch_data)
            print(f"  [+] {tbl:<28}: Transferred {len(batch_data)} records")

        # Re-enable triggers
        r_cur.execute("SET session_replication_role = 'DEFAULT';")
        remote_conn.commit()

    print(f"\n[OK] Bulk data migration completed! Total records processed: {total_inserted}")

    # 4. Final verification
    print("\n" + "=" * 70)
    print(" POST-MIGRATION DATA INTEGRITY VERIFICATION REPORT")
    print("=" * 70)
    counts = verify_tables(local_conn, remote_conn)
    print(f"{'Table Name':<30} | {'Local Rows':<12} | {'Render Rows':<12} | Verification")
    print("-" * 70)
    all_match = True
    for tbl, (l, r) in counts.items():
        if l == r:
            verdict = "PASSED"
        else:
            verdict = f"DIFF ({r - l:+d})"
            all_match = False
        print(f"{tbl:<30} | {l:<12} | {r:<12} | {verdict}")

    print("-" * 70)
    if all_match:
        print("[SUCCESS] All tables and row counts match 100%! Data migration is completely verified.")
    else:
        print("[WARNING] Some row counts differ. Please review table differences above.")

    local_conn.close()
    remote_conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LIFORA Local-to-Render Database Migration")
    parser.add_argument(
        "--render-url",
        type=str,
        default=os.getenv("RENDER_DATABASE_URL"),
        help="Render external PostgreSQL connection string"
    )
    parser.add_argument(
        "--local-url",
        type=str,
        default=get_local_db_url(),
        help="Local PostgreSQL connection string (defaults to fitpulse_db)"
    )
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Only verify row counts without transferring records"
    )

    args = parser.parse_args()

    if not args.render_url:
        print("[!] Missing Render database connection string.")
        print("Usage:")
        print("  python scripts/migrate_to_render.py --render-url \"postgresql://lifora_user:password@dpg-xxx.singapore-postgres.render.com/lifora_db\"")
        print("\nOr set environment variable RENDER_DATABASE_URL before running.")
        sys.exit(1)

    migrate_data(args.local_url, args.render_url, dry_run=args.verify_only)
