import uuid
from datetime import date as dt_date
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class WaterEntryBase(BaseModel):
    amount_ml: int = Field(gt=0, le=10000, description="Amount of water in milliliters")
    date: dt_date = Field(default_factory=dt_date.today)
    time: str = Field(default_factory=lambda: datetime.now().strftime("%H:%M"))
    notes: str | None = None


class WaterEntryCreate(BaseModel):
    amount_ml: int = Field(gt=0, le=10000)
    date: dt_date | None = None
    time: str | None = None
    notes: str | None = None


class WaterEntryUpdate(BaseModel):
    amount_ml: int | None = Field(default=None, gt=0, le=10000)
    date: dt_date | None = None
    time: str | None = None
    notes: str | None = None


class WaterEntryResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    date: dt_date
    time: str
    amount_ml: int
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class WaterGoalBase(BaseModel):
    daily_target_ml: int = Field(default=2500, gt=0, le=20000)
    reminder_enabled: bool = True
    reminder_interval_hours: int = Field(default=2, ge=1, le=12)
    notes: str | None = None


class WaterGoalCreate(WaterGoalBase):
    pass


class WaterGoalUpdate(BaseModel):
    daily_target_ml: int | None = Field(default=None, gt=0, le=20000)
    reminder_enabled: bool | None = None
    reminder_interval_hours: int | None = Field(default=None, ge=1, le=12)
    notes: str | None = None


class WaterGoalResponse(WaterGoalBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class DailyWaterSummary(BaseModel):
    date: dt_date
    total_consumed_ml: int
    daily_target_ml: int
    remaining_ml: int
    progress_percentage: float
    entries_count: int
    entries: list[WaterEntryResponse] = []


class WeeklyWaterDayPoint(BaseModel):
    date: str
    day_name: str
    consumed_ml: int
    target_ml: int
    is_goal_met: bool


class WeeklyWaterSummary(BaseModel):
    start_date: str
    end_date: str
    daily_average_ml: int
    total_consumed_ml: int
    daily_target_ml: int
    days_goal_met: int
    daily_breakdown: list[WeeklyWaterDayPoint] = []


class MonthlyWaterSummary(BaseModel):
    month: int
    year: int
    total_consumed_ml: int
    daily_average_ml: int
    daily_target_ml: int
    goal_completion_rate: float
    days_recorded: int
