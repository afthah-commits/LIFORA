import uuid
from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.planner import WeeklyPlan, WeeklyPlanItem
from backend.app.schemas.planner import (
    WeeklyPlanItemCreate,
    WeeklyPlanItemResponse,
    WeeklyPlanItemUpdate,
    WeeklyPlanResponse,
)


def get_monday(d: date) -> date:
    """Get the Monday of the week containing date d."""
    return d - timedelta(days=d.weekday())

class PlannerService:
    @staticmethod
    async def get_or_create_weekly_plan(session: AsyncSession, user_id: uuid.UUID, week_date: date) -> WeeklyPlanResponse:
        monday = get_monday(week_date)
        query = select(WeeklyPlan).where(
            WeeklyPlan.user_id == user_id,
            WeeklyPlan.week_start_date == monday
        )
        res = await session.execute(query)
        plan = res.scalar_one_or_none()

        if not plan:
            # Create a default plan for the week
            plan = WeeklyPlan(
                user_id=user_id,
                week_start_date=monday,
                notes="Weekly Fitness Schedule"
            )
            session.add(plan)
            await session.flush()

            # Default routine: alternating strength, running, football, rest
            default_schedule = [
                (0, "strength", 60, "Upper Body & Dumbbells"),
                (1, "running", 40, "5 km Pace Run"),
                (2, "football", 90, "Football Evening Session"),
                (3, "strength", 60, "Lower Body & Core"),
                (4, "rest", 0, "Active Recovery & Mobility"),
                (5, "running", 45, "5 km Endurance Run"),
                (6, "football", 90, "Weekend Match"),
            ]
            for day_offset, act_type, dur, note in default_schedule:
                item_date = monday + timedelta(days=day_offset)
                item = WeeklyPlanItem(
                    plan_id=plan.id,
                    planned_date=item_date,
                    activity_type=act_type,
                    duration_minutes=dur if dur > 0 else None,
                    notes=note,
                    is_completed=False,
                    replaced_by_football=False
                )
                session.add(item)
            await session.flush()
            await session.refresh(plan)

        return WeeklyPlanResponse.model_validate(plan)

    @staticmethod
    async def add_or_update_plan_item(session: AsyncSession, user_id: uuid.UUID, plan_id: uuid.UUID, data: WeeklyPlanItemCreate) -> WeeklyPlanItemResponse:
        # Verify plan ownership
        p_q = select(WeeklyPlan).where(WeeklyPlan.id == plan_id, WeeklyPlan.user_id == user_id)
        p_res = await session.execute(p_q)
        plan = p_res.scalar_one_or_none()
        if not plan:
            raise HTTPException(status_code=404, detail="Weekly plan not found")

        item = WeeklyPlanItem(
            plan_id=plan.id,
            planned_date=data.planned_date,
            activity_type=data.activity_type,
            duration_minutes=data.duration_minutes,
            notes=data.notes,
            is_completed=data.is_completed,
            replaced_by_football=data.replaced_by_football
        )
        session.add(item)
        await session.flush()
        return WeeklyPlanItemResponse.model_validate(item)

    @staticmethod
    async def update_item(session: AsyncSession, user_id: uuid.UUID, item_id: uuid.UUID, update_data: WeeklyPlanItemUpdate) -> WeeklyPlanItemResponse:
        query = select(WeeklyPlanItem).join(WeeklyPlan).where(
            WeeklyPlanItem.id == item_id,
            WeeklyPlan.user_id == user_id
        )
        res = await session.execute(query)
        item = res.scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=404, detail="Plan item not found")

        data_dict = update_data.model_dump(exclude_unset=True)
        for key, val in data_dict.items():
            setattr(item, key, val)

        await session.flush()
        return WeeklyPlanItemResponse.model_validate(item)

    @staticmethod
    async def replace_running_with_football(session: AsyncSession, user_id: uuid.UUID, item_id: uuid.UUID, football_duration: int = 90) -> WeeklyPlanItemResponse:
        """Allow football sessions to replace planned running activities."""
        query = select(WeeklyPlanItem).join(WeeklyPlan).where(
            WeeklyPlanItem.id == item_id,
            WeeklyPlan.user_id == user_id
        )
        res = await session.execute(query)
        item = res.scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=404, detail="Plan item not found")

        item.activity_type = "football"
        item.duration_minutes = football_duration
        item.replaced_by_football = True
        item.is_completed = True
        item.notes = (item.notes or "") + " (Replaced planned running with football session)"
        await session.flush()
        return WeeklyPlanItemResponse.model_validate(item)

    @staticmethod
    async def delete_item(session: AsyncSession, user_id: uuid.UUID, item_id: uuid.UUID) -> bool:
        query = select(WeeklyPlanItem).join(WeeklyPlan).where(
            WeeklyPlanItem.id == item_id,
            WeeklyPlan.user_id == user_id
        )
        res = await session.execute(query)
        item = res.scalar_one_or_none()
        if not item:
            return False
        await session.delete(item)
        await session.flush()
        return True
