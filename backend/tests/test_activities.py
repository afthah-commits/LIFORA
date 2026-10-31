from datetime import date

import httpx
import pytest


@pytest.mark.asyncio
async def test_running_and_football_sessions(client: httpx.AsyncClient, auth_headers: dict):
    today = str(date.today())

    # Log running session (5 km in 27 minutes => ~5:24 /km)
    run_resp = await client.post("/api/v1/activities", headers=auth_headers, json={
        "activity_type": "running",
        "date": today,
        "duration_minutes": 27,
        "distance_km": 5.0,
        "effort_level": "Moderate",
        "notes": "Outdoor track 5k"
    })
    assert run_resp.status_code == 201
    run_data = run_resp.json()
    assert run_data["distance_km"] == 5.0
    assert run_data["calculated_pace"] == "5:24 /km"

    # Log football session
    fb_resp = await client.post("/api/v1/activities", headers=auth_headers, json={
        "activity_type": "football",
        "date": today,
        "duration_minutes": 90,
        "intensity": "High",
        "notes": "Full friendly match"
    })
    assert fb_resp.status_code == 201

    # Check running summary
    run_sum = await client.get("/api/v1/activities/running/summary", headers=auth_headers)
    assert run_sum.status_code == 200
    assert run_sum.json()["total_distance_km"] >= 5.0

    # Check football summary
    fb_sum = await client.get("/api/v1/activities/football/summary", headers=auth_headers)
    assert fb_sum.status_code == 200
    assert fb_sum.json()["total_sessions"] >= 1
    assert fb_sum.json()["total_duration_minutes"] >= 90
