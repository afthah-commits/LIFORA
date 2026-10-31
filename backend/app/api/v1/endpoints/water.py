import uuid
from datetime import date as dt_date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user, get_db
from backend.app.models.user import User
from backend.app.schemas.water import (
    DailyWaterSummary,
    MonthlyWaterSummary,
    WaterEntryCreate,
    WaterEntryResponse,
    WaterEntryUpdate,
    WaterGoalResponse,
    WaterGoalUpdate,
    WeeklyWaterSummary,
)
from backend.app.services.water_service import WaterService

router = APIRouter()


@router.get("/daily", response_model=DailyWaterSummary)
async def get_daily_water(
    date_str: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        target_date = dt_date.fromisoformat(date_str) if date_str else dt_date.today()
    except ValueError:
        target_date = dt_date.today()

    return await WaterService.get_daily_summary(db, current_user.id, target_date)


@router.get("/weekly", response_model=WeeklyWaterSummary)
async def get_weekly_water(
    end_date_str: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        end_date = dt_date.fromisoformat(end_date_str) if end_date_str else dt_date.today()
    except ValueError:
        end_date = dt_date.today()

    return await WaterService.get_weekly_summary(db, current_user.id, end_date)


@router.get("/monthly", response_model=MonthlyWaterSummary)
async def get_monthly_water(
    year: int | None = None,
    month: int | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    today = dt_date.today()
    y = year or today.year
    m = month or today.month
    return await WaterService.get_monthly_summary(db, current_user.id, y, m)


@router.post(
    "/entries",
    response_model=WaterEntryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def log_water(
    data: WaterEntryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = await WaterService.log_entry(db, current_user.id, data)
    return WaterEntryResponse.model_validate(entry)


@router.put("/entries/{entry_id}", response_model=WaterEntryResponse)
async def update_water_entry(
    entry_id: uuid.UUID,
    data: WaterEntryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    updated = await WaterService.update_entry(db, current_user.id, entry_id, data)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Water entry not found"
        )
    return WaterEntryResponse.model_validate(updated)


@router.delete("/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_water_entry(
    entry_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    deleted = await WaterService.delete_entry(db, current_user.id, entry_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Water entry not found"
        )


@router.get("/goal", response_model=WaterGoalResponse)
async def get_water_goal(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    goal = await WaterService.get_or_create_goal(db, current_user.id)
    return WaterGoalResponse.model_validate(goal)


@router.put("/goal", response_model=WaterGoalResponse)
async def update_water_goal(
    data: WaterGoalUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    goal = await WaterService.update_goal(db, current_user.id, data)
    return WaterGoalResponse.model_validate(goal)
