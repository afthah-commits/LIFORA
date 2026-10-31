import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base
from backend.app.models.base import GUID, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, server_default="true", nullable=False)
    verification_token: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    reset_token: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    reset_token_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    profile: Mapped[Optional["UserProfile"]] = relationship(
        "UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan", lazy="selectin"
    )
    goals: Mapped[Optional["UserGoal"]] = relationship(
        "UserGoal", back_populates="user", uselist=False, cascade="all, delete-orphan", lazy="selectin"
    )
    refresh_sessions: Mapped[list["RefreshSession"]] = relationship(
        "RefreshSession", back_populates="user", cascade="all, delete-orphan"
    )
    # V2 Life Management Module Relationships
    screen_time_goal = relationship(
        "ScreenTimeGoal", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    screen_time_sessions = relationship(
        "ScreenTimeSession", back_populates="user", cascade="all, delete-orphan"
    )
    screen_time_imports = relationship(
        "ScreenTimeImport", back_populates="user", cascade="all, delete-orphan"
    )
    tracked_applications = relationship(
        "TrackedApplication", back_populates="user", cascade="all, delete-orphan"
    )
    salary_records = relationship(
        "SalaryRecord", back_populates="user", cascade="all, delete-orphan"
    )
    income_entries = relationship(
        "IncomeEntry", back_populates="user", cascade="all, delete-orphan"
    )
    expense_entries = relationship(
        "ExpenseEntry", back_populates="user", cascade="all, delete-orphan"
    )
    savings_goals = relationship(
        "SavingsGoal", back_populates="user", cascade="all, delete-orphan"
    )
    budgets = relationship(
        "Budget", back_populates="user", cascade="all, delete-orphan"
    )
    recurring_transactions = relationship(
        "RecurringTransaction", back_populates="user", cascade="all, delete-orphan"
    )
    custom_modules = relationship(
        "CustomModule", back_populates="user", cascade="all, delete-orphan"
    )
    custom_module_records = relationship(
        "CustomModuleRecord", back_populates="user", cascade="all, delete-orphan"
    )
    dashboard_config = relationship(
        "DashboardConfig", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    water_goal = relationship(
        "WaterGoal", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    water_entries = relationship(
        "WaterEntry", back_populates="user", cascade="all, delete-orphan"
    )

class UserProfile(Base, TimestampMixin):
    __tablename__ = "user_profiles"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    display_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    age: Mapped[int] = mapped_column(Integer, default=19, nullable=False)
    height_cm: Mapped[float] = mapped_column(Float, default=167.0, nullable=False)
    current_weight_kg: Mapped[float] = mapped_column(Float, default=53.0, nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Kolkata", nullable=False)
    preferred_language: Mapped[str] = mapped_column(String(32), default="English", nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="profile")

class UserGoal(Base, TimestampMixin):
    __tablename__ = "user_goals"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    target_weight_kg: Mapped[float] = mapped_column(Float, default=60.0, nullable=False)
    daily_protein_target_g: Mapped[float] = mapped_column(Float, default=85.0, nullable=False)
    running_target_km: Mapped[float] = mapped_column(Float, default=5.0, nullable=False)
    daily_calorie_target: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)

    user: Mapped["User"] = relationship("User", back_populates="goals")

class RefreshSession(Base):
    __tablename__ = "refresh_sessions"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="refresh_sessions")
