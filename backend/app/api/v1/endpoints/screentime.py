import os
import uuid
from datetime import date as dt_date
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user, get_db
from backend.app.core.config import settings
from backend.app.models.user import User
from backend.app.schemas.screentime import (
    DailyScreenTimeSummary,
    ScreenTimeGoalCreate,
    ScreenTimeGoalResponse,
    ScreenTimeGoalUpdate,
    ScreenTimeImportConfirmRequest,
    ScreenTimeImportHistoryItem,
    ScreenTimeImportReviewResponse,
    ScreenTimeSessionCreate,
    ScreenTimeSessionResponse,
    ScreenTimeSessionUpdate,
    ScreenTimeSyncRequest,
    ScreenTimeSyncResponse,
    WeeklyScreenTimeSummary,
)
from backend.app.services.screentime_ocr_service import ScreenTimeOcrService
from backend.app.services.screentime_service import ScreenTimeService

router = APIRouter()


@router.get("/goal", response_model=ScreenTimeGoalResponse)
async def get_goal(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    goal = await ScreenTimeService.get_or_create_goal(db, current_user.id)
    return ScreenTimeGoalResponse.model_validate(goal)


@router.put("/goal", response_model=ScreenTimeGoalResponse)
async def update_goal(
    data: ScreenTimeGoalUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    goal = await ScreenTimeService.update_goal(db, current_user.id, data)
    return ScreenTimeGoalResponse.model_validate(goal)


@router.post("/sessions", response_model=ScreenTimeSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    data: ScreenTimeSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await ScreenTimeService.create_session(db, current_user.id, data)
    return ScreenTimeSessionResponse.model_validate(session)


@router.put("/sessions/{session_id}", response_model=ScreenTimeSessionResponse)
async def update_session(
    session_id: uuid.UUID,
    data: ScreenTimeSessionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await ScreenTimeService.get_session_by_id(db, session_id, current_user.id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    updated = await ScreenTimeService.update_session(db, session, data)
    return ScreenTimeSessionResponse.model_validate(updated)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await ScreenTimeService.get_session_by_id(db, session_id, current_user.id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    await ScreenTimeService.delete_session(db, session)


@router.get("/daily", response_model=DailyScreenTimeSummary)
async def get_daily_summary(
    date_str: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        target_date = dt_date.fromisoformat(date_str) if date_str else dt_date.today()
    except ValueError:
        target_date = dt_date.today()

    return await ScreenTimeService.get_daily_summary(db, current_user.id, target_date)


@router.get("/weekly", response_model=WeeklyScreenTimeSummary)
async def get_weekly_summary(
    end_date_str: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        end_date = dt_date.fromisoformat(end_date_str) if end_date_str else dt_date.today()
    except ValueError:
        end_date = dt_date.today()

    return await ScreenTimeService.get_weekly_summary(db, current_user.id, end_date)


@router.post("/sync", response_model=ScreenTimeSyncResponse)
async def sync_companion_sessions(
    data: ScreenTimeSyncRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await ScreenTimeService.sync_device_sessions(db, current_user.id, data.items)
    return ScreenTimeSyncResponse(
        status="success",
        synced_count=count,
        message=f"Successfully synchronized {count} application usage entries.",
    )


# Screenshot Import Endpoints
@router.post("/upload-screenshot", response_model=ScreenTimeImportReviewResponse)
async def upload_screenshot_import(
    file: UploadFile = File(...),
    target_date: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only valid image files (PNG, JPG, WebP) are supported for screenshot imports.",
        )

    t_date = None
    if target_date:
        try:
            t_date = dt_date.fromisoformat(target_date)
        except ValueError:
            pass

    content = await file.read()
    return await ScreenTimeOcrService.process_screenshot_upload(
        db, current_user.id, content, file.filename or "screenshot.jpg", t_date
    )


@router.post("/imports/{import_id}/confirm", response_model=ScreenTimeImportReviewResponse)
async def confirm_screenshot_import(
    import_id: uuid.UUID,
    data: ScreenTimeImportConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ScreenTimeOcrService.confirm_screen_time_import(
        db, current_user.id, import_id, data
    )


@router.get("/imports", response_model=list[ScreenTimeImportHistoryItem])
async def get_import_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ScreenTimeOcrService.get_import_history(db, current_user.id)


@router.get("/images/{filename}")
async def get_screenshot_image(filename: str):
    clean_name = os.path.basename(filename)
    file_path = os.path.join(settings.UPLOAD_DIR, clean_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Screenshot not found")
    return FileResponse(file_path)

