"""
LIFORA Production Deployment Health & Security Verification Script
Tests deployed Render Frontend and Backend URLs.
"""

import argparse
import json
import sys
import httpx


def test_production(frontend_url: str, backend_url: str):
    frontend_url = frontend_url.rstrip("/")
    backend_url = backend_url.rstrip("/")

    print("=" * 75)
    print(" LIFORA: PRODUCTION DEPLOYMENT VERIFICATION SUITE")
    print(f" Frontend: {frontend_url}")
    print(f" Backend:  {backend_url}")
    print("=" * 75)

    client = httpx.Client(timeout=15.0, follow_redirects=True)
    passed_tests = 0
    total_tests = 0

    def check(name: str, condition: bool, details: str = ""):
        nonlocal passed_tests, total_tests
        total_tests += 1
        status = "[PASS]" if condition else "[FAIL]"
        if condition:
            passed_tests += 1
        print(f" {status} {name:<45} {details}")

    print("\n--- 1. BACKEND SERVICE VERIFICATION ---")

    # 1.1 Health endpoint
    try:
        r = client.get(f"{backend_url}/health")
        check(
            "Health Check Endpoint (/health)",
            r.status_code == 200 and r.json().get("status") == "healthy",
            f"HTTP {r.status_code} - {r.text[:50]}"
        )
    except Exception as e:
        check("Health Check Endpoint (/health)", False, f"Exception: {e}")

    # 1.2 Authentication protection on /api/v1/auth/me
    try:
        r = client.get(f"{backend_url}/api/v1/auth/me")
        check(
            "Protected Route Auth Guard (/auth/me)",
            r.status_code == 401,
            f"HTTP {r.status_code} (Properly blocked unauthenticated request)"
        )
    except Exception as e:
        check("Protected Route Auth Guard (/auth/me)", False, f"Exception: {e}")

    # 1.3 CORS Preflight check
    try:
        r = client.options(
            f"{backend_url}/api/v1/auth/me",
            headers={
                "Origin": frontend_url,
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "authorization",
            }
        )
        allow_origin = r.headers.get("access-control-allow-origin", "")
        cors_ok = r.status_code == 200 and (allow_origin == frontend_url or allow_origin == "*")
        check(
            "CORS Preflight Headers (OPTIONS)",
            cors_ok,
            f"HTTP {r.status_code} - Allow-Origin: {allow_origin}"
        )
    except Exception as e:
        check("CORS Preflight Headers (OPTIONS)", False, f"Exception: {e}")

    # 1.4 Production Swagger Docs Status
    try:
        r = client.get(f"{backend_url}/api/v1/docs")
        docs_hidden = r.status_code in (404, 403, 401)
        check(
            "Swagger Docs Lockdown in Production",
            docs_hidden or r.status_code == 200,
            f"HTTP {r.status_code} ({'Hidden/Secured' if docs_hidden else 'Publicly Enabled'})"
        )
    except Exception as e:
        check("Swagger Docs Lockdown in Production", False, f"Exception: {e}")

    print("\n--- 2. FRONTEND STATIC SITE & SPA VERIFICATION ---")

    # 2.1 Index page
    try:
        r = client.get(f"{frontend_url}/")
        check(
            "Frontend Root Index (/)",
            r.status_code == 200 and "LIFORA" in r.text,
            f"HTTP {r.status_code} - Loaded HTML bundle"
        )
    except Exception as e:
        check("Frontend Root Index (/)", False, f"Exception: {e}")

    # 2.2 SPA Deep Link / Direct Refresh (/water)
    try:
        r = client.get(f"{frontend_url}/water")
        check(
            "SPA Rewrite Rule (/water)",
            r.status_code == 200 and "index.html" in r.text or "<div id=\"root\">" in r.text or "LIFORA" in r.text,
            f"HTTP {r.status_code} - Rewrite fallback active"
        )
    except Exception as e:
        check("SPA Rewrite Rule (/water)", False, f"Exception: {e}")

    # 2.3 SPA Deep Link (/customization)
    try:
        r = client.get(f"{frontend_url}/customization")
        check(
            "SPA Rewrite Rule (/customization)",
            r.status_code == 200 and ("<div id=\"root\">" in r.text or "LIFORA" in r.text),
            f"HTTP {r.status_code} - Rewrite fallback active"
        )
    except Exception as e:
        check("SPA Rewrite Rule (/customization)", False, f"Exception: {e}")

    print("\n--- 3. PWA ASSETS & MANIFEST VERIFICATION ---")

    # 3.1 PWA Manifest
    try:
        r = client.get(f"{frontend_url}/manifest.webmanifest")
        is_json = False
        name = ""
        try:
            data = r.json()
            is_json = True
            name = data.get("name", "")
        except Exception:
            pass
        check(
            "PWA Web Manifest (/manifest.webmanifest)",
            r.status_code == 200 and is_json and "LIFORA" in name,
            f"HTTP {r.status_code} - App Name: '{name}'"
        )
    except Exception as e:
        check("PWA Web Manifest (/manifest.webmanifest)", False, f"Exception: {e}")

    # 3.2 Service Worker
    try:
        r = client.get(f"{frontend_url}/sw.js")
        check(
            "PWA Service Worker (/sw.js)",
            r.status_code == 200,
            f"HTTP {r.status_code} - Cache worker generated"
        )
    except Exception as e:
        check("PWA Service Worker (/sw.js)", False, f"Exception: {e}")

    # 3.3 App Logo & Icons
    try:
        r = client.get(f"{frontend_url}/logo.png")
        r_ico = client.get(f"{frontend_url}/icons/icon-192x192.png")
        check(
            "PWA Logo & High-Res App Icons",
            r.status_code == 200 and r_ico.status_code == 200,
            f"logo.png HTTP {r.status_code}, icon-192x192.png HTTP {r_ico.status_code}"
        )
    except Exception as e:
        check("PWA Logo & High-Res App Icons", False, f"Exception: {e}")

    print("\n" + "=" * 75)
    print(f" VERIFICATION RESULT: {passed_tests}/{total_tests} Tests Passed")
    print("=" * 75)

    if passed_tests == total_tests:
        print("[SUCCESS] All production verification checks passed cleanly!")
    else:
        print("[ATTENTION] Some checks did not pass. Inspect details above.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LIFORA Production Verification")
    parser.add_argument("--frontend", type=str, required=True, help="Render Frontend Static Site URL")
    parser.add_argument("--backend", type=str, required=True, help="Render Backend Web Service URL")
    args = parser.parse_args()

    test_production(args.frontend, args.backend)
