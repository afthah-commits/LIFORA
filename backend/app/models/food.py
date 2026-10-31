import uuid
from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base
from backend.app.models.base import GUID, TimestampMixin


class Food(Base, TimestampMixin):
    __tablename__ = "foods"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    brand: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category: Mapped[str] = mapped_column(String(64), index=True, default="Other", nullable=False)

    # Nutrition values (per serving_size)
    serving_size: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    serving_unit: Mapped[str] = mapped_column(String(32), default="g", nullable=False)
    calories: Mapped[float] = mapped_column(Float, nullable=False)
    protein_g: Mapped[float] = mapped_column(Float, nullable=False)
    carbs_g: Mapped[float] = mapped_column(Float, nullable=False)
    fat_g: Mapped[float] = mapped_column(Float, nullable=False)
    fiber_g: Mapped[float | None] = mapped_column(Float, nullable=True, default=0.0)

    is_custom: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

class FoodEntry(Base, TimestampMixin):
    __tablename__ = "food_entries"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    meal_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    items: Mapped[list["FoodEntryItem"]] = relationship(
        "FoodEntryItem", back_populates="entry", cascade="all, delete-orphan", lazy="selectin"
    )

class FoodEntryItem(Base):
    """Stores food items within a meal with a snapshot of nutrition values at the time of entry."""
    __tablename__ = "food_entry_items"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    entry_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("food_entries.id", ondelete="CASCADE"), index=True, nullable=False
    )
    food_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID, ForeignKey("foods.id", ondelete="SET NULL"), nullable=True, index=True
    )
    food_name: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(32), default="g", nullable=False)

    # Nutritional snapshots
    calories: Mapped[float] = mapped_column(Float, nullable=False)
    protein_g: Mapped[float] = mapped_column(Float, nullable=False)
    carbs_g: Mapped[float] = mapped_column(Float, nullable=False)
    fat_g: Mapped[float] = mapped_column(Float, nullable=False)
    fiber_g: Mapped[float | None] = mapped_column(Float, nullable=True, default=0.0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False
    )

    entry: Mapped["FoodEntry"] = relationship("FoodEntry", back_populates="items")

class FoodAiAnalysis(Base):
    __tablename__ = "food_ai_analyses"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    image_path: Mapped[str] = mapped_column(String(512), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False) # pending, analyzed, confirmed, rejected
    detected_items: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON, nullable=True)
    raw_analysis: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False
    )
