import json
import uuid
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import JSONResponse
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.api.deps import get_current_user, get_db
from backend.app.models.custom_module import (
    CustomModule,
    CustomModuleField,
    CustomModuleRecord,
)
from backend.app.models.dashboard import DashboardConfig
from backend.app.models.finance import (
    Budget,
    ExpenseEntry,
    IncomeEntry,
    RecurringTransaction,
    SalaryRecord,
    SavingsGoal,
)
from backend.app.models.planner import WeeklyPlan, WeeklyPlanItem
from backend.app.models.screentime import (
    ScreenTimeGoal,
    ScreenTimeSession,
    TrackedApplication,
)
from backend.app.models.user import User, UserGoal, UserProfile
from backend.app.models.water import WaterEntry, WaterGoal
from backend.app.models.weight import WeightEntry

router = APIRouter()


def _json_serial(obj: Any) -> Any:
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, uuid.UUID):
        return str(obj)
    raise TypeError(f"Type {type(obj)} not serializable")


@router.get("/export")
async def export_backup(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Exports complete personal life data for the authenticated user as a single JSON file.
    Fully multi-user isolated: strictly exports records belonging to current_user.id.
    """
    user_id = current_user.id

    # 1. Profile & Goals
    prof_q = select(UserProfile).where(UserProfile.user_id == user_id)
    profile = (await db.execute(prof_q)).scalar_one_or_none()

    goal_q = select(UserGoal).where(UserGoal.user_id == user_id)
    goals = (await db.execute(goal_q)).scalar_one_or_none()

    # 2. Water
    water_goal_q = select(WaterGoal).where(WaterGoal.user_id == user_id)
    water_goal = (await db.execute(water_goal_q)).scalar_one_or_none()

    water_entries_q = select(WaterEntry).where(WaterEntry.user_id == user_id).order_by(WaterEntry.timestamp.desc())
    water_entries = (await db.execute(water_entries_q)).scalars().all()

    # 3. Weight
    weight_q = select(WeightEntry).where(WeightEntry.user_id == user_id).order_by(WeightEntry.date.desc())
    weight_entries = (await db.execute(weight_q)).scalars().all()

    # 4. Planner
    plans_q = (
        select(WeeklyPlan)
        .where(WeeklyPlan.user_id == user_id)
        .options(selectinload(WeeklyPlan.items))
        .order_by(WeeklyPlan.week_start_date.desc())
    )
    weekly_plans = (await db.execute(plans_q)).scalars().all()

    # 5. Screen Time
    st_goal_q = select(ScreenTimeGoal).where(ScreenTimeGoal.user_id == user_id)
    st_goal = (await db.execute(st_goal_q)).scalar_one_or_none()

    st_apps_q = select(TrackedApplication).where(TrackedApplication.user_id == user_id)
    st_apps = (await db.execute(st_apps_q)).scalars().all()

    st_sessions_q = select(ScreenTimeSession).where(ScreenTimeSession.user_id == user_id)
    st_sessions = (await db.execute(st_sessions_q)).scalars().all()

    # 6. Finance
    salary_q = select(SalaryRecord).where(SalaryRecord.user_id == user_id)
    salary_records = (await db.execute(salary_q)).scalars().all()

    income_q = select(IncomeEntry).where(IncomeEntry.user_id == user_id)
    income_entries = (await db.execute(income_q)).scalars().all()

    expense_q = select(ExpenseEntry).where(ExpenseEntry.user_id == user_id)
    expense_entries = (await db.execute(expense_q)).scalars().all()

    budgets_q = select(Budget).where(Budget.user_id == user_id)
    budgets = (await db.execute(budgets_q)).scalars().all()

    savings_q = select(SavingsGoal).where(SavingsGoal.user_id == user_id)
    savings_goals = (await db.execute(savings_q)).scalars().all()

    recurring_q = select(RecurringTransaction).where(RecurringTransaction.user_id == user_id)
    recurring_txs = (await db.execute(recurring_q)).scalars().all()

    # 7. Custom Modules & Records
    custom_mods_q = (
        select(CustomModule)
        .where(CustomModule.user_id == user_id)
        .options(selectinload(CustomModule.fields))
    )
    custom_modules = (await db.execute(custom_mods_q)).scalars().all()

    custom_records_q = select(CustomModuleRecord).where(CustomModuleRecord.user_id == user_id)
    custom_records = (await db.execute(custom_records_q)).scalars().all()

    # 8. Dashboard Config
    dash_q = select(DashboardConfig).where(DashboardConfig.user_id == user_id)
    dash_cfg = (await db.execute(dash_q)).scalar_one_or_none()

    backup_payload = {
        "metadata": {
            "app": "LIFORA",
            "version": "1.0",
            "tagline": "Your Life. Your Space. Your Rules.",
            "export_timestamp": datetime.now(timezone.utc).isoformat(),
            "user_email": current_user.email,
        },
        "profile": {
            "display_name": profile.display_name if profile else None,
            "age": profile.age if profile else 19,
            "height_cm": profile.height_cm if profile else 167.0,
            "current_weight_kg": profile.current_weight_kg if profile else 53.0,
            "timezone": profile.timezone if profile else "Asia/Kolkata",
            "preferred_language": profile.preferred_language if profile else "English",
        } if profile else None,
        "goals": {
            "target_weight_kg": goals.target_weight_kg if goals else 60.0,
            "daily_protein_target_g": goals.daily_protein_target_g if goals else 85.0,
            "running_target_km": goals.running_target_km if goals else 5.0,
            "daily_calorie_target": goals.daily_calorie_target if goals else None,
        } if goals else None,
        "water": {
            "goal_ml": water_goal.daily_goal_ml if water_goal else 2500,
            "entries": [
                {
                    "amount_ml": e.amount_ml,
                    "timestamp": e.timestamp.isoformat(),
                    "notes": e.notes,
                }
                for e in water_entries
            ],
        },
        "weight": [
            {"date": w.date.isoformat(), "weight_kg": w.weight_kg, "notes": w.notes}
            for w in weight_entries
        ],
        "planner": [
            {
                "week_start_date": p.week_start_date.isoformat(),
                "focus_notes": p.focus_notes,
                "items": [
                    {
                        "day_of_week": it.day_of_week,
                        "title": it.title,
                        "category": it.category,
                        "is_completed": it.is_completed,
                    }
                    for it in p.items
                ],
            }
            for p in weekly_plans
        ],
        "screen_time": {
            "goal_minutes": st_goal.daily_limit_minutes if st_goal else 180,
            "applications": [
                {"app_name": a.app_name, "category": a.category, "package_name": a.package_name}
                for a in st_apps
            ],
            "sessions": [
                {
                    "date": s.date.isoformat(),
                    "app_name": s.app_name,
                    "duration_minutes": s.duration_minutes,
                    "category": s.category,
                    "source": s.source,
                }
                for s in st_sessions
            ],
        },
        "finance": {
            "salary_records": [
                {
                    "month": s.month,
                    "amount": s.amount,
                    "base_salary": s.base_salary,
                    "bonus": s.bonus,
                    "deductions": s.deductions,
                    "notes": s.notes,
                }
                for s in salary_records
            ],
            "income_entries": [
                {
                    "date": i.date.isoformat(),
                    "amount": i.amount,
                    "source": i.source,
                    "category": i.category,
                    "notes": i.notes,
                }
                for i in income_entries
            ],
            "expense_entries": [
                {
                    "date": e.date.isoformat(),
                    "amount": e.amount,
                    "category": e.category.value if hasattr(e.category, "value") else str(e.category),
                    "description": e.description,
                    "payment_method": e.payment_method,
                }
                for e in expense_entries
            ],
            "budgets": [
                {
                    "category": b.category.value if hasattr(b.category, "value") else str(b.category),
                    "monthly_limit": b.monthly_limit,
                    "alert_threshold_percent": b.alert_threshold_percent,
                }
                for b in budgets
            ],
            "savings_goals": [
                {
                    "name": s.name,
                    "target_amount": s.target_amount,
                    "current_amount": s.current_amount,
                    "target_date": s.target_date.isoformat() if s.target_date else None,
                }
                for s in savings_goals
            ],
            "recurring_transactions": [
                {
                    "title": r.title,
                    "amount": r.amount,
                    "type": r.type,
                    "frequency": r.frequency,
                    "category": r.category,
                    "next_date": r.next_date.isoformat() if r.next_date else None,
                }
                for r in recurring_txs
            ],
        },
        "custom_modules": [
            {
                "id": str(m.id),
                "name": m.name,
                "description": m.description,
                "icon": m.icon,
                "category": m.category,
                "placements": m.placements or [],
                "is_active": m.is_active,
                "fields": [
                    {
                        "name": f.name,
                        "label": f.label,
                        "field_type": f.field_type.value if hasattr(f.field_type, "value") else str(f.field_type),
                        "is_required": f.is_required,
                        "options": f.options,
                        "default_value": f.default_value,
                        "order": f.order,
                    }
                    for f in m.fields
                ],
            }
            for m in custom_modules
        ],
        "custom_records": [
            {
                "module_id": str(r.module_id),
                "data": r.data,
                "created_at": r.created_at.isoformat() if hasattr(r, "created_at") and r.created_at else None,
            }
            for r in custom_records
        ],
        "dashboard_config": dash_cfg.config if dash_cfg else None,
    }

    return JSONResponse(
        content=backup_payload,
        headers={
            "Content-Disposition": f'attachment; filename="lifora_backup_{datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")}.json"'
        },
    )


@router.post("/validate")
async def validate_backup(
    backup_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
):
    """
    Validates backup structure and returns summary counts for user review before restore.
    """
    if not isinstance(backup_data, dict):
        raise HTTPException(status_code=400, detail="Invalid JSON format")

    meta = backup_data.get("metadata", {})
    if meta.get("app") != "LIFORA" and "FITPULSE" not in str(meta.get("app", "")):
        # Still permit legacy FITPULSE backups for backwards compatibility
        raise HTTPException(
            status_code=400,
            detail="Unsupported backup file. Please upload a valid LIFORA backup JSON.",
        )

    summary = {
        "valid": True,
        "app": meta.get("app", "LIFORA"),
        "version": meta.get("version", "1.0"),
        "exported_at": meta.get("export_timestamp"),
        "counts": {
            "water_entries": len(backup_data.get("water", {}).get("entries", [])),
            "weight_entries": len(backup_data.get("weight", [])),
            "weekly_plans": len(backup_data.get("planner", [])),
            "screen_time_sessions": len(backup_data.get("screen_time", {}).get("sessions", [])),
            "income_entries": len(backup_data.get("finance", {}).get("income_entries", [])),
            "expense_entries": len(backup_data.get("finance", {}).get("expense_entries", [])),
            "custom_modules": len(backup_data.get("custom_modules", [])),
            "custom_records": len(backup_data.get("custom_records", [])),
            "has_profile": backup_data.get("profile") is not None,
            "has_dashboard_config": backup_data.get("dashboard_config") is not None,
        },
    }
    return summary


@router.post("/restore")
async def restore_backup(
    backup_data: Dict[str, Any],
    mode: str = Query("merge", pattern="^(merge|overwrite)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Restores personal data from a validated LIFORA backup file.
    Always scopes records to current_user.id.
    Mode:
      - 'merge' (default): Adds new records and preserves existing records.
      - 'overwrite': Clears existing user entries before inserting backup data.
    """
    user_id = current_user.id
    if not isinstance(backup_data, dict):
        raise HTTPException(status_code=400, detail="Invalid backup payload")

    # 1. Update Profile if provided
    profile_data = backup_data.get("profile")
    if profile_data:
        prof_q = select(UserProfile).where(UserProfile.user_id == user_id)
        profile = (await db.execute(prof_q)).scalar_one_or_none()
        if not profile:
            profile = UserProfile(user_id=user_id)
            db.add(profile)
        if "display_name" in profile_data and profile_data["display_name"]:
            profile.display_name = profile_data["display_name"]
        if "age" in profile_data:
            profile.age = profile_data["age"]
        if "height_cm" in profile_data:
            profile.height_cm = profile_data["height_cm"]
        if "current_weight_kg" in profile_data:
            profile.current_weight_kg = profile_data["current_weight_kg"]
        if "timezone" in profile_data:
            profile.timezone = profile_data["timezone"]
        if "preferred_language" in profile_data:
            profile.preferred_language = profile_data["preferred_language"]

    # 2. Update Goals if provided
    goals_data = backup_data.get("goals")
    if goals_data:
        goal_q = select(UserGoal).where(UserGoal.user_id == user_id)
        goals = (await db.execute(goal_q)).scalar_one_or_none()
        if not goals:
            goals = UserGoal(user_id=user_id)
            db.add(goals)
        if "target_weight_kg" in goals_data:
            goals.target_weight_kg = goals_data["target_weight_kg"]
        if "daily_protein_target_g" in goals_data:
            goals.daily_protein_target_g = goals_data["daily_protein_target_g"]
        if "running_target_km" in goals_data:
            goals.running_target_km = goals_data["running_target_km"]
        if "daily_calorie_target" in goals_data:
            goals.daily_calorie_target = goals_data["daily_calorie_target"]

    # 3. Water Tracker
    water_data = backup_data.get("water", {})
    if "goal_ml" in water_data:
        wg_q = select(WaterGoal).where(WaterGoal.user_id == user_id)
        w_goal = (await db.execute(wg_q)).scalar_one_or_none()
        if not w_goal:
            w_goal = WaterGoal(user_id=user_id, daily_goal_ml=water_data["goal_ml"])
            db.add(w_goal)
        else:
            w_goal.daily_goal_ml = water_data["goal_ml"]

    if mode == "overwrite":
        await db.execute(delete(WaterEntry).where(WaterEntry.user_id == user_id))

    water_entries = water_data.get("entries", [])
    for we in water_entries:
        ts = datetime.fromisoformat(we["timestamp"]) if "timestamp" in we else datetime.now(timezone.utc)
        entry = WaterEntry(
            user_id=user_id,
            amount_ml=we.get("amount_ml", 250),
            timestamp=ts,
            notes=we.get("notes"),
        )
        db.add(entry)

    # 4. Weight
    if mode == "overwrite":
        await db.execute(delete(WeightEntry).where(WeightEntry.user_id == user_id))
    for we in backup_data.get("weight", []):
        d = date.fromisoformat(we["date"]) if "date" in we else date.today()
        db.add(WeightEntry(user_id=user_id, date=d, weight_kg=we.get("weight_kg", 60.0), notes=we.get("notes")))

    # 5. Finance
    finance_data = backup_data.get("finance", {})
    if mode == "overwrite":
        await db.execute(delete(IncomeEntry).where(IncomeEntry.user_id == user_id))
        await db.execute(delete(ExpenseEntry).where(ExpenseEntry.user_id == user_id))
        await db.execute(delete(Budget).where(Budget.user_id == user_id))
        await db.execute(delete(SavingsGoal).where(SavingsGoal.user_id == user_id))

    for inc in finance_data.get("income_entries", []):
        d = date.fromisoformat(inc["date"]) if "date" in inc else date.today()
        db.add(
            IncomeEntry(
                user_id=user_id,
                date=d,
                amount=inc.get("amount", 0.0),
                source=inc.get("source", "Income"),
                category=inc.get("category", "Salary"),
                notes=inc.get("notes"),
            )
        )

    for exp in finance_data.get("expense_entries", []):
        d = date.fromisoformat(exp["date"]) if "date" in exp else date.today()
        db.add(
            ExpenseEntry(
                user_id=user_id,
                date=d,
                amount=exp.get("amount", 0.0),
                category=exp.get("category", "General"),
                description=exp.get("description", "Expense"),
                payment_method=exp.get("payment_method", "Card"),
            )
        )

    # 6. Custom Modules & Records
    module_id_mapping = {}
    for m in backup_data.get("custom_modules", []):
        orig_id = m.get("id")
        existing_q = select(CustomModule).where(
            CustomModule.user_id == user_id, CustomModule.name == m.get("name")
        )
        existing_mod = (await db.execute(existing_q)).scalar_one_or_none()

        if not existing_mod:
            new_mod = CustomModule(
                user_id=user_id,
                name=m.get("name"),
                description=m.get("description"),
                icon=m.get("icon", "Folder"),
                category=m.get("category", "Custom"),
                placements=m.get("placements", ["dashboard", "sidebar"]),
                is_active=m.get("is_active", True),
            )
            db.add(new_mod)
            await db.flush()
            if orig_id:
                module_id_mapping[orig_id] = new_mod.id

            for f in m.get("fields", []):
                new_field = CustomModuleField(
                    module_id=new_mod.id,
                    name=f.get("name"),
                    label=f.get("label"),
                    field_type=f.get("field_type", "text"),
                    is_required=f.get("is_required", False),
                    options=f.get("options"),
                    default_value=f.get("default_value"),
                    order=f.get("order", 0),
                )
                db.add(new_field)
        else:
            if orig_id:
                module_id_mapping[orig_id] = existing_mod.id

    await db.flush()

    # Custom records
    for r in backup_data.get("custom_records", []):
        orig_mod_id = r.get("module_id")
        target_mod_id = module_id_mapping.get(orig_mod_id)
        if target_mod_id and r.get("data"):
            rec = CustomModuleRecord(
                user_id=user_id,
                module_id=target_mod_id,
                data=r.get("data", {}),
            )
            db.add(rec)

    # 7. Dashboard Config
    dash_config = backup_data.get("dashboard_config")
    if dash_config:
        dc_q = select(DashboardConfig).where(DashboardConfig.user_id == user_id)
        dc = (await db.execute(dc_q)).scalar_one_or_none()
        if not dc:
            dc = DashboardConfig(user_id=user_id, config=dash_config)
            db.add(dc)
        else:
            dc.config = dash_config

    await db.commit()

    return {
        "message": "Data restored successfully into LIFORA",
        "mode": mode,
        "restored": {
            "water_entries": len(water_entries),
            "custom_modules": len(backup_data.get("custom_modules", [])),
            "custom_records": len(backup_data.get("custom_records", [])),
        },
    }
