
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user, get_db
from backend.app.models.user import User
from backend.app.schemas.workout import ExerciseCreate, ExerciseResponse
from backend.app.services.workout_service import WorkoutService

router = APIRouter()

@router.get("", response_model=list[ExerciseResponse])
async def list_exercises(
    search: str | None = Query(None),
    category: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    exercises = await WorkoutService.get_exercises(db, search=search, category=category, user_id=current_user.id)
    return [ExerciseResponse.model_validate(e) for e in exercises]

@router.post("", response_model=ExerciseResponse, status_code=status.HTTP_201_CREATED)
async def create_exercise(
    data: ExerciseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    exercise = await WorkoutService.create_exercise(db, user_id=current_user.id, data=data)
    return ExerciseResponse.model_validate(exercise)
