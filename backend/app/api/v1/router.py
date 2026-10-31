from fastapi import APIRouter

from backend.app.api.v1.endpoints import (
    activities,
    ai_assistant,
    analytics,
    auth,
    backup,
    custom_modules,
    dashboard,
    exercises,
    finance,
    food_ai,
    food_entries,
    foods,
    goals,
    nutrition,
    planner,
    profile,
    reports,
    screentime,
    water,
    weight,
    workouts,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(profile.router, prefix="/profile", tags=["User Profile"])
api_router.include_router(goals.router, prefix="/goals", tags=["User Goals"])
api_router.include_router(foods.router, prefix="/foods", tags=["Foods"])
api_router.include_router(food_entries.router, prefix="/food-entries", tags=["Food Entries"])
api_router.include_router(nutrition.router, prefix="/nutrition", tags=["Nutrition"])
api_router.include_router(food_ai.router, prefix="/food-ai", tags=["Food Image AI"])
api_router.include_router(exercises.router, prefix="/exercises", tags=["Exercises"])
api_router.include_router(workouts.router, prefix="/workouts", tags=["Workouts"])
api_router.include_router(activities.router, prefix="/activities", tags=["Activities"])
api_router.include_router(weight.router, prefix="/weight", tags=["Weight"])
api_router.include_router(planner.router, prefix="/planner", tags=["Weekly Planner"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports & Export"])
api_router.include_router(ai_assistant.router, prefix="/ai", tags=["AI Fitness Assistant"])

# V2 Routers
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(screentime.router, prefix="/screen-time", tags=["Screen Time"])
api_router.include_router(finance.router, prefix="/finance", tags=["Finance & Salary"])
api_router.include_router(custom_modules.router, prefix="/custom-modules", tags=["Custom Modules"])
api_router.include_router(water.router, prefix="/water", tags=["Water Tracker"])
api_router.include_router(backup.router, prefix="/backup", tags=["Backup & Restore"])

