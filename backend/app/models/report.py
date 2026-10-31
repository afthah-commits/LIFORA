import uuid
from datetime import date
from typing import Any

from sqlalchemy import JSON, Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.core.database import Base
from backend.app.models.base import GUID, TimestampMixin


class WeeklyReport(Base, TimestampMixin):
    __tablename__ = "weekly_reports"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    start_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    report_type: Mapped[str] = mapped_column(String(32), default="weekly", nullable=False)
    report_data: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
