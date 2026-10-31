import uuid
from datetime import date as dt_date
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class ReportData(BaseModel):
    report_type: str # 'weekly' or 'monthly'
    start_date: str
    end_date: str
    generated_at: str

    # User Profile & Goals at report time
    user_info: dict[str, Any]

    # Nutrition
    nutrition_summary: dict[str, Any]

    # Workouts
    workout_summary: dict[str, Any]

    # Running
    running_summary: dict[str, Any]

    # Football
    football_summary: dict[str, Any]

    # Weight
    weight_summary: dict[str, Any]

    # Data Completeness & Goals
    data_completeness: dict[str, Any]
    goal_completion: dict[str, Any]

class WeeklyReportResponse(BaseModel):
    id: uuid.UUID
    start_date: dt_date
    end_date: dt_date
    report_type: str
    report_data: dict[str, Any]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
