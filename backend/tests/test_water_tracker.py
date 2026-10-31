import pytest
import httpx
from datetime import date


@pytest.mark.asyncio
async def test_water_tracker_flow(client: httpx.AsyncClient, auth_headers: dict):
    # 1. Get or create goal (defaults to 2500ml)
    goal_res = await client.get("/api/v1/water/goal", headers=auth_headers)
    assert goal_res.status_code == 200
    goal_data = goal_res.json()
    assert goal_data["daily_target_ml"] >= 1000

    # 2. Update goal to 2800 ml with reminders
    update_goal_res = await client.put(
        "/api/v1/water/goal",
        json={
            "daily_target_ml": 2800,
            "reminder_enabled": True,
            "reminder_interval_hours": 3,
        },
        headers=auth_headers,
    )
    assert update_goal_res.status_code == 200
    assert update_goal_res.json()["daily_target_ml"] == 2800
    assert update_goal_res.json()["reminder_interval_hours"] == 3

    # 3. Log water entries (simulating 1-tap quick logging: 250ml, 500ml)
    today_str = date.today().isoformat()
    entry1_res = await client.post(
        "/api/v1/water/entries",
        json={"amount_ml": 250, "date": today_str, "notes": "Morning glass"},
        headers=auth_headers,
    )
    assert entry1_res.status_code == 201
    entry1 = entry1_res.json()
    assert entry1["amount_ml"] == 250

    entry2_res = await client.post(
        "/api/v1/water/entries",
        json={"amount_ml": 500, "date": today_str, "notes": "Post-workout bottle"},
        headers=auth_headers,
    )
    assert entry2_res.status_code == 201
    assert entry2_res.json()["amount_ml"] == 500

    # 4. Verify Daily Summary
    daily_res = await client.get(
        f"/api/v1/water/daily?date_str={today_str}", headers=auth_headers
    )
    assert daily_res.status_code == 200
    daily = daily_res.json()
    assert daily["total_consumed_ml"] == 750
    assert daily["daily_target_ml"] == 2800
    assert daily["remaining_ml"] == 2050
    assert daily["entries_count"] == 2
    assert daily["progress_percentage"] == round((750 / 2800) * 100, 1)

    # 5. Edit water entry
    edit_res = await client.put(
        f"/api/v1/water/entries/{entry1['id']}",
        json={"amount_ml": 350, "notes": "Morning large mug"},
        headers=auth_headers,
    )
    assert edit_res.status_code == 200
    assert edit_res.json()["amount_ml"] == 350

    # Verify updated daily summary
    daily_res2 = await client.get(
        f"/api/v1/water/daily?date_str={today_str}", headers=auth_headers
    )
    assert daily_res2.json()["total_consumed_ml"] == 850

    # 6. Delete water entry
    del_res = await client.delete(
        f"/api/v1/water/entries/{entry1['id']}", headers=auth_headers
    )
    assert del_res.status_code == 204

    # Verify summary after delete
    daily_res3 = await client.get(
        f"/api/v1/water/daily?date_str={today_str}", headers=auth_headers
    )
    assert daily_res3.json()["total_consumed_ml"] == 500
    assert daily_res3.json()["entries_count"] == 1

    # 7. Check Weekly Summary
    weekly_res = await client.get(
        f"/api/v1/water/weekly?end_date_str={today_str}", headers=auth_headers
    )
    assert weekly_res.status_code == 200
    weekly = weekly_res.json()
    assert weekly["total_consumed_ml"] >= 500
    assert len(weekly["daily_breakdown"]) == 7

    # 8. Check Dashboard Integration
    dash_res = await client.get(
        f"/api/v1/dashboard/overview?date_str={today_str}", headers=auth_headers
    )
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    # Confirm quick action includes add_water
    qa_ids = [qa["id"] for qa in dash_data["quick_actions"]]
    assert "add_water" in qa_ids
