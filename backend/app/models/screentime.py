import uuid
from datetime import date as dt_date
from sqlalchemy import Boolean, Date, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base
from backend.app.models.base import GUID, TimestampMixin


class ScreenTimeGoal(Base, TimestampMixin):
    __tablename__ = "screen_time_goals"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    daily_target_minutes: Mapped[int] = mapped_column(Integer, default=240, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    user = relationship("User", back_populates="screen_time_goal")


class ScreenTimeImport(Base, TimestampMixin):
    __tablename__ = "screen_time_imports"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    image_path: Mapped[str] = mapped_column(String(500), nullable=False)
    image_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    import_date: Mapped[dt_date] = mapped_column(Date, default=dt_date.today, nullable=False)
    target_date: Mapped[dt_date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending_review", nullable=False)
    app_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_duration_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    raw_ocr_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    extracted_data: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)

    user = relationship("User", back_populates="screen_time_imports")
    sessions = relationship("ScreenTimeSession", back_populates="import_record")


class ScreenTimeSession(Base, TimestampMixin):
    __tablename__ = "screen_time_sessions"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[dt_date] = mapped_column(Date, nullable=False, index=True)
    app_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    package_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category: Mapped[str] = mapped_column(
        String(64), default="Other", nullable=False, index=True
    )  # Social Media, Entertainment, Productivity, Communication, Education, Other
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_synced: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    import_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID, ForeignKey("screen_time_imports.id", ondelete="SET NULL"), nullable=True, index=True
    )

    user = relationship("User", back_populates="screen_time_sessions")
    import_record = relationship("ScreenTimeImport", back_populates="sessions")


class TrackedApplication(Base, TimestampMixin):
    __tablename__ = "tracked_applications"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    app_name: Mapped[str] = mapped_column(String(255), nullable=False)
    package_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category: Mapped[str] = mapped_column(String(64), default="Other", nullable=False)
    is_tracked: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    daily_limit_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    user = relationship("User", back_populates="tracked_applications")
