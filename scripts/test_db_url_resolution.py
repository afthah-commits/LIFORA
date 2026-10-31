"""
Verification script for LIFORA Database URL resolution & Render configuration.
"""
import os
import sys

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_resolution():
    print("=" * 70)
    print(" LIFORA: DATABASE URL RESOLUTION & SECURITY VERIFICATION")
    print("=" * 70)

    # Test 1: Production with Render postgres:// connection string
    print("\n[Test 1] Simulating Render Production Environment with linked DATABASE_URL...")
    render_db_url = "postgres://lifora_user:RenderSecretPass123@dpg-c12345-a.singapore-postgres.render.com/lifora_db"
    
    # Isolate environment
    old_env = os.environ.copy()
    try:
        os.environ["ENVIRONMENT"] = "production"
        os.environ["APP_ENV"] = "production"
        os.environ["DATABASE_URL"] = render_db_url
        os.environ.pop("SYNC_DATABASE_URL", None)

        from backend.app.core.config import Settings
        prod_settings = Settings()

        print(f"  Render Input URL : {render_db_url}")
        print(f"  FastAPI Async URL: {prod_settings.DATABASE_URL}")
        print(f"  Alembic Sync URL : {prod_settings.SYNC_DATABASE_URL}")

        assert "localhost" not in prod_settings.DATABASE_URL, "FAILED: Async URL leaked localhost in production!"
        assert "localhost" not in prod_settings.SYNC_DATABASE_URL, "FAILED: Sync URL leaked localhost in production!"
        assert prod_settings.DATABASE_URL.startswith("postgresql+asyncpg://"), "FAILED: Async URL must use asyncpg"
        assert prod_settings.SYNC_DATABASE_URL.startswith("postgresql+psycopg2://"), "FAILED: Sync URL must use psycopg2"
        assert "lifora_user:RenderSecretPass123@dpg-c12345-a.singapore-postgres.render.com/lifora_db" in prod_settings.SYNC_DATABASE_URL
        print("  [PASS] Render DATABASE_URL correctly converted for both async engine and sync migrations.")
    finally:
        os.environ.clear()
        os.environ.update(old_env)

    # Test 2: Production without DATABASE_URL (must fail fast, no silent fallback to localhost)
    print("\n[Test 2] Verifying fail-fast in Production when DATABASE_URL is missing...")
    old_env = os.environ.copy()
    try:
        os.environ["ENVIRONMENT"] = "production"
        os.environ["APP_ENV"] = "production"
        os.environ.pop("DATABASE_URL", None)
        os.environ.pop("SYNC_DATABASE_URL", None)

        try:
            from backend.app.core.config import Settings
            bad_settings = Settings()
            print("  [FAIL] Did not raise RuntimeError when DATABASE_URL was missing in production!")
            sys.exit(1)
        except RuntimeError as e:
            print(f"  [PASS] Correctly blocked startup with error: {e}")
    finally:
        os.environ.clear()
        os.environ.update(old_env)

    # Test 3: Local Development fallback
    print("\n[Test 3] Verifying Local Development mode preserves local database...")
    old_env = os.environ.copy()
    try:
        os.environ["ENVIRONMENT"] = "development"
        os.environ["APP_ENV"] = "development"
        os.environ.pop("DATABASE_URL", None)
        os.environ.pop("SYNC_DATABASE_URL", None)

        from backend.app.core.config import Settings
        dev_settings = Settings()
        assert "localhost" in dev_settings.DATABASE_URL
        assert "localhost" in dev_settings.SYNC_DATABASE_URL
        print(f"  Dev Async URL: {dev_settings.DATABASE_URL}")
        print(f"  Dev Sync URL : {dev_settings.SYNC_DATABASE_URL}")
        print("  [PASS] Local development defaults cleanly preserved.")
    finally:
        os.environ.clear()
        os.environ.update(old_env)

    print("\n" + "=" * 70)
    print("[ALL DATABASE CONFIGURATION TESTS PASSED CLEANLY]")
    print("=" * 70)

if __name__ == "__main__":
    test_resolution()
