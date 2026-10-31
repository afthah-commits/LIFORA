import uuid
from datetime import date

from sqlalchemy import Date, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.core.database import Base
from backend.app.models.base import GUID, TimestampMixin


class ActivitySession(Base, TimestampMixin):
    __tablename__ = "activity_sessions"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    activity_type: Mapped[str] = mapped_column(String(32), index=True, nullable=False) # 'running' or 'football'
    date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)

    # Running specific fields
    distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    calculated_pace: Mapped[str | None] = mapped_column(String(32), nullable=True) # e.g. '5:12 /km'
    effort_level: Mapped[str | None] = mapped_column(String(32), nullable=True) # Easy, Moderate, Hard, Max

    # Football specific fields
    intensity: Mapped[str | None] = mapped_column(String(32), nullable=True) # Low, Medium, High

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
