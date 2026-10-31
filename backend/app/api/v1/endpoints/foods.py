from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user, get_db
from backend.app.models.user import User
from backend.app.schemas.food import FoodCreate, FoodResponse
from backend.app.services.nutrition_service import NutritionService

router = APIRouter()

@router.get("", response_model=list[FoodResponse])
async def list_foods(
    search: str | None = Query(None),
    category: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    foods = await NutritionService.get_foods(db, search=search, category=category, user_id=current_user.id)
    return [FoodResponse.model_validate(f) for f in foods]

@router.post("", response_model=FoodResponse, status_code=status.HTTP_201_CREATED)
async def create_food(
    data: FoodCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    food = await NutritionService.create_custom_food(db, user_id=current_user.id, data=data)
    return FoodResponse.model_validate(food)
