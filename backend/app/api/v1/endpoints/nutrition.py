from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user, get_db
from backend.app.models.user import User
from backend.app.schemas.food import DailyNutritionSummary
from backend.app.services.nutrition_service import NutritionService

router = APIRouter()

@router.get("/daily-summary", response_model=DailyNutritionSummary)
async def get_daily_summary(
    target_date: date | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    d = target_date or date.today()
    return await NutritionService.get_daily_summary(db, current_user.id, d)
