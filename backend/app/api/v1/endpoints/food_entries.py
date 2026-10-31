import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user, get_db
from backend.app.models.user import User
from backend.app.schemas.food import FoodEntryCreate, FoodEntryResponse
from backend.app.services.nutrition_service import NutritionService

router = APIRouter()

@router.get("", response_model=list[FoodEntryResponse])
async def get_food_entries(
    entry_date: date | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    target_date = entry_date or date.today()
    return await NutritionService.get_entries_by_date(db, current_user.id, target_date)

@router.post("", response_model=FoodEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_food_entry(
    data: FoodEntryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    entry = await NutritionService.create_food_entry(db, current_user.id, data)
    # Return formatted response with calculated totals
    entries = await NutritionService.get_entries_by_date(db, current_user.id, entry.date)
    for e in entries:
        if e.id == entry.id:
            return e
    return FoodEntryResponse.model_validate(entry)

@router.delete("/{entry_id}")
async def delete_food_entry(
    entry_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    success = await NutritionService.delete_food_entry(db, current_user.id, entry_id)
    if not success:
        raise HTTPException(status_code=404, detail="Food entry not found")
    return {"message": "Entry deleted successfully"}
