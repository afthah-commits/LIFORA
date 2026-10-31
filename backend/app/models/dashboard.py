import uuid
from typing import Any
from sqlalchemy import ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base
from backend.app.models.base import GUID, TimestampMixin


class DashboardConfig(Base, TimestampMixin):
    __tablename__ = "dashboard_configs"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    # Store visible cards, ordering, custom widgets, sizes
    layout_config: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        default=lambda: {
            "visible_cards": ["fitness", "screentime", "money", "planner"],
            "card_order": ["fitness", "screentime", "money", "planner"],
            "custom_widgets": [],
        },
        nullable=False,
    )

    user = relationship("User", back_populates="dashboard_config")
