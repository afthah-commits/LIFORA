import os

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user, get_db
from backend.app.core.config import settings
from backend.app.models.user import User
from backend.app.schemas.food import (
    FoodAiAnalysisResponse,
    FoodAiConfirmRequest,
    FoodEntryResponse,
)
from backend.app.services.ai_service import AiService

router = APIRouter()

@router.post("/analyze", response_model=FoodAiAnalysisResponse)
async def analyze_food_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are accepted")
    return await AiService.analyze_food_image(db, current_user.id, file)

@router.post("/confirm", response_model=FoodEntryResponse)
async def confirm_food_analysis(
    req: FoodAiConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    entry = await AiService.confirm_food_analysis(db, current_user.id, req)
    return FoodEntryResponse.model_validate(entry)

@router.get("/images/{filename}")
async def get_uploaded_image(filename: str):
    # Prevent directory traversal
    clean_name = os.path.basename(filename)
    file_path = os.path.join(settings.UPLOAD_DIR, clean_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)
