import uuid
from datetime import date as dt_date
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class WeightEntryCreate(BaseModel):
    date: dt_date
    weight_kg: float = Field(gt=20.0, lt=300.0)
    notes: str | None = None

class WeightEntryUpdate(BaseModel):
    weight_kg: float | None = Field(default=None, gt=20.0, lt=300.0)
    notes: str | None = None

class WeightEntryResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    date: dt_date
    weight_kg: float
    notes: str | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class WeightSummary(BaseModel):
    current_weight_kg: float
    target_weight_kg: float
    weight_difference_kg: float # target - current
    weekly_average_kg: float | None = None
    monthly_change_kg: float | None = None
    total_entries_count: int
    history: list[WeightEntryResponse] = []
