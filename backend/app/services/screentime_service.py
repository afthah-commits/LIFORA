import uuid
from datetime import date as dt_date, timedelta
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.screentime import (
    ScreenTimeGoal,
    ScreenTimeSession,
    TrackedApplication,
)
from backend.app.schemas.screentime import (
    DailyScreenTimeSummary,
    MostUsedApp,
    ScreenTimeGoalCreate,
    ScreenTimeGoalUpdate,
    ScreenTimeSessionCreate,
    ScreenTimeSessionResponse,
    ScreenTimeSessionUpdate,
    ScreenTimeSyncItem,
    TrackedApplicationCreate,
    TrackedApplicationUpdate,
    WeeklyScreenTimeSummary,
)


class ScreenTimeService:
    # Goals
    @staticmethod
    async def get_or_create_goal(db: AsyncSession, user_id: uuid.UUID) -> ScreenTimeGoal:
        query = select(ScreenTimeGoal).where(ScreenTimeGoal.user_id == user_id)
        result = await db.execute(query)
        goal = result.scalar_one_or_none()
        if not goal:
            goal = ScreenTimeGoal(user_id=user_id, daily_target_minutes=240)  # Default 4 hours
            db.add(goal)
            await db.commit()
            await db.refresh(goal)
        return goal

    @staticmethod
    async def update_goal(
        db: AsyncSession, user_id: uuid.UUID, data: ScreenTimeGoalUpdate
    ) -> ScreenTimeGoal:
        goal = await ScreenTimeService.get_or_create_goal(db, user_id)
        if data.daily_target_minutes is not None:
            goal.daily_target_minutes = data.daily_target_minutes
        if data.notes is not None:
            goal.notes = data.notes
        await db.commit()
        await db.refresh(goal)
        return goal

    # Sessions
    @staticmethod
    async def create_session(
        db: AsyncSession, user_id: uuid.UUID, data: ScreenTimeSessionCreate
    ) -> ScreenTimeSession:
        session = ScreenTimeSession(
            user_id=user_id,
            date=data.date,
            app_name=data.app_name.strip(),
            package_name=data.package_name,
            category=data.category or "Other",
            duration_minutes=data.duration_minutes,
            notes=data.notes,
            is_synced=data.is_synced,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return session

    @staticmethod
    async def update_session(
        db: AsyncSession, session: ScreenTimeSession, data: ScreenTimeSessionUpdate
    ) -> ScreenTimeSession:
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(session, k, v)
        await db.commit()
        await db.refresh(session)
        return session

    @staticmethod
    async def delete_session(db: AsyncSession, session: ScreenTimeSession) -> None:
        await db.delete(session)
        await db.commit()

    @staticmethod
    async def get_session_by_id(
        db: AsyncSession, session_id: uuid.UUID, user_id: uuid.UUID
    ) -> ScreenTimeSession | None:
        query = select(ScreenTimeSession).where(
            ScreenTimeSession.id == session_id, ScreenTimeSession.user_id == user_id
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    # Android Companion Sync
    @staticmethod
    async def sync_device_sessions(
        db: AsyncSession, user_id: uuid.UUID, items: list[ScreenTimeSyncItem]
    ) -> int:
        synced_count = 0
        for item in items:
            # Check if an entry for this app on this date already exists
            query = select(ScreenTimeSession).where(
                ScreenTimeSession.user_id == user_id,
                ScreenTimeSession.date == item.date,
                ScreenTimeSession.app_name == item.app_name,
            )
            result = await db.execute(query)
            existing = result.scalar_one_or_none()

            if existing:
                existing.duration_minutes = item.duration_minutes
                existing.category = item.category
                existing.package_name = item.package_name or existing.package_name
                existing.is_synced = True
            else:
                session = ScreenTimeSession(
                    user_id=user_id,
                    date=item.date,
                    app_name=item.app_name,
                    package_name=item.package_name,
                    category=item.category,
                    duration_minutes=item.duration_minutes,
                    is_synced=True,
                )
                db.add(session)
            synced_count += 1

        await db.commit()
        return synced_count

    # Daily Summary
    @classmethod
    async def get_daily_summary(
        cls, db: AsyncSession, user_id: uuid.UUID, target_date: dt_date
    ) -> DailyScreenTimeSummary:
        goal = await cls.get_or_create_goal(db, user_id)
        query = (
            select(ScreenTimeSession)
            .where(
                ScreenTimeSession.user_id == user_id,
                ScreenTimeSession.date == target_date,
            )
            .order_by(ScreenTimeSession.duration_minutes.desc())
        )
        result = await db.execute(query)
        sessions = list(result.scalars().all())

        total_minutes = sum(s.duration_minutes for s in sessions)
        target_minutes = goal.daily_target_minutes
        remaining = max(0, target_minutes - total_minutes)
        is_over = total_minutes > target_minutes

        cat_breakdown: dict[str, int] = {}
        for s in sessions:
            cat_breakdown[s.category] = cat_breakdown.get(s.category, 0) + s.duration_minutes

        most_used = None
        if sessions:
            top = sessions[0]
            pct = (top.duration_minutes / total_minutes * 100) if total_minutes > 0 else 0.0
            most_used = MostUsedApp(
                app_name=top.app_name,
                category=top.category,
                duration_minutes=top.duration_minutes,
                percentage_of_total=round(pct, 1),
            )

        return DailyScreenTimeSummary(
            date=target_date,
            total_duration_minutes=total_minutes,
            daily_target_minutes=target_minutes,
            remaining_allowed_minutes=remaining,
            is_over_limit=is_over,
            most_used_app=most_used,
            category_breakdown=cat_breakdown,
            sessions=[ScreenTimeSessionResponse.model_validate(s) for s in sessions],
        )

    # Weekly & Monthly Analytics
    @classmethod
    async def get_weekly_summary(
        cls, db: AsyncSession, user_id: uuid.UUID, end_date: dt_date
    ) -> WeeklyScreenTimeSummary:
        start_date = end_date - timedelta(days=6)
        goal = await cls.get_or_create_goal(db, user_id)

        query = select(ScreenTimeSession).where(
            ScreenTimeSession.user_id == user_id,
            ScreenTimeSession.date >= start_date,
            ScreenTimeSession.date <= end_date,
        )
        result = await db.execute(query)
        sessions = list(result.scalars().all())

        total_minutes = sum(s.duration_minutes for s in sessions)
        avg_minutes = int(total_minutes / 7)

        app_durations: dict[str, tuple[str, int]] = {}
        cat_breakdown: dict[str, int] = {}

        for s in sessions:
            cat_breakdown[s.category] = cat_breakdown.get(s.category, 0) + s.duration_minutes
            curr_cat, curr_dur = app_durations.get(s.app_name, (s.category, 0))
            app_durations[s.app_name] = (curr_cat, curr_dur + s.duration_minutes)

        top_apps: list[MostUsedApp] = []
        sorted_apps = sorted(app_durations.items(), key=lambda x: x[1][1], reverse=True)[:5]
        for app_name, (cat, dur) in sorted_apps:
            pct = (dur / total_minutes * 100) if total_minutes > 0 else 0.0
            top_apps.append(
                MostUsedApp(
                    app_name=app_name,
                    category=cat,
                    duration_minutes=dur,
                    percentage_of_total=round(pct, 1),
                )
            )

        return WeeklyScreenTimeSummary(
            start_date=start_date,
            end_date=end_date,
            daily_average_minutes=avg_minutes,
            total_minutes=total_minutes,
            daily_target_minutes=goal.daily_target_minutes,
            top_apps=top_apps,
            category_breakdown=cat_breakdown,
        )
