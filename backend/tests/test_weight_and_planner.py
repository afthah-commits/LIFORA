from datetime import date

import httpx
import pytest


@pytest.mark.asyncio
async def test_weight_logging_and_summary(client: httpx.AsyncClient, auth_headers: dict):
    today = str(date.today())

    log_resp = await client.post("/api/v1/weight", headers=auth_headers, json={
        "date": today,
        "weight_kg": 54.2,
        "notes": "Morning weigh-in after hydration"
    })
    assert log_resp.status_code == 201

    sum_resp = await client.get("/api/v1/weight/summary", headers=auth_headers)
    assert sum_resp.status_code == 200
    summary = sum_resp.json()
    assert summary["current_weight_kg"] == 54.2
    assert summary["target_weight_kg"] == 60.0
    assert summary["weight_difference_kg"] == 5.8 # 60 - 54.2

@pytest.mark.asyncio
async def test_weekly_planner_replacement(client: httpx.AsyncClient, auth_headers: dict):
    today = str(date.today())

    # Get weekly plan
    plan_resp = await client.get(f"/api/v1/planner?week_date={today}", headers=auth_headers)
    assert plan_resp.status_code == 200
    plan = plan_resp.json()
    assert len(plan["items"]) > 0

    # Find a running activity in the plan
    running_item = next((i for i in plan["items"] if i["activity_type"] == "running"), plan["items"][0])

    # Replace running with football
    rep_resp = await client.post(
        f"/api/v1/planner/items/{running_item['id']}/replace-with-football?duration_minutes=90",
        headers=auth_headers
    )
    assert rep_resp.status_code == 200
    rep_data = rep_resp.json()
    assert rep_data["activity_type"] == "football"
    assert rep_data["replaced_by_football"] is True
    assert rep_data["is_completed"] is True
