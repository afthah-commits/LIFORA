import uuid
from datetime import date as dt_date, datetime
from pydantic import BaseModel, ConfigDict, Field


class ScreenTimeGoalBase(BaseModel):
    daily_target_minutes: int = Field(default=240, gt=0, le=1440, description="Daily limit in minutes")
    notes: str | None = None


class ScreenTimeGoalCreate(ScreenTimeGoalBase):
    pass


class ScreenTimeGoalUpdate(BaseModel):
    daily_target_minutes: int | None = Field(default=None, gt=0, le=1440)
    notes: str | None = None


class ScreenTimeGoalResponse(ScreenTimeGoalBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ScreenTimeSessionBase(BaseModel):
    date: dt_date
    app_name: str = Field(min_length=1, max_length=255)
    package_name: str | None = None
    category: str = Field(
        default="Other",
        description="Social Media, Entertainment, Productivity, Communication, Education, Other",
    )
    duration_minutes: int = Field(ge=0, le=1440, description="Usage in minutes")
    notes: str | None = None
    is_synced: bool = False


class ScreenTimeSessionCreate(ScreenTimeSessionBase):
    pass


class ScreenTimeSessionUpdate(BaseModel):
    date: dt_date | None = None
    app_name: str | None = None
    package_name: str | None = None
    category: str | None = None
    duration_minutes: int | None = Field(default=None, ge=0, le=1440)
    notes: str | None = None


class ScreenTimeSessionResponse(ScreenTimeSessionBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class TrackedApplicationBase(BaseModel):
    app_name: str = Field(min_length=1, max_length=255)
    package_name: str | None = None
    category: str = "Other"
    is_tracked: bool = True
    daily_limit_minutes: int | None = Field(default=None, ge=0, le=1440)


class TrackedApplicationCreate(TrackedApplicationBase):
    pass


class TrackedApplicationUpdate(BaseModel):
    category: str | None = None
    is_tracked: bool | None = None
    daily_limit_minutes: int | None = None


class TrackedApplicationResponse(TrackedApplicationBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Android companion sync schemas
class ScreenTimeSyncItem(BaseModel):
    app_name: str
    package_name: str | None = None
    category: str = "Other"
    duration_minutes: int = Field(ge=0)
    date: dt_date


class ScreenTimeSyncRequest(BaseModel):
    device_id: str | None = None
    items: list[ScreenTimeSyncItem]


class ScreenTimeSyncResponse(BaseModel):
    status: str
    synced_count: int
    message: str


# Analytics & Summaries
class MostUsedApp(BaseModel):
    app_name: str
    category: str
    duration_minutes: int
    percentage_of_total: float


class DailyScreenTimeSummary(BaseModel):
    date: dt_date
    total_duration_minutes: int
    daily_target_minutes: int
    remaining_allowed_minutes: int
    is_over_limit: bool
    most_used_app: MostUsedApp | None = None
    category_breakdown: dict[str, int] = {}
    sessions: list[ScreenTimeSessionResponse] = []


class WeeklyScreenTimeSummary(BaseModel):
    start_date: dt_date
    end_date: dt_date
    daily_average_minutes: int
    total_minutes: int
    daily_target_minutes: int
    top_apps: list[MostUsedApp] = []
    category_breakdown: dict[str, int] = {}


# Screenshot Import Schemas
class ExtractedScreenTimeItem(BaseModel):
    app_name: str
    category: str = "Other"
    duration_minutes: int = Field(ge=0)
    duration_formatted: str = ""
    confidence: float = 0.90


class ScreenTimeImportReviewResponse(BaseModel):
    id: uuid.UUID
    image_url: str
    detected_date: dt_date
    total_detected_minutes: int
    total_formatted: str
    status: str
    items: list[ExtractedScreenTimeItem]
    raw_text: str | None = None
    message: str | None = None


class ScreenTimeImportConfirmItem(BaseModel):
    app_name: str = Field(min_length=1, max_length=255)
    category: str = "Other"
    duration_minutes: int = Field(ge=0, le=1440)
    notes: str | None = None


class ScreenTimeImportConfirmRequest(BaseModel):
    target_date: dt_date
    items: list[ScreenTimeImportConfirmItem]


class ScreenTimeImportHistoryItem(BaseModel):
    id: uuid.UUID
    import_date: dt_date
    target_date: dt_date
    image_url: str
    status: str
    app_count: int
    total_duration_minutes: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

