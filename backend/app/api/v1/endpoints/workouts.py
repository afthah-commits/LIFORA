import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user, get_db
from backend.app.models.user import User
from backend.app.schemas.workout import (
    WorkoutSessionCreate,
    WorkoutSessionResponse,
    WorkoutTemplateCreate,
    WorkoutTemplateResponse,
)
from backend.app.services.workout_service import WorkoutService

router = APIRouter()

@router.get("", response_model=list[WorkoutSessionResponse])
async def list_workout_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await WorkoutService.get_workout_sessions(db, current_user.id)

@router.post("", response_model=WorkoutSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_workout_session(
    data: WorkoutSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    workout = await WorkoutService.create_workout_session(db, current_user.id, data)
    session_resp = await WorkoutService.get_workout_session(db, current_user.id, workout.id)
    return session_resp or WorkoutSessionResponse.model_validate(workout)

@router.get("/{session_id}", response_model=WorkoutSessionResponse)
async def get_workout_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    session_resp = await WorkoutService.get_workout_session(db, current_user.id, session_id)
    if not session_resp:
        raise HTTPException(status_code=404, detail="Workout session not found")
    return session_resp

@router.delete("/{session_id}")
async def delete_workout_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    success = await WorkoutService.delete_workout_session(db, current_user.id, session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Workout session not found")
    return {"message": "Workout session deleted successfully"}

# Workout Templates
@router.get("/templates/all", response_model=list[WorkoutTemplateResponse])
async def list_templates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    templates = await WorkoutService.get_templates(db, current_user.id)
    return [WorkoutTemplateResponse.model_validate(t) for t in templates]

@router.post("/templates", response_model=WorkoutTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    data: WorkoutTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    template = await WorkoutService.create_template(db, current_user.id, data)
    return WorkoutTemplateResponse.model_validate(template)

@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    success = await WorkoutService.delete_template(db, current_user.id, template_id)
    if not success:
        raise HTTPException(status_code=404, detail="Workout template not found")
    return {"message": "Template deleted successfully"}
