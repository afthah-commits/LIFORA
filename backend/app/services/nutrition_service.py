import uuid
from datetime import date

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.food import Food, FoodEntry, FoodEntryItem
from backend.app.models.user import UserGoal
from backend.app.schemas.food import (
    DailyMealSummary,
    DailyNutritionSummary,
    FoodCreate,
    FoodEntryCreate,
    FoodEntryResponse,
)

# Initial common whole foods & fitness foods
INITIAL_FOODS = [
    {"name": "Chicken Breast (Cooked)", "category": "Protein", "serving_size": 100.0, "serving_unit": "g", "calories": 165.0, "protein_g": 31.0, "carbs_g": 0.0, "fat_g": 3.6, "fiber_g": 0.0},
    {"name": "Whole Egg (Large)", "category": "Protein", "serving_size": 50.0, "serving_unit": "piece", "calories": 72.0, "protein_g": 6.3, "carbs_g": 0.4, "fat_g": 4.8, "fiber_g": 0.0},
    {"name": "Egg White", "category": "Protein", "serving_size": 33.0, "serving_unit": "piece", "calories": 17.0, "protein_g": 3.6, "carbs_g": 0.2, "fat_g": 0.1, "fiber_g": 0.0},
    {"name": "Rolled Oats", "category": "Carbs", "serving_size": 40.0, "serving_unit": "g", "calories": 150.0, "protein_g": 5.0, "carbs_g": 27.0, "fat_g": 2.5, "fiber_g": 4.0},
    {"name": "Whey Protein Isolate", "category": "Protein", "serving_size": 30.0, "serving_unit": "scoop", "calories": 120.0, "protein_g": 25.0, "carbs_g": 1.5, "fat_g": 1.0, "fiber_g": 0.0},
    {"name": "White Basmati Rice (Cooked)", "category": "Carbs", "serving_size": 100.0, "serving_unit": "g", "calories": 130.0, "protein_g": 2.7, "carbs_g": 28.0, "fat_g": 0.3, "fiber_g": 0.4},
    {"name": "Cow Milk (Whole)", "category": "Dairy", "serving_size": 250.0, "serving_unit": "ml", "calories": 150.0, "protein_g": 8.0, "carbs_g": 12.0, "fat_g": 8.0, "fiber_g": 0.0},
    {"name": "Peanut Butter (Natural)", "category": "Fats", "serving_size": 32.0, "serving_unit": "g", "calories": 190.0, "protein_g": 8.0, "carbs_g": 7.0, "fat_g": 16.0, "fiber_g": 2.0},
    {"name": "Salmon Fillet (Baked)", "category": "Protein", "serving_size": 100.0, "serving_unit": "g", "calories": 206.0, "protein_g": 22.0, "carbs_g": 0.0, "fat_g": 12.0, "fiber_g": 0.0},
    {"name": "Banana", "category": "Fruits", "serving_size": 118.0, "serving_unit": "medium", "calories": 105.0, "protein_g": 1.3, "carbs_g": 27.0, "fat_g": 0.3, "fiber_g": 3.1},
    {"name": "Greek Yogurt (0% Fat)", "category": "Dairy", "serving_size": 150.0, "serving_unit": "g", "calories": 90.0, "protein_g": 15.0, "carbs_g": 6.0, "fat_g": 0.0, "fiber_g": 0.0},
    {"name": "Paneer (Cottage Cheese)", "category": "Protein", "serving_size": 100.0, "serving_unit": "g", "calories": 265.0, "protein_g": 18.0, "carbs_g": 3.0, "fat_g": 20.0, "fiber_g": 0.0},
    {"name": "Tofu (Firm)", "category": "Protein", "serving_size": 100.0, "serving_unit": "g", "calories": 83.0, "protein_g": 10.0, "carbs_g": 2.0, "fat_g": 5.0, "fiber_g": 1.0},
    {"name": "Almonds", "category": "Snacks", "serving_size": 28.0, "serving_unit": "g", "calories": 160.0, "protein_g": 6.0, "carbs_g": 6.0, "fat_g": 14.0, "fiber_g": 3.5},
    {"name": "Steamed Broccoli", "category": "Vegetables", "serving_size": 100.0, "serving_unit": "g", "calories": 35.0, "protein_g": 2.4, "carbs_g": 7.0, "fat_g": 0.4, "fiber_g": 2.6},
    {"name": "Whole Wheat Bread", "category": "Carbs", "serving_size": 35.0, "serving_unit": "slice", "calories": 80.0, "protein_g": 4.0, "carbs_g": 14.0, "fat_g": 1.0, "fiber_g": 2.0},
    {"name": "Olive Oil (Extra Virgin)", "category": "Fats", "serving_size": 14.0, "serving_unit": "tbsp", "calories": 119.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 13.5, "fiber_g": 0.0},
    {"name": "Apple", "category": "Fruits", "serving_size": 150.0, "serving_unit": "medium", "calories": 95.0, "protein_g": 0.5, "carbs_g": 25.0, "fat_g": 0.3, "fiber_g": 4.4},
    {"name": "Boiled Chickpeas (Chana)", "category": "Protein", "serving_size": 100.0, "serving_unit": "g", "calories": 164.0, "protein_g": 8.9, "carbs_g": 27.4, "fat_g": 2.6, "fiber_g": 7.6},
    {"name": "Lentils Dal (Cooked)", "category": "Meals", "serving_size": 150.0, "serving_unit": "bowl", "calories": 170.0, "protein_g": 10.0, "carbs_g": 26.0, "fat_g": 3.0, "fiber_g": 6.0},
]

class NutritionService:
    @staticmethod
    async def seed_initial_foods(session: AsyncSession) -> None:
        """Seed default master foods if table is empty."""
        count_q = select(func.count(Food.id))
        count_res = await session.execute(count_q)
        if (count_res.scalar_one() or 0) == 0:
            for item in INITIAL_FOODS:
                food = Food(
                    name=item["name"],
                    category=item["category"],
                    serving_size=item["serving_size"],
                    serving_unit=item["serving_unit"],
                    calories=item["calories"],
                    protein_g=item["protein_g"],
                    carbs_g=item["carbs_g"],
                    fat_g=item["fat_g"],
                    fiber_g=item["fiber_g"],
                    is_custom=False
                )
                session.add(food)
            await session.flush()

    @staticmethod
    async def get_foods(session: AsyncSession, search: str | None = None, category: str | None = None, user_id: uuid.UUID | None = None) -> list[Food]:
        await NutritionService.seed_initial_foods(session)
        query = select(Food)
        conditions = []
        if search:
            conditions.append(Food.name.ilike(f"%{search.strip()}%"))
        if category and category != "All":
            conditions.append(Food.category == category)

        # Filter: master foods or custom foods created by user
        if user_id:
            conditions.append(or_(Food.is_custom == False, Food.created_by_id == user_id))
        else:
            conditions.append(Food.is_custom == False)

        if conditions:
            query = query.where(and_(*conditions))

        query = query.order_by(Food.name.asc())
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def create_custom_food(session: AsyncSession, user_id: uuid.UUID, data: FoodCreate) -> Food:
        food = Food(
            name=data.name.strip(),
            brand=data.brand.strip() if data.brand else None,
            category=data.category,
            serving_size=data.serving_size,
            serving_unit=data.serving_unit,
            calories=data.calories,
            protein_g=data.protein_g,
            carbs_g=data.carbs_g,
            fat_g=data.fat_g,
            fiber_g=data.fiber_g or 0.0,
            is_custom=True,
            created_by_id=user_id
        )
        session.add(food)
        await session.flush()
        return food

    @staticmethod
    async def create_food_entry(session: AsyncSession, user_id: uuid.UUID, data: FoodEntryCreate) -> FoodEntry:
        entry = FoodEntry(
            user_id=user_id,
            date=data.date,
            meal_type=data.meal_type,
            notes=data.notes
        )
        session.add(entry)
        await session.flush()

        for item_data in data.items:
            # Deterministic snapshot calculation
            cals = item_data.calories
            prot = item_data.protein_g
            carbs = item_data.carbs_g
            fat = item_data.fat_g
            fiber = item_data.fiber_g or 0.0

            # If values were not manually overridden, compute from master food if available
            if item_data.food_id and (cals is None or prot is None or carbs is None or fat is None):
                food_q = select(Food).where(Food.id == item_data.food_id)
                food_res = await session.execute(food_q)
                food = food_res.scalar_one_or_none()
                if food:
                    ratio = item_data.quantity / (food.serving_size if food.serving_size > 0 else 100.0)
                    cals = round(food.calories * ratio, 1)
                    prot = round(food.protein_g * ratio, 1)
                    carbs = round(food.carbs_g * ratio, 1)
                    fat = round(food.fat_g * ratio, 1)
                    fiber = round((food.fiber_g or 0.0) * ratio, 1)

            entry_item = FoodEntryItem(
                entry_id=entry.id,
                food_id=item_data.food_id,
                food_name=item_data.food_name,
                quantity=item_data.quantity,
                unit=item_data.unit,
                calories=cals or 0.0,
                protein_g=prot or 0.0,
                carbs_g=carbs or 0.0,
                fat_g=fat or 0.0,
                fiber_g=fiber or 0.0,
            )
            session.add(entry_item)

        await session.flush()
        await session.refresh(entry)
        return entry

    @staticmethod
    async def get_entries_by_date(session: AsyncSession, user_id: uuid.UUID, entry_date: date) -> list[FoodEntryResponse]:
        query = select(FoodEntry).where(
            FoodEntry.user_id == user_id,
            FoodEntry.date == entry_date
        ).order_by(FoodEntry.created_at.asc())
        result = await session.execute(query)
        entries = result.scalars().all()

        responses = []
        for e in entries:
            cals = sum(item.calories for item in e.items)
            prot = sum(item.protein_g for item in e.items)
            carbs = sum(item.carbs_g for item in e.items)
            fat = sum(item.fat_g for item in e.items)
            fib = sum(item.fiber_g or 0.0 for item in e.items)

            resp = FoodEntryResponse.model_validate(e)
            resp.total_calories = round(cals, 1)
            resp.total_protein_g = round(prot, 1)
            resp.total_carbs_g = round(carbs, 1)
            resp.total_fat_g = round(fat, 1)
            resp.total_fiber_g = round(fib, 1)
            responses.append(resp)

        return responses

    @staticmethod
    async def get_daily_summary(session: AsyncSession, user_id: uuid.UUID, target_date: date) -> DailyNutritionSummary:
        entries = await NutritionService.get_entries_by_date(session, user_id, target_date)

        # Get user goals
        goal_q = select(UserGoal).where(UserGoal.user_id == user_id)
        goal_res = await session.execute(goal_q)
        goal = goal_res.scalar_one_or_none()
        protein_target = goal.daily_protein_target_g if goal else 85.0
        calorie_target = goal.daily_calorie_target if goal else None

        tot_cals = round(sum(e.total_calories for e in entries), 1)
        tot_prot = round(sum(e.total_protein_g for e in entries), 1)
        tot_carbs = round(sum(e.total_carbs_g for e in entries), 1)
        tot_fat = round(sum(e.total_fat_g for e in entries), 1)
        tot_fiber = round(sum(e.total_fiber_g for e in entries), 1)

        # Meal breakdown
        meals_dict = {
            "Breakfast": {"calories": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0, "fiber_g": 0.0, "count": 0},
            "Morning Snack": {"calories": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0, "fiber_g": 0.0, "count": 0},
            "Lunch": {"calories": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0, "fiber_g": 0.0, "count": 0},
            "Evening Snack": {"calories": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0, "fiber_g": 0.0, "count": 0},
            "Dinner": {"calories": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0, "fiber_g": 0.0, "count": 0},
            "Other": {"calories": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0, "fiber_g": 0.0, "count": 0},
        }

        for e in entries:
            m_type = e.meal_type if e.meal_type in meals_dict else "Other"
            meals_dict[m_type]["calories"] += e.total_calories
            meals_dict[m_type]["protein_g"] += e.total_protein_g
            meals_dict[m_type]["carbs_g"] += e.total_carbs_g
            meals_dict[m_type]["fat_g"] += e.total_fat_g
            meals_dict[m_type]["fiber_g"] += e.total_fiber_g
            meals_dict[m_type]["count"] += 1

        meals_list = [
            DailyMealSummary(
                meal_type=m_name,
                calories=round(m_data["calories"], 1),
                protein_g=round(m_data["protein_g"], 1),
                carbs_g=round(m_data["carbs_g"], 1),
                fat_g=round(m_data["fat_g"], 1),
                fiber_g=round(m_data["fiber_g"], 1),
                entries_count=m_data["count"]
            )
            for m_name, m_data in meals_dict.items()
        ]

        protein_progress = min(round((tot_prot / protein_target) * 100, 1) if protein_target > 0 else 0.0, 999.0)
        calorie_progress = round((tot_cals / calorie_target) * 100, 1) if (calorie_target and calorie_target > 0) else None

        return DailyNutritionSummary(
            date=target_date,
            total_calories=tot_cals,
            total_protein_g=tot_prot,
            total_carbs_g=tot_carbs,
            total_fat_g=tot_fat,
            total_fiber_g=tot_fiber,
            protein_target_g=protein_target,
            calorie_target=calorie_target,
            protein_progress_percentage=protein_progress,
            calorie_progress_percentage=calorie_progress,
            meals=meals_list
        )

    @staticmethod
    async def delete_food_entry(session: AsyncSession, user_id: uuid.UUID, entry_id: uuid.UUID) -> bool:
        query = select(FoodEntry).where(FoodEntry.id == entry_id, FoodEntry.user_id == user_id)
        result = await session.execute(query)
        entry = result.scalar_one_or_none()
        if not entry:
            return False
        await session.delete(entry)
        await session.flush()
        return True
