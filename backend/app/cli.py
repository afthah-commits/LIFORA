import argparse
import asyncio
import getpass
from datetime import date

from sqlalchemy import select

from backend.app.core.database import AsyncSessionLocal
from backend.app.core.security import get_password_hash
from backend.app.models.user import User, UserGoal, UserProfile
from backend.app.models.weight import WeightEntry
from backend.app.services.nutrition_service import NutritionService
from backend.app.services.workout_service import WorkoutService


async def create_initial_user(email: str, password: str):
    email = email.strip().lower()
    async with AsyncSessionLocal() as session:
        # Check if user already exists
        query = select(User).where(User.email == email)
        result = await session.execute(query)
        existing = result.scalar_one_or_none()
        if existing:
            print(f"Error: User with email '{email}' already exists.")
            return

        # Create user
        user = User(
            email=email,
            hashed_password=get_password_hash(password),
            is_active=True,
            is_superuser=True
        )
        session.add(user)
        await session.flush()

        # Create initial profile with requested values:
        # Age: 19, Height: 167 cm, Current weight: 53 kg, Timezone: Asia/Kolkata, English
        profile = UserProfile(
            user_id=user.id,
            age=19,
            height_cm=167.0,
            current_weight_kg=53.0,
            timezone="Asia/Kolkata",
            preferred_language="English"
        )
        session.add(profile)

        # Create initial goals:
        # Target weight: 60 kg, Daily protein: 85 g, Running target: 5 km, Calorie target: None (configurable)
        goals = UserGoal(
            user_id=user.id,
            target_weight_kg=60.0,
            daily_protein_target_g=85.0,
            running_target_km=5.0,
            daily_calorie_target=None
        )
        session.add(goals)

        # Initial weight entry
        initial_weight = WeightEntry(
            user_id=user.id,
            date=date.today(),
            weight_kg=53.0,
            notes="Initial baseline weight log"
        )
        session.add(initial_weight)

        # Seed master foods & exercises
        await NutritionService.seed_initial_foods(session)
        await WorkoutService.seed_initial_exercises(session)

        await session.commit()
        print("\n" + "="*50)
        print(" SUCCESS: FITPULSE AI User Created Successfully!")
        print("="*50)
        print(f" Email:                   {email}")
        print(" Age:                     19")
        print(" Height:                  167 cm")
        print(" Baseline Weight:         53 kg")
        print(" Target Weight Goal:      60 kg")
        print(" Daily Protein Target:    85 g")
        print(" Running Target:          5 km")
        print(" Timezone:                Asia/Kolkata")
        print(" Master Foods Seeded:     Yes (20 common foods)")
        print(" Master Exercises Seeded: Yes (20 exercises across 4 categories)")
        print("="*50 + "\n")

def main():
    parser = argparse.ArgumentParser(description="FITPULSE AI Management CLI")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # create-user command
    create_parser = subparsers.add_parser("create-user", help="Create initial user account")
    create_parser.add_argument("--email", "-e", type=str, default="user@fitpulse.ai", help="User email address")
    create_parser.add_argument("--password", "-p", type=str, default="fitpulse123", help="User password")

    args = parser.parse_args()

    if args.command == "create-user":
        email = args.email
        password = args.password
        if not password:
            password = getpass.getpass("Enter password: ")
        asyncio.run(create_initial_user(email, password))
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
