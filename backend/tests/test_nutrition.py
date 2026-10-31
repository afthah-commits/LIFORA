from datetime import date

import httpx
import pytest


@pytest.mark.asyncio
async def test_list_and_create_food(client: httpx.AsyncClient, auth_headers: dict):
    # List foods
    list_resp = await client.get("/api/v1/foods", headers=auth_headers)
    assert list_resp.status_code == 200
    foods = list_resp.json()
    assert len(foods) > 0 # Seeded foods exist

    # Create custom food
    custom_resp = await client.post("/api/v1/foods", headers=auth_headers, json={
        "name": "Custom Protein Smoothie",
        "category": "Beverages",
        "serving_size": 300.0,
        "serving_unit": "ml",
        "calories": 250.0,
        "protein_g": 30.0,
        "carbs_g": 20.0,
        "fat_g": 4.0,
        "fiber_g": 2.0
    })
    assert custom_resp.status_code == 201
    custom_data = custom_resp.json()
    assert custom_data["name"] == "Custom Protein Smoothie"
    assert custom_data["is_custom"] is True

@pytest.mark.asyncio
async def test_log_food_entry_and_daily_summary(client: httpx.AsyncClient, auth_headers: dict):
    today = str(date.today())

    # Create food entry
    entry_resp = await client.post("/api/v1/food-entries", headers=auth_headers, json={
        "date": today,
        "meal_type": "Lunch",
        "notes": "Post workout recovery meal",
        "items": [
            {
                "food_name": "Chicken Breast",
                "quantity": 200.0,
                "unit": "g",
                "calories": 330.0,
                "protein_g": 62.0,
                "carbs_g": 0.0,
                "fat_g": 7.2,
                "fiber_g": 0.0
            },
            {
                "food_name": "White Rice",
                "quantity": 150.0,
                "unit": "g",
                "calories": 195.0,
                "protein_g": 4.0,
                "carbs_g": 42.0,
                "fat_g": 0.5,
                "fiber_g": 0.6
            }
        ]
    })
    assert entry_resp.status_code == 201
    entry_data = entry_resp.json()
    assert len(entry_data["items"]) == 2
    assert entry_data["total_protein_g"] == 66.0

    # Get daily summary
    summary_resp = await client.get(f"/api/v1/nutrition/daily-summary?target_date={today}", headers=auth_headers)
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    assert summary["total_protein_g"] == 66.0
    assert summary["protein_target_g"] == 85.0
    # 66 / 85 * 100 = ~77.6%
    assert 77.0 <= summary["protein_progress_percentage"] <= 78.0
