import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class AiMessageCreate(BaseModel):
    content: str

class AiMessageResponse(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    metadata_json: dict[str, Any] | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AiConversationResponse(BaseModel):
    id: uuid.UUID
    title: str
    messages: list[AiMessageResponse] = []
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AiStatusResponse(BaseModel):
    is_configured: bool
    provider: str
    model: str
    message: str
