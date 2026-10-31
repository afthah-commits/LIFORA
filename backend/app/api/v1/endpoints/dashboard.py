from datetime import date as dt_date
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user, get_db
from backend.app.models.user import User
from backend.app.schemas.dashboard import (
    DashboardConfigResponse,
    DashboardConfigUpdate,
    DashboardOverviewResponse,
)
from backend.app.services.dashboard_service import DashboardService

router = APIRouter()


@router.get("/overview", response_model=DashboardOverviewResponse)
async def get_dashboard_overview(
    date_str: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        target_date = dt_date.fromisoformat(date_str) if date_str else dt_date.today()
    except ValueError:
        target_date = dt_date.today()

    return await DashboardService.get_overview(db, current_user.id, target_date)


@router.get("/config", response_model=DashboardConfigResponse)
async def get_dashboard_config(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cfg = await DashboardService.get_or_create_config(db, current_user.id)
    return DashboardConfigResponse.model_validate(cfg)


@router.put("/config", response_model=DashboardConfigResponse)
async def update_dashboard_config(
    data: DashboardConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cfg = await DashboardService.update_config(db, current_user.id, data)
    return DashboardConfigResponse.model_validate(cfg)
