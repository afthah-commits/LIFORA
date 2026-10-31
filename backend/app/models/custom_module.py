import uuid
from typing import Any
from sqlalchemy import Boolean, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base
from backend.app.models.base import GUID, TimestampMixin


class CustomModule(Base, TimestampMixin):
    __tablename__ = "custom_modules"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str] = mapped_column(String(60), default="Box", nullable=False)
    color: Mapped[str] = mapped_column(String(30), default="emerald", nullable=False)
    show_in_sidebar: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    show_in_dashboard: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    user = relationship("User", back_populates="custom_modules")
    fields = relationship(
        "CustomModuleField",
        back_populates="module",
        cascade="all, delete-orphan",
        order_by="CustomModuleField.display_order",
    )
    records = relationship(
        "CustomModuleRecord",
        back_populates="module",
        cascade="all, delete-orphan",
    )


class CustomModuleField(Base, TimestampMixin):
    __tablename__ = "custom_module_fields"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    module_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("custom_modules.id", ondelete="CASCADE"), nullable=False, index=True
    )
    field_label: Mapped[str] = mapped_column(String(100), nullable=False)
    field_key: Mapped[str] = mapped_column(String(100), nullable=False)
    field_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # text, long_text, number, decimal, currency, date, datetime, time, boolean, dropdown, multi_select, email, url, rating, percentage
    placeholder: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    default_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    help_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    options: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    validation_rules: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_visible_in_table: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_editable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    module = relationship("CustomModule", back_populates="fields")


class CustomModuleRecord(Base, TimestampMixin):
    __tablename__ = "custom_module_records"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    module_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("custom_modules.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    data: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    module = relationship("CustomModule", back_populates="records")
    user = relationship("User", back_populates="custom_module_records")
