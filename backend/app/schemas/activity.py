import uuid
from datetime import date as dt_date
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ActivityBase(BaseModel):
    activity_type: str = Field(description="'running' or 'football'")
    date: dt_date
    duration_minutes: int = Field(gt=0, description="Duration in minutes")
    distance_km: float | None = Field(default=None, gt=0, description="Running distance in km")
    effort_level: str | None = Field(default=None, description="Easy, Moderate, Hard, Max")
    intensity: str | None = Field(default=None, description="Low, Medium, High for football")
    notes: str | None = None

class ActivityCreate(ActivityBase):
    pass

class ActivityUpdate(BaseModel):
    date: dt_date | None = None
    duration_minutes: int | None = Field(default=None, gt=0)
    distance_km: float | None = Field(default=None, gt=0)
    effort_level: str | None = None
    intensity: str | None = None
    notes: str | None = None

class ActivityResponse(ActivityBase):
    id: uuid.UUID
    user_id: uuid.UUID
    calculated_pace: str | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class RunningSummary(BaseModel):
    total_distance_km: float
    total_sessions: int
    average_pace: str
    average_distance_km: float
    weekly_distance_km: float

class FootballSummary(BaseModel):
    total_sessions: int
    total_duration_minutes: int
    weekly_duration_minutes: int
    weekly_sessions: int
