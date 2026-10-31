import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user, get_db
from backend.app.models.user import User
from backend.app.schemas.activity import (
    ActivityCreate,
    ActivityResponse,
    FootballSummary,
    RunningSummary,
)
from backend.app.services.activity_service import ActivityService

router = APIRouter()

@router.get("", response_model=list[ActivityResponse])
async def list_activities(
    activity_type: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    activities = await ActivityService.get_activities(db, current_user.id, activity_type=activity_type)
    return [ActivityResponse.model_validate(a) for a in activities]

@router.post("", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
async def create_activity(
    data: ActivityCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    activity = await ActivityService.create_activity(db, current_user.id, data)
    return ActivityResponse.model_validate(activity)

@router.delete("/{activity_id}")
async def delete_activity(
    activity_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    success = await ActivityService.delete_activity(db, current_user.id, activity_id)
    if not success:
        raise HTTPException(status_code=404, detail="Activity session not found")
    return {"message": "Activity deleted successfully"}

@router.get("/running/summary", response_model=RunningSummary)
async def get_running_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await ActivityService.get_running_summary(db, current_user.id)

@router.get("/football/summary", response_model=FootballSummary)
async def get_football_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await ActivityService.get_football_summary(db, current_user.id)
