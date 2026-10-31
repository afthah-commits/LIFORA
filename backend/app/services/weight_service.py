import uuid
from datetime import date, timedelta

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.user import UserGoal, UserProfile
from backend.app.models.weight import WeightEntry
from backend.app.schemas.weight import (
    WeightEntryCreate,
    WeightEntryResponse,
    WeightSummary,
)


class WeightService:
    @staticmethod
    async def create_weight_entry(session: AsyncSession, user_id: uuid.UUID, data: WeightEntryCreate) -> WeightEntry:
        # Check if entry exists for this date
        query = select(WeightEntry).where(WeightEntry.user_id == user_id, WeightEntry.date == data.date)
        res = await session.execute(query)
        existing = res.scalar_one_or_none()

        if existing:
            existing.weight_kg = data.weight_kg
            existing.notes = data.notes
            entry = existing
        else:
            entry = WeightEntry(
                user_id=user_id,
                date=data.date,
                weight_kg=data.weight_kg,
                notes=data.notes
            )
            session.add(entry)

        await session.flush()

        # Check if this is the newest date; if so, update user profile current_weight_kg
        latest_q = select(WeightEntry).where(WeightEntry.user_id == user_id).order_by(desc(WeightEntry.date)).limit(1)
        latest_res = await session.execute(latest_q)
        latest_entry = latest_res.scalar_one_or_none()
        if latest_entry and latest_entry.id == entry.id:
            prof_q = select(UserProfile).where(UserProfile.user_id == user_id)
            prof_res = await session.execute(prof_q)
            profile = prof_res.scalar_one_or_none()
            if profile:
                profile.current_weight_kg = entry.weight_kg

        await session.flush()
        return entry

    @staticmethod
    async def get_weight_entries(session: AsyncSession, user_id: uuid.UUID, limit: int = 180) -> list[WeightEntry]:
        query = select(WeightEntry).where(WeightEntry.user_id == user_id).order_by(desc(WeightEntry.date)).limit(limit)
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def delete_weight_entry(session: AsyncSession, user_id: uuid.UUID, entry_id: uuid.UUID) -> bool:
        query = select(WeightEntry).where(WeightEntry.id == entry_id, WeightEntry.user_id == user_id)
        result = await session.execute(query)
        entry = result.scalar_one_or_none()
        if not entry:
            return False
        await session.delete(entry)
        await session.flush()
        return True

    @staticmethod
    async def get_weight_summary(session: AsyncSession, user_id: uuid.UUID) -> WeightSummary:
        # Get goals and profile
        prof_q = select(UserProfile).where(UserProfile.user_id == user_id)
        prof_res = await session.execute(prof_q)
        profile = prof_res.scalar_one_or_none()

        goal_q = select(UserGoal).where(UserGoal.user_id == user_id)
        goal_res = await session.execute(goal_q)
        goal = goal_res.scalar_one_or_none()

        target_weight = goal.target_weight_kg if goal else 60.0
        fallback_current = profile.current_weight_kg if profile else 53.0

        entries_q = select(WeightEntry).where(WeightEntry.user_id == user_id).order_by(desc(WeightEntry.date))
        res = await session.execute(entries_q)
        entries = list(res.scalars().all())

        total_count = len(entries)
        current_weight = entries[0].weight_kg if total_count > 0 else fallback_current
        diff = round(target_weight - current_weight, 1)

        # Weekly rolling average (last 7 days of entries)
        seven_days_ago = date.today() - timedelta(days=7)
        recent_week_entries = [e.weight_kg for e in entries if e.date >= seven_days_ago]
        weekly_avg = round(sum(recent_week_entries) / len(recent_week_entries), 1) if recent_week_entries else None

        # Monthly progress (compare current to entry ~30 days ago)
        thirty_days_ago = date.today() - timedelta(days=30)
        past_entries = [e for e in entries if e.date <= thirty_days_ago]
        monthly_change = round(current_weight - past_entries[0].weight_kg, 1) if past_entries else None

        history_resp = [WeightEntryResponse.model_validate(e) for e in reversed(entries[:30])]

        return WeightSummary(
            current_weight_kg=current_weight,
            target_weight_kg=target_weight,
            weight_difference_kg=diff,
            weekly_average_kg=weekly_avg,
            monthly_change_kg=monthly_change,
            total_entries_count=total_count,
            history=history_resp
        )
