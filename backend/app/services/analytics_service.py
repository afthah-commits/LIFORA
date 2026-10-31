import uuid
from datetime import date, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.activity import ActivitySession
from backend.app.models.food import FoodEntry
from backend.app.models.user import UserGoal
from backend.app.models.water import WaterEntry, WaterGoal
from backend.app.models.weight import WeightEntry
from backend.app.models.workout import WorkoutSession
from backend.app.schemas.analytics import (
    ActivityDataPoint,
    AnalyticsOverview,
    NutritionDataPoint,
    WeightDataPoint,
)
from backend.app.services.activity_service import calculate_pace_str


class AnalyticsService:
    @staticmethod
    async def get_overview(session: AsyncSession, user_id: uuid.UUID, days: int = 30) -> AnalyticsOverview:
        end_date = date.today()
        start_date = end_date - timedelta(days=days - 1)

        # 1. User Goals
        g_q = select(UserGoal).where(UserGoal.user_id == user_id)
        g_res = await session.execute(g_q)
        goal = g_res.scalar_one_or_none()
        protein_target = goal.daily_protein_target_g if goal else 85.0
        target_weight = goal.target_weight_kg if goal else 60.0

        # 2. Food Entries in range
        f_q = select(FoodEntry).where(
            FoodEntry.user_id == user_id,
            FoodEntry.date >= start_date,
            FoodEntry.date <= end_date
        )
        f_res = await session.execute(f_q)
        food_entries = list(f_res.scalars().all())

        # Aggregate daily nutrition
        daily_nutrition: dict[date, dict[str, float]] = {}
        for entry in food_entries:
            if entry.date not in daily_nutrition:
                daily_nutrition[entry.date] = {"calories": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0}
            for item in entry.items:
                daily_nutrition[entry.date]["calories"] += item.calories
                daily_nutrition[entry.date]["protein_g"] += item.protein_g
                daily_nutrition[entry.date]["carbs_g"] += item.carbs_g
                daily_nutrition[entry.date]["fat_g"] += item.fat_g

        # 3. Activity Sessions in range
        act_q = select(ActivitySession).where(
            ActivitySession.user_id == user_id,
            ActivitySession.date >= start_date,
            ActivitySession.date <= end_date
        )
        act_res = await session.execute(act_q)
        activities = list(act_res.scalars().all())

        daily_activities: dict[date, dict[str, Any]] = {}
        total_running_km = 0.0
        total_running_sessions = 0
        total_running_mins = 0
        total_football_mins = 0
        total_football_sessions = 0

        for act in activities:
            d = act.date
            if d not in daily_activities:
                daily_activities[d] = {
                    "running_km": 0.0,
                    "running_min": 0,
                    "football_min": 0,
                    "workout_min": 0,
                    "workout_count": 0
                }
            if act.activity_type == "running":
                dist = act.distance_km or 0.0
                daily_activities[d]["running_km"] += dist
                daily_activities[d]["running_min"] += act.duration_minutes
                total_running_km += dist
                total_running_sessions += 1
                total_running_mins += act.duration_minutes
            elif act.activity_type == "football":
                daily_activities[d]["football_min"] += act.duration_minutes
                total_football_mins += act.duration_minutes
                total_football_sessions += 1

        # 4. Workouts in range
        wo_q = select(WorkoutSession).where(
            WorkoutSession.user_id == user_id,
            WorkoutSession.date >= start_date,
            WorkoutSession.date <= end_date
        )
        wo_res = await session.execute(wo_q)
        workouts = list(wo_res.scalars().all())

        total_workout_sessions = len(workouts)
        total_workout_duration = sum(w.duration_minutes for w in workouts)

        for w in workouts:
            d = w.date
            if d not in daily_activities:
                daily_activities[d] = {
                    "running_km": 0.0,
                    "running_min": 0,
                    "football_min": 0,
                    "workout_min": 0,
                    "workout_count": 0
                }
            daily_activities[d]["workout_min"] += w.duration_minutes
            daily_activities[d]["workout_count"] += 1

        # 5. Weight Entries in range
        w_q = select(WeightEntry).where(
            WeightEntry.user_id == user_id,
            WeightEntry.date >= start_date,
            WeightEntry.date <= end_date
        ).order_by(WeightEntry.date.asc())
        w_res = await session.execute(w_q)
        weight_entries = list(w_res.scalars().all())
        weight_by_date = {we.date: we.weight_kg for we in weight_entries}

        # Water in range
        wg_q = select(WaterGoal).where(WaterGoal.user_id == user_id)
        wg_res = await session.execute(wg_q)
        w_goal = wg_res.scalar_one_or_none()
        water_target_ml = w_goal.daily_target_ml if w_goal else 2500

        wt_q = select(WaterEntry).where(
            WaterEntry.user_id == user_id,
            WaterEntry.date >= start_date,
            WaterEntry.date <= end_date,
        )
        wt_res = await session.execute(wt_q)
        water_entries = list(wt_res.scalars().all())
        daily_water: dict[date, int] = {}
        for we in water_entries:
            daily_water[we.date] = daily_water.get(we.date, 0) + we.amount_ml

        # Build chronological trend time series, accurately separating missing from 0
        nutrition_trend: list[NutritionDataPoint] = []
        activity_trend: list[ActivityDataPoint] = []
        weight_trend: list[WeightDataPoint] = []
        water_trend: list[dict[str, Any]] = []

        cur_date = start_date
        while cur_date <= end_date:
            # Nutrition
            if cur_date in daily_nutrition:
                n_data = daily_nutrition[cur_date]
                nutrition_trend.append(NutritionDataPoint(
                    date=cur_date,
                    calories=round(n_data["calories"], 1),
                    protein_g=round(n_data["protein_g"], 1),
                    carbs_g=round(n_data["carbs_g"], 1),
                    fat_g=round(n_data["fat_g"], 1),
                    has_data=True
                ))
            else:
                # Missing data is None, not 0!
                nutrition_trend.append(NutritionDataPoint(
                    date=cur_date,
                    calories=None,
                    protein_g=None,
                    carbs_g=None,
                    fat_g=None,
                    has_data=False
                ))

            # Activity
            if cur_date in daily_activities:
                a_data = daily_activities[cur_date]
                has_act = (a_data["running_km"] > 0 or a_data["football_min"] > 0 or a_data["workout_count"] > 0)
                activity_trend.append(ActivityDataPoint(
                    date=cur_date,
                    running_distance_km=round(a_data["running_km"], 2) if a_data["running_km"] > 0 else None,
                    running_duration_min=a_data["running_min"] if a_data["running_min"] > 0 else None,
                    football_duration_min=a_data["football_min"] if a_data["football_min"] > 0 else None,
                    workout_duration_min=a_data["workout_min"] if a_data["workout_min"] > 0 else None,
                    workout_sessions_count=a_data["workout_count"],
                    has_activity=has_act
                ))
            else:
                activity_trend.append(ActivityDataPoint(
                    date=cur_date,
                    running_distance_km=None,
                    running_duration_min=None,
                    football_duration_min=None,
                    workout_duration_min=None,
                    workout_sessions_count=0,
                    has_activity=False
                ))

            # Weight
            if cur_date in weight_by_date:
                weight_trend.append(WeightDataPoint(
                    date=cur_date,
                    weight_kg=weight_by_date[cur_date],
                    has_data=True
                ))
            else:
                weight_trend.append(WeightDataPoint(
                    date=cur_date,
                    weight_kg=None,
                    has_data=False
                ))

            # Water
            consumed_today = daily_water.get(cur_date, 0)
            water_trend.append({
                "date": cur_date.isoformat(),
                "consumed_ml": consumed_today,
                "target_ml": water_target_ml,
                "is_goal_met": consumed_today >= water_target_ml,
            })

            cur_date += timedelta(days=1)

        # Calculate averages ONLY over days with recorded data!
        recorded_nutr_days = len(daily_nutrition)
        if recorded_nutr_days > 0:
            avg_cals = round(sum(d["calories"] for d in daily_nutrition.values()) / recorded_nutr_days, 1)
            avg_prot = round(sum(d["protein_g"] for d in daily_nutrition.values()) / recorded_nutr_days, 1)
            avg_carbs = round(sum(d["carbs_g"] for d in daily_nutrition.values()) / recorded_nutr_days, 1)
            avg_fat = round(sum(d["fat_g"] for d in daily_nutrition.values()) / recorded_nutr_days, 1)
            protein_met_days = sum(1 for d in daily_nutrition.values() if d["protein_g"] >= protein_target)
            protein_completion_rate = round((protein_met_days / recorded_nutr_days) * 100, 1)
        else:
            avg_cals = None
            avg_prot = None
            avg_carbs = None
            avg_fat = None
            protein_met_days = 0
            protein_completion_rate = 0.0

        # Weight progression
        recorded_weights = len(weight_entries)
        start_w = weight_entries[0].weight_kg if recorded_weights > 0 else None
        latest_w = weight_entries[-1].weight_kg if recorded_weights > 0 else None
        weight_diff = round(latest_w - start_w, 2) if (start_w and latest_w) else None

        avg_pace = calculate_pace_str(total_running_km, total_running_mins) if (total_running_km > 0 and total_running_mins > 0) else None

        # Water progression
        total_water_consumed = sum(daily_water.values())
        recorded_water_days = len(daily_water)
        water_avg_ml = round(total_water_consumed / recorded_water_days) if recorded_water_days > 0 else 0
        water_goal_days = sum(1 for v in daily_water.values() if v >= water_target_ml)

        period_label = f"{days}d"
        return AnalyticsOverview(
            period=period_label,
            start_date=start_date,
            end_date=end_date,
            total_days_in_period=days,
            nutrition_days_recorded=recorded_nutr_days,
            average_calories=avg_cals,
            average_protein_g=avg_prot,
            average_carbs_g=avg_carbs,
            average_fat_g=avg_fat,
            protein_target_g=protein_target,
            protein_goal_met_days=protein_met_days,
            protein_goal_completion_rate=protein_completion_rate,
            total_running_distance_km=round(total_running_km, 2),
            total_running_sessions=total_running_sessions,
            average_running_pace=avg_pace,
            total_football_duration_min=total_football_mins,
            total_football_sessions=total_football_sessions,
            total_workout_sessions=total_workout_sessions,
            total_workout_duration_min=total_workout_duration,
            weight_days_recorded=recorded_weights,
            start_weight_kg=start_w,
            latest_weight_kg=latest_w,
            weight_change_kg=weight_diff,
            target_weight_kg=target_weight,
            water_total_consumed_ml=total_water_consumed,
            water_daily_average_ml=water_avg_ml,
            water_target_ml=water_target_ml,
            water_goal_met_days=water_goal_days,
            water_trend=water_trend,
            nutrition_trend=nutrition_trend,
            activity_trend=activity_trend,
            weight_trend=weight_trend
        )
