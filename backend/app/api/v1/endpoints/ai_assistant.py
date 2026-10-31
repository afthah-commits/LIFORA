import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user, get_db
from backend.app.models.ai import AiConversation
from backend.app.models.user import User
from backend.app.schemas.ai import (
    AiConversationResponse,
    AiMessageCreate,
    AiStatusResponse,
)
from backend.app.services.ai_service import AiService

router = APIRouter()

@router.get("/status", response_model=AiStatusResponse)
async def get_ai_status(current_user: User = Depends(get_current_user)):
    return AiService.get_status()

@router.get("/conversations", response_model=list[AiConversationResponse])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(AiConversation).where(
        AiConversation.user_id == current_user.id
    ).order_by(AiConversation.updated_at.desc())
    res = await db.execute(query)
    convs = list(res.scalars().all())
    return [AiConversationResponse.model_validate(c) for c in convs]

@router.get("/conversations/{conv_id}", response_model=AiConversationResponse)
async def get_conversation(
    conv_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(AiConversation).where(
        AiConversation.id == conv_id,
        AiConversation.user_id == current_user.id
    )
    res = await db.execute(query)
    conv = res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return AiConversationResponse.model_validate(conv)

@router.post("/chat", response_model=AiConversationResponse)
async def chat_with_assistant(
    data: AiMessageCreate,
    conversation_id: uuid.UUID | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    conv, _ = await AiService.process_assistant_message(
        session=db,
        user_id=current_user.id,
        user_text=data.content,
        conversation_id=conversation_id
    )
    return AiConversationResponse.model_validate(conv)
