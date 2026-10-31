import uuid
from datetime import date
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base
from backend.app.models.base import GUID, TimestampMixin


class Exercise(Base, TimestampMixin):
    __tablename__ = "exercises"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(64), index=True, nullable=False) # Dumbbells, Resistance bands, Bodyweight, General strength
    target_muscle: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_custom: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

class WorkoutTemplate(Base, TimestampMixin):
    __tablename__ = "workout_templates"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    items: Mapped[list["WorkoutTemplateItem"]] = relationship(
        "WorkoutTemplateItem", back_populates="template", cascade="all, delete-orphan", lazy="selectin"
    )

class WorkoutTemplateItem(Base):
    __tablename__ = "workout_template_items"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    template_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("workout_templates.id", ondelete="CASCADE"), index=True, nullable=False
    )
    exercise_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("exercises.id", ondelete="CASCADE"), index=True, nullable=False
    )
    sets: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    reps: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    target_weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    template: Mapped["WorkoutTemplate"] = relationship("WorkoutTemplate", back_populates="items")
    exercise: Mapped["Exercise"] = relationship("Exercise", lazy="joined")

class WorkoutSession(Base, TimestampMixin):
    __tablename__ = "workout_sessions"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    exercises: Mapped[list["WorkoutExercise"]] = relationship(
        "WorkoutExercise", back_populates="session", cascade="all, delete-orphan", lazy="selectin"
    )

class WorkoutExercise(Base, TimestampMixin):
    __tablename__ = "workout_exercises"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("workout_sessions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    exercise_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID, ForeignKey("exercises.id", ondelete="SET NULL"), nullable=True, index=True
    )
    exercise_name: Mapped[str] = mapped_column(String(255), nullable=False)
    sets: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    reps: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    weight_kg: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    session: Mapped["WorkoutSession"] = relationship("WorkoutSession", back_populates="exercises")
    exercise: Mapped[Optional["Exercise"]] = relationship("Exercise", lazy="joined")
