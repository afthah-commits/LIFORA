import uuid
from datetime import date as dt_date
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# Exercise
class ExerciseBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    category: str = Field(description="Dumbbells, Resistance bands, Bodyweight, General strength")
    target_muscle: str = Field(min_length=1, max_length=128)
    description: str | None = None

class ExerciseCreate(ExerciseBase):
    pass

class ExerciseUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    target_muscle: str | None = None
    description: str | None = None

class ExerciseResponse(ExerciseBase):
    id: uuid.UUID
    is_custom: bool
    created_by_id: uuid.UUID | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Workout Exercise in Session
class WorkoutExerciseBase(BaseModel):
    exercise_id: uuid.UUID | None = None
    exercise_name: str
    sets: int = Field(default=1, ge=1)
    reps: int = Field(default=1, ge=1)
    weight_kg: float = Field(default=0.0, ge=0.0)
    duration_minutes: int | None = Field(default=None, ge=0)
    notes: str | None = None
    order_index: int = 0

class WorkoutExerciseCreate(WorkoutExerciseBase):
    pass

class WorkoutExerciseResponse(WorkoutExerciseBase):
    id: uuid.UUID
    session_id: uuid.UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Workout Session
class WorkoutSessionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    date: dt_date
    duration_minutes: int = Field(default=0, ge=0)
    notes: str | None = None
    exercises: list[WorkoutExerciseCreate] = []

class WorkoutSessionUpdate(BaseModel):
    name: str | None = None
    date: dt_date | None = None
    duration_minutes: int | None = Field(default=None, ge=0)
    notes: str | None = None

class WorkoutSessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    date: dt_date
    duration_minutes: int
    notes: str | None = None
    exercises: list[WorkoutExerciseResponse] = []
    total_sets: int = 0
    total_volume_kg: float = 0.0
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Workout Template
class WorkoutTemplateItemCreate(BaseModel):
    exercise_id: uuid.UUID
    sets: int = Field(default=3, ge=1)
    reps: int = Field(default=10, ge=1)
    target_weight_kg: float | None = Field(default=None, ge=0)
    order_index: int = 0

class WorkoutTemplateItemResponse(BaseModel):
    id: uuid.UUID
    template_id: uuid.UUID
    exercise_id: uuid.UUID
    exercise_name: str | None = None
    target_muscle: str | None = None
    sets: int
    reps: int
    target_weight_kg: float | None = None
    order_index: int
    model_config = ConfigDict(from_attributes=True)

class WorkoutTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    items: list[WorkoutTemplateItemCreate] = []

class WorkoutTemplateResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    description: str | None = None
    items: list[WorkoutTemplateItemResponse] = []
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
