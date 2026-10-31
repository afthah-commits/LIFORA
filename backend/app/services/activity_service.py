import uuid
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.activity import ActivitySession
from backend.app.schemas.activity import (
    ActivityCreate,
    FootballSummary,
    RunningSummary,
)


def calculate_pace_str(distance_km: float | None, duration_minutes: int) -> str | None:
    """Calculate running pace as 'M:SS /km'."""
    if not distance_km or distance_km <= 0 or duration_minutes <= 0:
        return None
    pace_dec = duration_minutes / distance_km
    mins = int(pace_dec)
    secs = int((pace_dec - mins) * 60)
    return f"{mins}:{secs:02d} /km"

class ActivityService:
    @staticmethod
    async def create_activity(session: AsyncSession, user_id: uuid.UUID, data: ActivityCreate) -> ActivitySession:
        pace = None
        if data.activity_type == "running" and data.distance_km and data.distance_km > 0:
            pace = calculate_pace_str(data.distance_km, data.duration_minutes)

        activity = ActivitySession(
            user_id=user_id,
            activity_type=data.activity_type.lower(),
            date=data.date,
            duration_minutes=data.duration_minutes,
            distance_km=data.distance_km if data.activity_type == "running" else None,
            calculated_pace=pace,
            effort_level=data.effort_level,
            intensity=data.intensity if data.activity_type == "football" else None,
            notes=data.notes
        )
        session.add(activity)
        await session.flush()
        return activity

    @staticmethod
    async def get_activities(session: AsyncSession, user_id: uuid.UUID, activity_type: str | None = None, limit: int = 100) -> list[ActivitySession]:
        query = select(ActivitySession).where(ActivitySession.user_id == user_id)
        if activity_type:
            query = query.where(ActivitySession.activity_type == activity_type.lower())
        query = query.order_by(ActivitySession.date.desc(), ActivitySession.created_at.desc()).limit(limit)
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def delete_activity(session: AsyncSession, user_id: uuid.UUID, activity_id: uuid.UUID) -> bool:
        query = select(ActivitySession).where(ActivitySession.id == activity_id, ActivitySession.user_id == user_id)
        result = await session.execute(query)
        act = result.scalar_one_or_none()
        if not act:
            return False
        await session.delete(act)
        await session.flush()
        return True

    @staticmethod
    async def get_running_summary(session: AsyncSession, user_id: uuid.UUID) -> RunningSummary:
        # All running sessions
        query = select(ActivitySession).where(
            ActivitySession.user_id == user_id,
            ActivitySession.activity_type == "running"
        )
        res = await session.execute(query)
        sessions = res.scalars().all()

        total_sessions = len(sessions)
        total_dist = sum(s.distance_km or 0.0 for s in sessions)
        total_duration = sum(s.duration_minutes for s in sessions)

        # Weekly distance (last 7 days)
        seven_days_ago = date.today() - timedelta(days=7)
        weekly_dist = sum(s.distance_km or 0.0 for s in sessions if s.date >= seven_days_ago)

        avg_dist = round(total_dist / total_sessions, 2) if total_sessions > 0 else 0.0
        avg_pace = calculate_pace_str(total_dist, total_duration) if (total_dist > 0 and total_duration > 0) else "--:--"

        return RunningSummary(
            total_distance_km=round(total_dist, 2),
            total_sessions=total_sessions,
            average_pace=avg_pace or "--:--",
            average_distance_km=avg_dist,
            weekly_distance_km=round(weekly_dist, 2)
        )

    @staticmethod
    async def get_football_summary(session: AsyncSession, user_id: uuid.UUID) -> FootballSummary:
        query = select(ActivitySession).where(
            ActivitySession.user_id == user_id,
            ActivitySession.activity_type == "football"
        )
        res = await session.execute(query)
        sessions = res.scalars().all()

        total_sessions = len(sessions)
        total_duration = sum(s.duration_minutes for s in sessions)

        seven_days_ago = date.today() - timedelta(days=7)
        weekly_sessions = [s for s in sessions if s.date >= seven_days_ago]
        weekly_dur = sum(s.duration_minutes for s in weekly_sessions)

        return FootballSummary(
            total_sessions=total_sessions,
            total_duration_minutes=total_duration,
            weekly_duration_minutes=weekly_dur,
            weekly_sessions=len(weekly_sessions)
        )
