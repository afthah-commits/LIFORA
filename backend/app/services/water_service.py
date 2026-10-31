import uuid
from calendar import monthrange
from datetime import date as dt_date
from datetime import datetime, timedelta
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.water import WaterEntry, WaterGoal
from backend.app.schemas.water import (
    DailyWaterSummary,
    MonthlyWaterSummary,
    WaterEntryCreate,
    WaterEntryResponse,
    WaterEntryUpdate,
    WaterGoalResponse,
    WaterGoalUpdate,
    WeeklyWaterDayPoint,
    WeeklyWaterSummary,
)


class WaterService:
    @staticmethod
    async def get_or_create_goal(db: AsyncSession, user_id: uuid.UUID) -> WaterGoal:
        query = select(WaterGoal).where(WaterGoal.user_id == user_id)
        result = await db.execute(query)
        goal = result.scalar_one_or_none()
        if not goal:
            goal = WaterGoal(
                user_id=user_id,
                daily_target_ml=2500,
                reminder_enabled=True,
                reminder_interval_hours=2,
            )
            db.add(goal)
            await db.commit()
            await db.refresh(goal)
        return goal

    @staticmethod
    async def update_goal(
        db: AsyncSession, user_id: uuid.UUID, data: WaterGoalUpdate
    ) -> WaterGoal:
        goal = await WaterService.get_or_create_goal(db, user_id)
        if data.daily_target_ml is not None:
            goal.daily_target_ml = data.daily_target_ml
        if data.reminder_enabled is not None:
            goal.reminder_enabled = data.reminder_enabled
        if data.reminder_interval_hours is not None:
            goal.reminder_interval_hours = data.reminder_interval_hours
        if data.notes is not None:
            goal.notes = data.notes

        await db.commit()
        await db.refresh(goal)
        return goal

    @staticmethod
    async def log_entry(
        db: AsyncSession, user_id: uuid.UUID, data: WaterEntryCreate
    ) -> WaterEntry:
        target_date = data.date or dt_date.today()
        target_time = data.time or datetime.now().strftime("%H:%M")

        entry = WaterEntry(
            user_id=user_id,
            date=target_date,
            time=target_time,
            amount_ml=data.amount_ml,
            notes=data.notes,
        )
        db.add(entry)
        await db.commit()
        await db.refresh(entry)
        return entry

    @staticmethod
    async def update_entry(
        db: AsyncSession, user_id: uuid.UUID, entry_id: uuid.UUID, data: WaterEntryUpdate
    ) -> WaterEntry | None:
        query = select(WaterEntry).where(
            WaterEntry.id == entry_id, WaterEntry.user_id == user_id
        )
        result = await db.execute(query)
        entry = result.scalar_one_or_none()
        if not entry:
            return None

        if data.amount_ml is not None:
            entry.amount_ml = data.amount_ml
        if data.date is not None:
            entry.date = data.date
        if data.time is not None:
            entry.time = data.time
        if data.notes is not None:
            entry.notes = data.notes

        await db.commit()
        await db.refresh(entry)
        return entry

    @staticmethod
    async def delete_entry(
        db: AsyncSession, user_id: uuid.UUID, entry_id: uuid.UUID
    ) -> bool:
        query = select(WaterEntry).where(
            WaterEntry.id == entry_id, WaterEntry.user_id == user_id
        )
        result = await db.execute(query)
        entry = result.scalar_one_or_none()
        if not entry:
            return False

        await db.delete(entry)
        await db.commit()
        return True

    @staticmethod
    async def get_daily_summary(
        db: AsyncSession, user_id: uuid.UUID, target_date: dt_date
    ) -> DailyWaterSummary:
        goal = await WaterService.get_or_create_goal(db, user_id)

        query = (
            select(WaterEntry)
            .where(WaterEntry.user_id == user_id, WaterEntry.date == target_date)
            .order_by(WaterEntry.created_at.desc())
        )
        result = await db.execute(query)
        entries = list(result.scalars().all())

        total_consumed = sum(e.amount_ml for e in entries)
        remaining = max(0, goal.daily_target_ml - total_consumed)
        progress_pct = (
            min(100.0, round((total_consumed / goal.daily_target_ml) * 100, 1))
            if goal.daily_target_ml > 0
            else 0.0
        )

        return DailyWaterSummary(
            date=target_date,
            total_consumed_ml=total_consumed,
            daily_target_ml=goal.daily_target_ml,
            remaining_ml=remaining,
            progress_percentage=progress_pct,
            entries_count=len(entries),
            entries=[WaterEntryResponse.model_validate(e) for e in entries],
        )

    @staticmethod
    async def get_weekly_summary(
        db: AsyncSession, user_id: uuid.UUID, end_date: dt_date
    ) -> WeeklyWaterSummary:
        goal = await WaterService.get_or_create_goal(db, user_id)
        start_date = end_date - timedelta(days=6)

        query = (
            select(WaterEntry)
            .where(
                WaterEntry.user_id == user_id,
                WaterEntry.date >= start_date,
                WaterEntry.date <= end_date,
            )
            .order_by(WaterEntry.date.asc(), WaterEntry.time.asc())
        )
        result = await db.execute(query)
        entries = list(result.scalars().all())

        # Map entries to dates
        day_totals: dict[dt_date, int] = {}
        curr = start_date
        while curr <= end_date:
            day_totals[curr] = 0
            curr += timedelta(days=1)

        for e in entries:
            if e.date in day_totals:
                day_totals[e.date] += e.amount_ml

        daily_breakdown: list[WeeklyWaterDayPoint] = []
        days_met = 0
        total_consumed = 0

        for d_date, consumed in sorted(day_totals.items(), key=lambda x: x[0]):
            total_consumed += consumed
            is_met = consumed >= goal.daily_target_ml
            if is_met:
                days_met += 1
            daily_breakdown.append(
                WeeklyWaterDayPoint(
                    date=d_date.isoformat(),
                    day_name=d_date.strftime("%a"),
                    consumed_ml=consumed,
                    target_ml=goal.daily_target_ml,
                    is_goal_met=is_met,
                )
            )

        daily_avg = round(total_consumed / 7)

        return WeeklyWaterSummary(
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
            daily_average_ml=daily_avg,
            total_consumed_ml=total_consumed,
            daily_target_ml=goal.daily_target_ml,
            days_goal_met=days_met,
            daily_breakdown=daily_breakdown,
        )

    @staticmethod
    async def get_monthly_summary(
        db: AsyncSession, user_id: uuid.UUID, year: int, month: int
    ) -> MonthlyWaterSummary:
        goal = await WaterService.get_or_create_goal(db, user_id)
        _, num_days = monthrange(year, month)
        m_start = dt_date(year, month, 1)
        m_end = dt_date(year, month, num_days)

        query = select(WaterEntry).where(
            WaterEntry.user_id == user_id,
            WaterEntry.date >= m_start,
            WaterEntry.date <= m_end,
        )
        result = await db.execute(query)
        entries = list(result.scalars().all())

        day_totals: dict[dt_date, int] = {}
        for e in entries:
            day_totals[e.date] = day_totals.get(e.date, 0) + e.amount_ml

        total_consumed = sum(day_totals.values())
        days_recorded = len(day_totals)
        days_met = sum(1 for v in day_totals.values() if v >= goal.daily_target_ml)
        daily_avg = round(total_consumed / days_recorded) if days_recorded > 0 else 0
        completion_rate = (
            round((days_met / days_recorded) * 100, 1) if days_recorded > 0 else 0.0
        )

        return MonthlyWaterSummary(
            month=month,
            year=year,
            total_consumed_ml=total_consumed,
            daily_average_ml=daily_avg,
            daily_target_ml=goal.daily_target_ml,
            goal_completion_rate=completion_rate,
            days_recorded=days_recorded,
        )
