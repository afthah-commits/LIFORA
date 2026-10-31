from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user, get_db
from backend.app.models.user import User
from backend.app.schemas.user import UserGoalResponse, UserGoalUpdate
from backend.app.services.auth_service import AuthService

router = APIRouter()

@router.get("", response_model=UserGoalResponse)
async def get_goals(current_user: User = Depends(get_current_user)):
    return UserGoalResponse.model_validate(current_user.goals)

@router.put("", response_model=UserGoalResponse)
async def update_goals(
    data: UserGoalUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    goal = await AuthService.update_goals(db, current_user, data)
    return UserGoalResponse.model_validate(goal)
