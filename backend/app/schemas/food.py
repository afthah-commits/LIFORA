import uuid
from datetime import date as dt_date
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# Food Master
class FoodBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    brand: str | None = None
    category: str = Field(default="Other") # Protein, Carbs, Fats, Vegetables, Fruits, Dairy, Snacks, Beverages, Meals, Other
    serving_size: float = Field(default=100.0, gt=0)
    serving_unit: str = Field(default="g")
    calories: float = Field(ge=0)
    protein_g: float = Field(ge=0)
    carbs_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)
    fiber_g: float | None = Field(default=0.0, ge=0)

class FoodCreate(FoodBase):
    pass

class FoodUpdate(BaseModel):
    name: str | None = None
    brand: str | None = None
    category: str | None = None
    serving_size: float | None = Field(default=None, gt=0)
    serving_unit: str | None = None
    calories: float | None = Field(default=None, ge=0)
    protein_g: float | None = Field(default=None, ge=0)
    carbs_g: float | None = Field(default=None, ge=0)
    fat_g: float | None = Field(default=None, ge=0)
    fiber_g: float | None = Field(default=None, ge=0)

class FoodResponse(FoodBase):
    id: uuid.UUID
    is_custom: bool
    created_by_id: uuid.UUID | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Food Entry Item
class FoodEntryItemCreate(BaseModel):
    food_id: uuid.UUID | None = None
    food_name: str
    quantity: float = Field(gt=0)
    unit: str = "g"
    # Optional manual override or calculated snapshot
    calories: float | None = None
    protein_g: float | None = None
    carbs_g: float | None = None
    fat_g: float | None = None
    fiber_g: float | None = 0.0

class FoodEntryItemResponse(BaseModel):
    id: uuid.UUID
    entry_id: uuid.UUID
    food_id: uuid.UUID | None = None
    food_name: str
    quantity: float
    unit: str
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float | None = 0.0
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Food Entry
class FoodEntryCreate(BaseModel):
    date: dt_date
    meal_type: str = Field(description="Breakfast, Morning Snack, Lunch, Evening Snack, Dinner, Other")
    notes: str | None = None
    items: list[FoodEntryItemCreate] = []

class FoodEntryUpdate(BaseModel):
    meal_type: str | None = None
    notes: str | None = None
    date: dt_date | None = None

class FoodEntryResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    date: dt_date
    meal_type: str
    notes: str | None = None
    items: list[FoodEntryItemResponse] = []
    total_calories: float = 0.0
    total_protein_g: float = 0.0
    total_carbs_g: float = 0.0
    total_fat_g: float = 0.0
    total_fiber_g: float = 0.0
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class DailyMealSummary(BaseModel):
    meal_type: str
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float
    entries_count: int

class DailyNutritionSummary(BaseModel):
    date: dt_date
    total_calories: float
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float
    total_fiber_g: float
    protein_target_g: float
    calorie_target: float | None = None
    protein_progress_percentage: float
    calorie_progress_percentage: float | None = None
    meals: list[DailyMealSummary]

# AI Analysis
class DetectedFoodItem(BaseModel):
    name: str
    estimated_quantity: float
    unit: str = "g"
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float = 0.0
    confidence: float = Field(ge=0.0, le=1.0)
    category: str = "Other"

class FoodAiAnalysisResponse(BaseModel):
    id: uuid.UUID
    status: str
    image_url: str
    detected_items: list[DetectedFoodItem] = []
    is_mock: bool = False
    message: str | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class FoodAiConfirmItem(BaseModel):
    name: str
    quantity: float
    unit: str = "g"
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float = 0.0

class FoodAiConfirmRequest(BaseModel):
    analysis_id: uuid.UUID
    date: dt_date
    meal_type: str
    notes: str | None = None
    items: list[FoodAiConfirmItem]
