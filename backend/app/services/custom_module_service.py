import re
import uuid
from typing import Any
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.models.custom_module import (
    CustomModule,
    CustomModuleField,
    CustomModuleRecord,
)
from backend.app.schemas.custom_module import (
    CustomModuleCreate,
    CustomModuleFieldCreate,
    CustomModuleFieldUpdate,
    CustomModuleRecordCreate,
    CustomModuleRecordUpdate,
    CustomModuleUpdate,
    VALID_FIELD_TYPES,
)


class CustomModuleService:
    @staticmethod
    def slugify(text: str) -> str:
        text = text.lower().strip()
        text = re.sub(r"[^\w\s-]", "", text)
        text = re.sub(r"[\s_-]+", "-", text)
        return re.sub(r"^-+|-+$", "", text) or f"module-{uuid.uuid4().hex[:6]}"

    @classmethod
    async def create_module(
        cls, db: AsyncSession, user_id: uuid.UUID, data: CustomModuleCreate
    ) -> CustomModule:
        slug = data.slug.strip() if data.slug else cls.slugify(data.name)
        # Ensure slug uniqueness for user
        existing = await db.execute(
            select(CustomModule).where(
                CustomModule.user_id == user_id, CustomModule.slug == slug
            )
        )
        if existing.scalar_one_or_none():
            slug = f"{slug}-{uuid.uuid4().hex[:4]}"

        module = CustomModule(
            user_id=user_id,
            name=data.name.strip(),
            slug=slug,
            description=data.description,
            icon=data.icon,
            color=data.color,
            show_in_sidebar=data.show_in_sidebar,
            show_in_dashboard=data.show_in_dashboard,
            is_active=data.is_active,
            display_order=data.display_order,
        )
        db.add(module)
        await db.flush()

        for idx, field_data in enumerate(data.fields):
            ft = field_data.field_type.lower()
            if ft not in VALID_FIELD_TYPES:
                ft = "text"
            f_key = re.sub(r"[^\w]", "_", field_data.field_key.lower().strip()) or f"field_{idx}"
            field = CustomModuleField(
                module_id=module.id,
                field_label=field_data.field_label.strip(),
                field_key=f_key,
                field_type=ft,
                placeholder=field_data.placeholder,
                is_required=field_data.is_required,
                default_value=field_data.default_value,
                help_text=field_data.help_text,
                options=field_data.options,
                validation_rules=field_data.validation_rules,
                display_order=field_data.display_order or idx,
                is_visible_in_table=field_data.is_visible_in_table,
                is_editable=field_data.is_editable,
            )
            db.add(field)

        await db.commit()
        refreshed = await db.execute(
            select(CustomModule)
            .where(CustomModule.id == module.id)
            .options(selectinload(CustomModule.fields))
        )
        module = refreshed.scalar_one()
        module.records_count = 0
        return module

    @staticmethod
    async def get_modules(db: AsyncSession, user_id: uuid.UUID) -> list[CustomModule]:
        query = (
            select(CustomModule)
            .where(CustomModule.user_id == user_id)
            .options(selectinload(CustomModule.fields))
            .order_by(CustomModule.display_order, CustomModule.created_at)
        )
        result = await db.execute(query)
        modules = list(result.scalars().all())

        # Annotate records count
        for mod in modules:
            count_res = await db.execute(
                select(func.count(CustomModuleRecord.id)).where(
                    CustomModuleRecord.module_id == mod.id
                )
            )
            mod.records_count = count_res.scalar_one() or 0

        return modules

    @staticmethod
    async def get_module_by_id_or_slug(
        db: AsyncSession, user_id: uuid.UUID, identifier: str
    ) -> CustomModule | None:
        try:
            mod_uuid = uuid.UUID(identifier)
            query = select(CustomModule).where(
                CustomModule.user_id == user_id, CustomModule.id == mod_uuid
            )
        except ValueError:
            query = select(CustomModule).where(
                CustomModule.user_id == user_id, CustomModule.slug == identifier
            )

        query = query.options(
            selectinload(CustomModule.fields),
        )
        result = await db.execute(query)
        module = result.scalar_one_or_none()
        if module:
            count_res = await db.execute(
                select(func.count(CustomModuleRecord.id)).where(
                    CustomModuleRecord.module_id == module.id
                )
            )
            module.records_count = count_res.scalar_one() or 0
        return module

    @staticmethod
    async def update_module(
        db: AsyncSession, module: CustomModule, data: CustomModuleUpdate
    ) -> CustomModule:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(module, field, value)
        await db.commit()
        refreshed = await db.execute(
            select(CustomModule)
            .where(CustomModule.id == module.id)
            .options(selectinload(CustomModule.fields))
        )
        return refreshed.scalar_one()

    @staticmethod
    async def delete_module(db: AsyncSession, module: CustomModule) -> None:
        await db.delete(module)
        await db.commit()

    # Fields
    @staticmethod
    async def add_field(
        db: AsyncSession, module: CustomModule, field_data: CustomModuleFieldCreate
    ) -> CustomModuleField:
        ft = field_data.field_type.lower()
        if ft == "short_text":
            ft = "text"
        elif ft not in VALID_FIELD_TYPES:
            ft = "text"

        key_source = field_data.field_key or field_data.field_label
        f_key = re.sub(r"[^\w]", "_", key_source.lower().strip())
        field = CustomModuleField(
            module_id=module.id,
            field_label=field_data.field_label.strip(),
            field_key=f_key,
            field_type=ft,
            placeholder=field_data.placeholder,
            is_required=field_data.is_required,
            default_value=field_data.default_value,
            help_text=field_data.help_text,
            options=field_data.options,
            validation_rules=field_data.validation_rules,
            display_order=field_data.display_order,
            is_visible_in_table=field_data.is_visible_in_table,
            is_editable=field_data.is_editable,
        )
        db.add(field)
        await db.commit()
        await db.refresh(field)
        return field

    @staticmethod
    async def update_field(
        db: AsyncSession, field: CustomModuleField, data: CustomModuleFieldUpdate
    ) -> CustomModuleField:
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(field, k, v)
        await db.commit()
        await db.refresh(field)
        return field

    @staticmethod
    async def delete_field(db: AsyncSession, field: CustomModuleField) -> None:
        await db.delete(field)
        await db.commit()

    # Records & Dynamic Validation
    @classmethod
    def validate_record_data(
        cls, fields: list[CustomModuleField], data: dict[str, Any]
    ) -> dict[str, Any]:
        validated: dict[str, Any] = {}
        fields_by_key = {f.field_key: f for f in fields}

        for f in fields:
            val = data.get(f.field_key)
            if f.is_required and (val is None or val == ""):
                raise ValueError(f"Field '{f.field_label}' is required.")

            if val is not None and val != "":
                # Type validation
                if f.field_type in ("number", "rating", "percentage"):
                    try:
                        val = int(val)
                    except (ValueError, TypeError):
                        raise ValueError(f"Field '{f.field_label}' must be an integer.")
                elif f.field_type in ("decimal", "currency"):
                    try:
                        val = float(val)
                    except (ValueError, TypeError):
                        raise ValueError(f"Field '{f.field_label}' must be a numeric decimal.")
                elif f.field_type == "boolean":
                    val = bool(val)
                elif f.field_type in ("dropdown",):
                    if f.options and str(val) not in f.options:
                        pass  # Allow flexibility or accept
                elif f.field_type == "multi_select":
                    if not isinstance(val, list):
                        val = [val]

            validated[f.field_key] = val

        # Retain any extra keys that might exist from previously defined fields safely
        for k, v in data.items():
            if k not in validated:
                validated[k] = v

        return validated

    @classmethod
    async def create_record(
        cls, db: AsyncSession, user_id: uuid.UUID, module: CustomModule, data: CustomModuleRecordCreate
    ) -> CustomModuleRecord:
        validated_data = cls.validate_record_data(module.fields, data.data)
        record = CustomModuleRecord(
            module_id=module.id,
            user_id=user_id,
            data=validated_data,
        )
        db.add(record)
        await db.commit()
        await db.refresh(record)
        return record

    @classmethod
    async def update_record(
        cls, db: AsyncSession, module: CustomModule, record: CustomModuleRecord, data: CustomModuleRecordUpdate
    ) -> CustomModuleRecord:
        # Merge existing data with update
        merged = dict(record.data)
        merged.update(data.data)
        validated_data = cls.validate_record_data(module.fields, merged)
        record.data = validated_data
        await db.commit()
        await db.refresh(record)
        return record

    @staticmethod
    async def delete_record(db: AsyncSession, record: CustomModuleRecord) -> None:
        await db.delete(record)
        await db.commit()

    @staticmethod
    async def get_records(
        db: AsyncSession,
        module_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
    ) -> tuple[list[CustomModuleRecord], int]:
        query = select(CustomModuleRecord).where(CustomModuleRecord.module_id == module_id)

        # Count total
        count_query = select(func.count(CustomModuleRecord.id)).where(
            CustomModuleRecord.module_id == module_id
        )
        total_res = await db.execute(count_query)
        total = total_res.scalar_one() or 0

        # Paginate
        offset = (page - 1) * page_size
        query = query.order_by(CustomModuleRecord.created_at.desc()).offset(offset).limit(page_size)
        result = await db.execute(query)
        records = list(result.scalars().all())

        return records, total
