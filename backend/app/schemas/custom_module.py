import uuid
from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field


VALID_FIELD_TYPES = {
    "text",
    "short_text",
    "long_text",
    "number",
    "decimal",
    "currency",
    "date",
    "datetime",
    "time",
    "boolean",
    "dropdown",
    "multi_select",
    "email",
    "url",
    "rating",
    "percentage",
}


# Custom Module Field
class CustomModuleFieldBase(BaseModel):
    field_label: str = Field(min_length=1, max_length=100)
    field_key: str | None = Field(default=None, max_length=100)
    field_type: str = Field(
        description="text, short_text, long_text, number, decimal, currency, date, datetime, time, boolean, dropdown, multi_select, email, url, rating, percentage"
    )
    placeholder: str | None = None
    is_required: bool = False
    default_value: str | None = None
    help_text: str | None = None
    options: list[str] | None = None
    validation_rules: dict[str, Any] | None = None
    display_order: int = 0
    is_visible_in_table: bool = True
    is_editable: bool = True


class CustomModuleFieldCreate(CustomModuleFieldBase):
    pass


class CustomModuleFieldUpdate(BaseModel):
    field_label: str | None = None
    placeholder: str | None = None
    is_required: bool | None = None
    default_value: str | None = None
    help_text: str | None = None
    options: list[str] | None = None
    validation_rules: dict[str, Any] | None = None
    display_order: int | None = None
    is_visible_in_table: bool | None = None
    is_editable: bool | None = None


class CustomModuleFieldResponse(CustomModuleFieldBase):
    id: uuid.UUID
    module_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Custom Module
class CustomModuleBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    slug: str | None = Field(default=None, max_length=120)
    description: str | None = None
    icon: str = Field(default="Box", max_length=60)
    color: str = Field(default="emerald", max_length=30)
    show_in_sidebar: bool = True
    show_in_dashboard: bool = True
    is_active: bool = True
    display_order: int = 0


class CustomModuleCreate(CustomModuleBase):
    fields: list[CustomModuleFieldCreate] = []


class CustomModuleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    icon: str | None = None
    color: str | None = None
    show_in_sidebar: bool | None = None
    show_in_dashboard: bool | None = None
    is_active: bool | None = None
    display_order: int | None = None


class CustomModuleResponse(CustomModuleBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    records_count: int = 0
    model_config = ConfigDict(from_attributes=True)


class CustomModuleDetailResponse(CustomModuleResponse):
    fields: list[CustomModuleFieldResponse] = []


# Custom Module Record
class CustomModuleRecordCreate(BaseModel):
    data: dict[str, Any] = Field(description="Dictionary of field_key -> value")


class CustomModuleRecordUpdate(BaseModel):
    data: dict[str, Any] = Field(description="Dictionary of field_key -> value")


class CustomModuleRecordResponse(BaseModel):
    id: uuid.UUID
    module_id: uuid.UUID
    user_id: uuid.UUID
    data: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class PaginatedRecordsResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    records: list[CustomModuleRecordResponse]
