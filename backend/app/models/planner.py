import uuid
from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base
from backend.app.models.base import GUID, TimestampMixin


class WeeklyPlan(Base, TimestampMixin):
    __tablename__ = "weekly_plans"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    week_start_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    items: Mapped[list["WeeklyPlanItem"]] = relationship(
        "WeeklyPlanItem", back_populates="plan", cascade="all, delete-orphan", lazy="selectin"
    )

class WeeklyPlanItem(Base, TimestampMixin):
    __tablename__ = "weekly_plan_items"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    plan_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("weekly_plans.id", ondelete="CASCADE"), index=True, nullable=False
    )
    planned_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    activity_type: Mapped[str] = mapped_column(String(32), nullable=False) # running, strength, football, rest
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    replaced_by_football: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    plan: Mapped["WeeklyPlan"] = relationship("WeeklyPlan", back_populates="items")
