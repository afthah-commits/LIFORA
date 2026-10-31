import uuid
from datetime import date as dt_date
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class WeeklyPlanItemBase(BaseModel):
    planned_date: dt_date
    activity_type: str = Field(description="running, strength, football, rest")
    duration_minutes: int | None = Field(default=None, ge=0)
    notes: str | None = None
    is_completed: bool = False
    replaced_by_football: bool = False

class WeeklyPlanItemCreate(WeeklyPlanItemBase):
    pass

class WeeklyPlanItemUpdate(BaseModel):
    planned_date: dt_date | None = None
    activity_type: str | None = None
    duration_minutes: int | None = Field(default=None, ge=0)
    notes: str | None = None
    is_completed: bool | None = None
    replaced_by_football: bool | None = None

class WeeklyPlanItemResponse(WeeklyPlanItemBase):
    id: uuid.UUID
    plan_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class WeeklyPlanCreate(BaseModel):
    week_start_date: dt_date
    notes: str | None = None
    items: list[WeeklyPlanItemCreate] = []

class WeeklyPlanResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    week_start_date: dt_date
    notes: str | None = None
    items: list[WeeklyPlanItemResponse] = []
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
