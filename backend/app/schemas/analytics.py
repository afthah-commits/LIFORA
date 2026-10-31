from datetime import date as dt_date
from typing import Any

from pydantic import BaseModel


class NutritionDataPoint(BaseModel):
    date: dt_date
    calories: float | None = None
    protein_g: float | None = None
    carbs_g: float | None = None
    fat_g: float | None = None
    has_data: bool = False

class ActivityDataPoint(BaseModel):
    date: dt_date
    running_distance_km: float | None = None
    running_duration_min: int | None = None
    football_duration_min: int | None = None
    workout_duration_min: int | None = None
    workout_sessions_count: int = 0
    has_activity: bool = False

class WeightDataPoint(BaseModel):
    date: dt_date
    weight_kg: float | None = None
    has_data: bool = False

class AnalyticsOverview(BaseModel):
    period: str # "7d", "30d", "90d"
    start_date: dt_date
    end_date: dt_date

    # Nutrition
    total_days_in_period: int
    nutrition_days_recorded: int
    average_calories: float | None = None # Calculated only over recorded days!
    average_protein_g: float | None = None
    average_carbs_g: float | None = None
    average_fat_g: float | None = None
    protein_target_g: float
    protein_goal_met_days: int
    protein_goal_completion_rate: float

    # Activities
    total_running_distance_km: float
    total_running_sessions: int
    average_running_pace: str | None = None
    total_football_duration_min: int
    total_football_sessions: int
    total_workout_sessions: int
    total_workout_duration_min: int

    # Weight
    weight_days_recorded: int
    start_weight_kg: float | None = None
    latest_weight_kg: float | None = None
    weight_change_kg: float | None = None
    target_weight_kg: float

    # Hydration / Water
    water_total_consumed_ml: int | None = None
    water_daily_average_ml: int | None = None
    water_target_ml: int | None = None
    water_goal_met_days: int | None = None
    water_trend: list[dict[str, Any]] | None = None

    # Time series for charts
    nutrition_trend: list[NutritionDataPoint]
    activity_trend: list[ActivityDataPoint]
    weight_trend: list[WeightDataPoint]
