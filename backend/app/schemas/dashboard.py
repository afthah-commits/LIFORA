import uuid
from typing import Any
from pydantic import BaseModel, ConfigDict


class PrimaryCardStat(BaseModel):
    label: str
    value: str
    subtext: str | None = None
    progress: float | None = None  # 0.0 to 100.0


class PrimaryCard(BaseModel):
    id: str  # "fitness", "screentime", "money", "planner"
    title: str
    icon: str  # Lucide icon name
    stats: list[PrimaryCardStat]
    link: str
    badge: str | None = None


class CustomWidget(BaseModel):
    id: str
    module_id: str
    module_name: str
    icon: str
    color: str
    records_count: int
    recent_entry: dict[str, Any] | None = None
    link: str


class QuickAction(BaseModel):
    id: str
    label: str
    icon: str
    action_type: str  # "modal" or "navigate"
    target: str


class DashboardOverviewResponse(BaseModel):
    primary_cards: list[PrimaryCard]
    quick_actions: list[QuickAction]
    custom_widgets: list[CustomWidget] = []
    recent_activities: list[dict[str, Any]] = []
    layout_config: dict[str, Any] = {}


class DashboardConfigUpdate(BaseModel):
    layout_config: dict[str, Any]


class DashboardConfigResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    layout_config: dict[str, Any]
    model_config = ConfigDict(from_attributes=True)
