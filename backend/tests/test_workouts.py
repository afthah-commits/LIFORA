from datetime import date

import httpx
import pytest


@pytest.mark.asyncio
async def test_exercise_library_and_workout_logging(client: httpx.AsyncClient, auth_headers: dict):
    # Get exercises
    ex_resp = await client.get("/api/v1/exercises", headers=auth_headers)
    assert ex_resp.status_code == 200
    exercises = ex_resp.json()
    assert len(exercises) > 0

    first_ex = exercises[0]

    # Create workout session
    session_resp = await client.post("/api/v1/workouts", headers=auth_headers, json={
        "name": "Chest & Arms Power",
        "date": str(date.today()),
        "duration_minutes": 55,
        "notes": "Good energy and form",
        "exercises": [
            {
                "exercise_id": first_ex["id"],
                "exercise_name": first_ex["name"],
                "sets": 3,
                "reps": 10,
                "weight_kg": 20.0,
                "notes": "Warmup then 2 working sets"
            }
        ]
    })
    assert session_resp.status_code == 201
    workout_data = session_resp.json()
    assert workout_data["name"] == "Chest & Arms Power"
    assert workout_data["total_sets"] == 3
    assert workout_data["total_volume_kg"] == 600.0 # 3 * 10 * 20
