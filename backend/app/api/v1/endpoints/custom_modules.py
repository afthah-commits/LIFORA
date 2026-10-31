import math
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user, get_db
from backend.app.models.custom_module import CustomModuleField, CustomModuleRecord
from backend.app.models.user import User
from backend.app.schemas.custom_module import (
    CustomModuleCreate,
    CustomModuleDetailResponse,
    CustomModuleFieldCreate,
    CustomModuleFieldResponse,
    CustomModuleFieldUpdate,
    CustomModuleRecordCreate,
    CustomModuleRecordResponse,
    CustomModuleRecordUpdate,
    CustomModuleResponse,
    CustomModuleUpdate,
    PaginatedRecordsResponse,
)
from backend.app.services.custom_module_service import CustomModuleService

router = APIRouter()


# Modules
@router.get("", response_model=list[CustomModuleResponse])
async def list_modules(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    modules = await CustomModuleService.get_modules(db, current_user.id)
    return [
        CustomModuleResponse(
            id=m.id,
            user_id=m.user_id,
            name=m.name,
            slug=m.slug,
            description=m.description,
            icon=m.icon,
            color=m.color,
            show_in_sidebar=m.show_in_sidebar,
            show_in_dashboard=m.show_in_dashboard,
            is_active=m.is_active,
            display_order=m.display_order,
            records_count=getattr(m, "records_count", 0),
            created_at=m.created_at,
            updated_at=m.updated_at,
        )
        for m in modules
    ]


@router.post("", response_model=CustomModuleDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_module(
    data: CustomModuleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    module = await CustomModuleService.create_module(db, current_user.id, data)
    return CustomModuleDetailResponse(
        id=module.id,
        user_id=module.user_id,
        name=module.name,
        slug=module.slug,
        description=module.description,
        icon=module.icon,
        color=module.color,
        show_in_sidebar=module.show_in_sidebar,
        show_in_dashboard=module.show_in_dashboard,
        is_active=module.is_active,
        display_order=module.display_order,
        records_count=0,
        fields=[CustomModuleFieldResponse.model_validate(f) for f in module.fields],
        created_at=module.created_at,
        updated_at=module.updated_at,
    )


@router.get("/{id_or_slug}", response_model=CustomModuleDetailResponse)
async def get_module(
    id_or_slug: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    module = await CustomModuleService.get_module_by_id_or_slug(db, current_user.id, id_or_slug)
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")
    return CustomModuleDetailResponse(
        id=module.id,
        user_id=module.user_id,
        name=module.name,
        slug=module.slug,
        description=module.description,
        icon=module.icon,
        color=module.color,
        show_in_sidebar=module.show_in_sidebar,
        show_in_dashboard=module.show_in_dashboard,
        is_active=module.is_active,
        display_order=module.display_order,
        records_count=getattr(module, "records_count", 0),
        fields=[CustomModuleFieldResponse.model_validate(f) for f in module.fields],
        created_at=module.created_at,
        updated_at=module.updated_at,
    )


@router.put("/{id_or_slug}", response_model=CustomModuleResponse)
async def update_module(
    id_or_slug: str,
    data: CustomModuleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    module = await CustomModuleService.get_module_by_id_or_slug(db, current_user.id, id_or_slug)
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")
    updated = await CustomModuleService.update_module(db, module, data)
    return CustomModuleResponse.model_validate(updated)


@router.delete("/{id_or_slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_module(
    id_or_slug: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    module = await CustomModuleService.get_module_by_id_or_slug(db, current_user.id, id_or_slug)
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")
    await CustomModuleService.delete_module(db, module)


# Dynamic Fields
@router.post("/{id_or_slug}/fields", response_model=CustomModuleFieldResponse, status_code=status.HTTP_201_CREATED)
async def add_field(
    id_or_slug: str,
    data: CustomModuleFieldCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    module = await CustomModuleService.get_module_by_id_or_slug(db, current_user.id, id_or_slug)
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")
    field = await CustomModuleService.add_field(db, module, data)
    return CustomModuleFieldResponse.model_validate(field)


@router.put("/fields/{field_id}", response_model=CustomModuleFieldResponse)
async def update_field(
    field_id: uuid.UUID,
    data: CustomModuleFieldUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(CustomModuleField).where(CustomModuleField.id == field_id)
    res = await db.execute(query)
    field = res.scalar_one_or_none()
    if not field:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field not found")
    updated = await CustomModuleService.update_field(db, field, data)
    return CustomModuleFieldResponse.model_validate(updated)


@router.delete("/fields/{field_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_field(
    field_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(CustomModuleField).where(CustomModuleField.id == field_id)
    res = await db.execute(query)
    field = res.scalar_one_or_none()
    if not field:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field not found")
    await CustomModuleService.delete_field(db, field)


# Records
@router.get("/{id_or_slug}/records", response_model=PaginatedRecordsResponse)
async def get_records(
    id_or_slug: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    module = await CustomModuleService.get_module_by_id_or_slug(db, current_user.id, id_or_slug)
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")
    records, total = await CustomModuleService.get_records(
        db, module.id, page=page, page_size=page_size, search=search
    )
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    return PaginatedRecordsResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        records=[CustomModuleRecordResponse.model_validate(r) for r in records],
    )


@router.post("/{id_or_slug}/records", response_model=CustomModuleRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_record(
    id_or_slug: str,
    data: CustomModuleRecordCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    module = await CustomModuleService.get_module_by_id_or_slug(db, current_user.id, id_or_slug)
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")
    try:
        record = await CustomModuleService.create_record(db, current_user.id, module, data)
        return CustomModuleRecordResponse.model_validate(record)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/records/{record_id}", response_model=CustomModuleRecordResponse)
async def update_record(
    record_id: uuid.UUID,
    data: CustomModuleRecordUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(CustomModuleRecord).where(
        CustomModuleRecord.id == record_id, CustomModuleRecord.user_id == current_user.id
    )
    res = await db.execute(query)
    record = res.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")

    module = await CustomModuleService.get_module_by_id_or_slug(db, current_user.id, str(record.module_id))
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")

    try:
        updated = await CustomModuleService.update_record(db, module, record, data)
        return CustomModuleRecordResponse.model_validate(updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_record(
    record_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(CustomModuleRecord).where(
        CustomModuleRecord.id == record_id, CustomModuleRecord.user_id == current_user.id
    )
    res = await db.execute(query)
    record = res.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    await CustomModuleService.delete_record(db, record)
