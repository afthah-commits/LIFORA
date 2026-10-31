import uuid
from datetime import date as dt_date
from datetime import datetime
from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base
from backend.app.models.base import GUID, TimestampMixin


class WaterGoal(Base, TimestampMixin):
    __tablename__ = "water_goals"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    daily_target_ml: Mapped[int] = mapped_column(Integer, default=2500, nullable=False)
    reminder_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    reminder_interval_hours: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    user = relationship("User", back_populates="water_goal")


class WaterEntry(Base, TimestampMixin):
    __tablename__ = "water_entries"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[dt_date] = mapped_column(Date, default=dt_date.today, nullable=False, index=True)
    time: Mapped[str] = mapped_column(String(8), default=lambda: datetime.now().strftime("%H:%M"), nullable=False)
    amount_ml: Mapped[int] = mapped_column(Integer, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    user = relationship("User", back_populates="water_entries")
