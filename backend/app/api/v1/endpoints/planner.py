import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user, get_db
from backend.app.models.user import User
from backend.app.schemas.planner import (
    WeeklyPlanItemCreate,
    WeeklyPlanItemResponse,
    WeeklyPlanItemUpdate,
    WeeklyPlanResponse,
)
from backend.app.services.planner_service import PlannerService

router = APIRouter()

@router.get("", response_model=WeeklyPlanResponse)
async def get_weekly_plan(
    week_date: date | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    target_date = week_date or date.today()
    return await PlannerService.get_or_create_weekly_plan(db, current_user.id, target_date)

@router.post("/{plan_id}/items", response_model=WeeklyPlanItemResponse, status_code=status.HTTP_201_CREATED)
async def add_plan_item(
    plan_id: uuid.UUID,
    data: WeeklyPlanItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await PlannerService.add_or_update_plan_item(db, current_user.id, plan_id, data)

@router.patch("/items/{item_id}", response_model=WeeklyPlanItemResponse)
async def update_plan_item(
    item_id: uuid.UUID,
    data: WeeklyPlanItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await PlannerService.update_item(db, current_user.id, item_id, data)

@router.post("/items/{item_id}/replace-with-football", response_model=WeeklyPlanItemResponse)
async def replace_with_football(
    item_id: uuid.UUID,
    duration_minutes: int = Query(default=90),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await PlannerService.replace_running_with_football(db, current_user.id, item_id, duration_minutes)

@router.delete("/items/{item_id}")
async def delete_plan_item(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    success = await PlannerService.delete_item(db, current_user.id, item_id)
    return {"message": "Plan item deleted successfully", "success": success}
