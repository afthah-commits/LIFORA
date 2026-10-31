from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user, get_db
from backend.app.models.user import User
from backend.app.schemas.user import UserProfileResponse, UserProfileUpdate
from backend.app.services.auth_service import AuthService

router = APIRouter()

@router.get("", response_model=UserProfileResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    return UserProfileResponse.model_validate(current_user.profile)

@router.put("", response_model=UserProfileResponse)
async def update_profile(
    data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    profile = await AuthService.update_profile(db, current_user, data)
    return UserProfileResponse.model_validate(profile)
