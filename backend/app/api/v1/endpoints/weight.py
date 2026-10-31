import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user, get_db
from backend.app.models.user import User
from backend.app.schemas.weight import (
    WeightEntryCreate,
    WeightEntryResponse,
    WeightSummary,
)
from backend.app.services.weight_service import WeightService

router = APIRouter()

@router.get("/summary", response_model=WeightSummary)
async def get_weight_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await WeightService.get_weight_summary(db, current_user.id)

@router.get("", response_model=list[WeightEntryResponse])
async def list_weight_entries(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    entries = await WeightService.get_weight_entries(db, current_user.id)
    return [WeightEntryResponse.model_validate(e) for e in entries]

@router.post("", response_model=WeightEntryResponse, status_code=status.HTTP_201_CREATED)
async def log_weight(
    data: WeightEntryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    entry = await WeightService.create_weight_entry(db, current_user.id, data)
    return WeightEntryResponse.model_validate(entry)

@router.delete("/{entry_id}")
async def delete_weight(
    entry_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    success = await WeightService.delete_weight_entry(db, current_user.id, entry_id)
    if not success:
        raise HTTPException(status_code=404, detail="Weight entry not found")
    return {"message": "Weight entry deleted successfully"}
