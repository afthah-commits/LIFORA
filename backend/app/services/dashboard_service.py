import uuid
from datetime import date as dt_date
from decimal import Decimal
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.models.custom_module import CustomModule, CustomModuleRecord
from backend.app.models.dashboard import DashboardConfig
from backend.app.models.finance import ExpenseEntry, IncomeEntry
from backend.app.models.food import FoodEntry
from backend.app.models.planner import WeeklyPlan, WeeklyPlanItem
from backend.app.models.screentime import ScreenTimeGoal, ScreenTimeSession
from backend.app.models.user import User, UserGoal, UserProfile
from backend.app.models.water import WaterEntry, WaterGoal
from backend.app.models.weight import WeightEntry
from backend.app.schemas.dashboard import (
    CustomWidget,
    DashboardConfigResponse,
    DashboardConfigUpdate,
    DashboardOverviewResponse,
    PrimaryCard,
    PrimaryCardStat,
    QuickAction,
)


class DashboardService:
    @staticmethod
    async def get_or_create_config(db: AsyncSession, user_id: uuid.UUID) -> DashboardConfig:
        query = select(DashboardConfig).where(DashboardConfig.user_id == user_id)
        result = await db.execute(query)
        cfg = result.scalar_one_or_none()
        if not cfg:
            cfg = DashboardConfig(
                user_id=user_id,
                layout_config={
                    "visible_cards": ["fitness", "screentime", "money", "planner"],
                    "card_order": ["fitness", "screentime", "money", "planner"],
                    "custom_widgets": [],
                },
            )
            db.add(cfg)
            await db.commit()
            await db.refresh(cfg)
        return cfg

    @staticmethod
    async def update_config(
        db: AsyncSession, user_id: uuid.UUID, data: DashboardConfigUpdate
    ) -> DashboardConfig:
        cfg = await DashboardService.get_or_create_config(db, user_id)
        cfg.layout_config = data.layout_config
        await db.commit()
        await db.refresh(cfg)
        return cfg

    @classmethod
    async def get_overview(
        cls, db: AsyncSession, user_id: uuid.UUID, today: dt_date | None = None
    ) -> DashboardOverviewResponse:
        if today is None:
            today = dt_date.today()

        config = await cls.get_or_create_config(db, user_id)
        layout = config.layout_config or {}

        # 1. FITNESS DATA
        # Weight
        wt_q = (
            select(WeightEntry)
            .where(WeightEntry.user_id == user_id)
            .order_by(WeightEntry.date.desc())
            .limit(1)
        )
        wt_res = await db.execute(wt_q)
        latest_wt = wt_res.scalar_one_or_none()

        prof_q = select(UserProfile).where(UserProfile.user_id == user_id)
        prof_res = await db.execute(prof_q)
        profile = prof_res.scalar_one_or_none()

        curr_weight = latest_wt.weight_kg if latest_wt else (profile.current_weight_kg if profile else 53.0)

        goals_q = select(UserGoal).where(UserGoal.user_id == user_id)
        goals_res = await db.execute(goals_q)
        goals = goals_res.scalar_one_or_none()
        target_weight = goals.target_weight_kg if goals else 60.0
        protein_target = goals.daily_protein_target_g if goals else 85.0

        # Today's Protein
        food_q = (
            select(FoodEntry)
            .where(FoodEntry.user_id == user_id, FoodEntry.date == today)
            .options(selectinload(FoodEntry.items))
        )
        food_res = await db.execute(food_q)
        food_entries = list(food_res.scalars().all())
        today_protein = 0.0
        for entry in food_entries:
            for item in entry.items:
                today_protein += float(item.protein_g or 0.0)
        today_protein = round(today_protein, 1)
        protein_pct = min(100.0, round(today_protein / protein_target * 100, 1)) if protein_target > 0 else 0.0

        fitness_card = PrimaryCard(
            id="fitness",
            title="Fitness",
            icon="Flame",
            stats=[
                PrimaryCardStat(
                    label="Current Weight",
                    value=f"{curr_weight} kg",
                    subtext=f"Target: {target_weight} kg",
                ),
                PrimaryCardStat(
                    label="Protein Today",
                    value=f"{today_protein}g",
                    subtext=f"Goal: {protein_target}g",
                    progress=protein_pct,
                ),
            ],
            link="/nutrition",
            badge=f"{protein_pct}% Goal",
        )

        # 2. SCREEN TIME DATA
        st_goal_q = select(ScreenTimeGoal).where(ScreenTimeGoal.user_id == user_id)
        st_goal_res = await db.execute(st_goal_q)
        st_goal = st_goal_res.scalar_one_or_none()
        st_limit = st_goal.daily_target_minutes if st_goal else 240

        st_q = (
            select(ScreenTimeSession)
            .where(ScreenTimeSession.user_id == user_id, ScreenTimeSession.date == today)
            .order_by(ScreenTimeSession.duration_minutes.desc())
        )
        st_res = await db.execute(st_q)
        st_sessions = list(st_res.scalars().all())
        st_total = sum(s.duration_minutes for s in st_sessions)

        st_hours = st_total // 60
        st_mins = st_total % 60
        limit_hours = st_limit // 60
        limit_mins = st_limit % 60
        st_pct = min(100.0, round(st_total / st_limit * 100, 1)) if st_limit > 0 else 0.0
        top_app = st_sessions[0].app_name if st_sessions else "None"

        screentime_card = PrimaryCard(
            id="screentime",
            title="Screen Time",
            icon="Smartphone",
            stats=[
                PrimaryCardStat(
                    label="Today's Usage",
                    value=f"{st_hours}h {st_mins}m",
                    subtext=f"Limit: {limit_hours}h {limit_mins}m",
                    progress=st_pct,
                ),
                PrimaryCardStat(
                    label="Most Used App",
                    value=top_app,
                    subtext=f"{st_sessions[0].duration_minutes}m used" if st_sessions else "No logs today",
                ),
            ],
            link="/screen-time",
            badge="Over Limit!" if st_total > st_limit else f"{st_limit - st_total}m left",
        )

        # 3. MONEY DATA (Current Month in ₹)
        month_start = dt_date(today.year, today.month, 1)
        next_month = 1 if today.month == 12 else today.month + 1
        next_year = today.year + 1 if today.month == 12 else today.year
        month_end = dt_date(next_year, next_month, 1)

        inc_q = select(func.coalesce(func.sum(IncomeEntry.amount), Decimal("0.00"))).where(
            IncomeEntry.user_id == user_id,
            IncomeEntry.date >= month_start,
            IncomeEntry.date < month_end,
        )
        inc_res = await db.execute(inc_q)
        month_income = inc_res.scalar_one() or Decimal("0.00")

        exp_q = select(func.coalesce(func.sum(ExpenseEntry.amount), Decimal("0.00"))).where(
            ExpenseEntry.user_id == user_id,
            ExpenseEntry.date >= month_start,
            ExpenseEntry.date < month_end,
        )
        exp_res = await db.execute(exp_q)
        month_expense = exp_res.scalar_one() or Decimal("0.00")
        month_net = month_income - month_expense

        money_card = PrimaryCard(
            id="money",
            title="Money & Salary",
            icon="IndianRupee",
            stats=[
                PrimaryCardStat(
                    label="Month Income",
                    value=f"₹{month_income:,.0f}",
                    subtext=f"Net: ₹{month_net:,.0f}",
                ),
                PrimaryCardStat(
                    label="Month Expenses",
                    value=f"₹{month_expense:,.0f}",
                    subtext="Actual recorded",
                ),
            ],
            link="/finance",
            badge=f"₹{month_net:,.0f} Saved" if month_net >= 0 else "Negative Net",
        )

        # 4. DAILY PLANNER DATA
        plan_q = (
            select(WeeklyPlanItem)
            .join(WeeklyPlan)
            .where(WeeklyPlan.user_id == user_id, WeeklyPlanItem.planned_date == today)
        )
        plan_res = await db.execute(plan_q)
        today_tasks = list(plan_res.scalars().all())
        total_tasks = len(today_tasks)
        completed_tasks = sum(1 for t in today_tasks if t.is_completed)
        plan_pct = round(completed_tasks / total_tasks * 100, 1) if total_tasks > 0 else 0.0

        planner_card = PrimaryCard(
            id="planner",
            title="Daily Planner",
            icon="CalendarCheck2",
            stats=[
                PrimaryCardStat(
                    label="Today's Tasks",
                    value=f"{completed_tasks} / {total_tasks} done",
                    subtext=f"{total_tasks - completed_tasks} remaining",
                    progress=plan_pct,
                ),
                PrimaryCardStat(
                    label="Completion Rate",
                    value=f"{plan_pct}%",
                    subtext="Schedule on track",
                ),
            ],
            link="/planner",
            badge=f"{completed_tasks}/{total_tasks} Done",
        )

        # 5. WATER TRACKER DATA
        water_q = select(WaterEntry).where(
            WaterEntry.user_id == user_id, WaterEntry.date == today
        )
        water_res = await db.execute(water_q)
        water_entries = list(water_res.scalars().all())
        water_consumed = sum(e.amount_ml for e in water_entries)

        water_goal_q = select(WaterGoal).where(WaterGoal.user_id == user_id)
        water_goal_res = await db.execute(water_goal_q)
        w_goal = water_goal_res.scalar_one_or_none()
        water_target = w_goal.daily_target_ml if w_goal else 2500
        water_rem = max(0, water_target - water_consumed)
        water_pct = (
            min(100.0, round((water_consumed / water_target) * 100, 1))
            if water_target > 0
            else 0.0
        )

        water_card = PrimaryCard(
            id="water",
            title="Water Tracker",
            icon="Droplets",
            stats=[
                PrimaryCardStat(
                    label="Water Consumed",
                    value=f"{water_consumed} ml",
                    subtext=f"Target: {water_target} ml",
                    progress=water_pct,
                ),
                PrimaryCardStat(
                    label="Remaining",
                    value=f"{water_rem} ml",
                    subtext=f"{len(water_entries)} entries logged",
                ),
            ],
            link="/water",
            badge=f"{water_pct}% Goal",
        )

        # Build Primary Cards according to ordering
        all_cards = {
            "fitness": fitness_card,
            "screentime": screentime_card,
            "money": money_card,
            "planner": planner_card,
            "water": water_card,
        }
        card_order = layout.get("card_order", ["fitness", "screentime", "money", "planner"])
        visible_keys = set(layout.get("visible_cards", ["fitness", "screentime", "money", "planner"]))

        ordered_cards = []
        for k in card_order:
            if k in all_cards and k in visible_keys:
                ordered_cards.append(all_cards[k])

        # Quick Actions
        quick_actions = [
            QuickAction(id="add_water", label="Add Water", icon="Droplets", action_type="modal", target="water"),
            QuickAction(id="add_food", label="Add Food", icon="UtensilsCrossed", action_type="modal", target="food"),
            QuickAction(id="add_expense", label="Add Expense", icon="IndianRupee", action_type="modal", target="expense"),
            QuickAction(id="add_workout", label="Add Workout", icon="Dumbbell", action_type="modal", target="workout"),
            QuickAction(id="add_weight", label="Add Weight", icon="Scale", action_type="modal", target="weight"),
            QuickAction(id="add_income", label="Add Income", icon="TrendingUp", action_type="modal", target="income"),
            QuickAction(id="add_screentime", label="Add Screen Time", icon="Smartphone", action_type="modal", target="screentime"),
        ]

        # Custom Widgets
        mod_q = (
            select(CustomModule)
            .where(
                CustomModule.user_id == user_id,
                CustomModule.is_active.is_(True),
                CustomModule.show_in_dashboard.is_(True),
            )
            .order_by(CustomModule.display_order)
        )
        mod_res = await db.execute(mod_q)
        custom_mods = list(mod_res.scalars().all())

        custom_widgets: list[CustomWidget] = []
        for cm in custom_mods:
            cnt_q = select(func.count(CustomModuleRecord.id)).where(
                CustomModuleRecord.module_id == cm.id
            )
            cnt_res = await db.execute(cnt_q)
            cnt = cnt_res.scalar_one() or 0

            latest_rec_q = (
                select(CustomModuleRecord)
                .where(CustomModuleRecord.module_id == cm.id)
                .order_by(CustomModuleRecord.created_at.desc())
                .limit(1)
            )
            rec_res = await db.execute(latest_rec_q)
            latest_rec = rec_res.scalar_one_or_none()

            custom_widgets.append(
                CustomWidget(
                    id=f"widget_{cm.slug}",
                    module_id=str(cm.id),
                    module_name=cm.name,
                    icon=cm.icon,
                    color=cm.color,
                    records_count=cnt,
                    recent_entry=latest_rec.data if latest_rec else None,
                    link=f"/modules/{cm.slug}",
                )
            )

        return DashboardOverviewResponse(
            primary_cards=ordered_cards,
            quick_actions=quick_actions,
            custom_widgets=custom_widgets,
            recent_activities=[],
            layout_config=layout,
        )
