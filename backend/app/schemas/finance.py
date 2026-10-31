import uuid
from datetime import date as dt_date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


# Salary
class SalaryRecordBase(BaseModel):
    salary_date: dt_date
    employer: str = Field(min_length=1, max_length=255)
    basic_salary: Decimal = Field(ge=0)
    allowances: Decimal = Field(default=Decimal("0.00"), ge=0)
    deductions: Decimal = Field(default=Decimal("0.00"), ge=0)
    net_salary: Decimal = Field(ge=0)
    notes: str | None = None


class SalaryRecordCreate(SalaryRecordBase):
    pass


class SalaryRecordUpdate(BaseModel):
    salary_date: dt_date | None = None
    employer: str | None = None
    basic_salary: Decimal | None = Field(default=None, ge=0)
    allowances: Decimal | None = Field(default=None, ge=0)
    deductions: Decimal | None = Field(default=None, ge=0)
    net_salary: Decimal | None = Field(default=None, ge=0)
    notes: str | None = None


class SalaryRecordResponse(SalaryRecordBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Expense Category
class ExpenseCategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    icon: str | None = None
    color: str | None = None
    is_default: bool = False


class ExpenseCategoryCreate(ExpenseCategoryBase):
    pass


class ExpenseCategoryResponse(ExpenseCategoryBase):
    id: uuid.UUID
    user_id: uuid.UUID | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Income
class IncomeEntryBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    amount: Decimal = Field(gt=0)
    category: str = Field(description="Salary, Freelancing, Business, Other, Additional")
    date: dt_date
    payment_method: str = Field(default="Bank Transfer")
    notes: str | None = None
    recurring_id: uuid.UUID | None = None


class IncomeEntryCreate(IncomeEntryBase):
    pass


class IncomeEntryUpdate(BaseModel):
    title: str | None = None
    amount: Decimal | None = Field(default=None, gt=0)
    category: str | None = None
    date: dt_date | None = None
    payment_method: str | None = None
    notes: str | None = None


class IncomeEntryResponse(IncomeEntryBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Expense
class ExpenseEntryBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    amount: Decimal = Field(gt=0)
    category: str = Field(description="Food, Travel, Shopping, Bills, Education, Entertainment, Healthcare, Personal, Other")
    date: dt_date
    payment_method: str = Field(default="UPI")
    notes: str | None = None
    recurring_id: uuid.UUID | None = None


class ExpenseEntryCreate(ExpenseEntryBase):
    pass


class ExpenseEntryUpdate(BaseModel):
    title: str | None = None
    amount: Decimal | None = Field(default=None, gt=0)
    category: str | None = None
    date: dt_date | None = None
    payment_method: str | None = None
    notes: str | None = None


class ExpenseEntryResponse(ExpenseEntryBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Savings Goal
class SavingsGoalBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    target_amount: Decimal = Field(gt=0)
    current_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    target_date: dt_date | None = None
    notes: str | None = None
    is_achieved: bool = False


class SavingsGoalCreate(SavingsGoalBase):
    pass


class SavingsGoalUpdate(BaseModel):
    name: str | None = None
    target_amount: Decimal | None = Field(default=None, gt=0)
    current_amount: Decimal | None = Field(default=None, ge=0)
    target_date: dt_date | None = None
    notes: str | None = None
    is_achieved: bool | None = None


class SavingsGoalResponse(SavingsGoalBase):
    id: uuid.UUID
    user_id: uuid.UUID
    progress_percentage: float = 0.0
    remaining_amount: Decimal = Decimal("0.00")
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Budget
class BudgetBase(BaseModel):
    month: int = Field(ge=1, le=12)
    year: int = Field(ge=2000, le=2100)
    category: str = Field(default="ALL")
    allocated_amount: Decimal = Field(gt=0)


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    allocated_amount: Decimal = Field(gt=0)


class BudgetResponse(BudgetBase):
    id: uuid.UUID
    user_id: uuid.UUID
    spent_amount: Decimal = Decimal("0.00")
    remaining_amount: Decimal = Decimal("0.00")
    spent_percentage: float = 0.0
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Recurring Transactions
class RecurringTransactionBase(BaseModel):
    transaction_type: str = Field(description="'income' or 'expense'")
    title: str = Field(min_length=1, max_length=255)
    amount: Decimal = Field(gt=0)
    category: str
    payment_method: str = "UPI"
    frequency: str = "monthly"
    day_of_month: int = Field(default=1, ge=1, le=31)
    is_active: bool = True
    notes: str | None = None


class RecurringTransactionCreate(RecurringTransactionBase):
    pass


class RecurringTransactionUpdate(BaseModel):
    title: str | None = None
    amount: Decimal | None = Field(default=None, gt=0)
    category: str | None = None
    payment_method: str | None = None
    frequency: str | None = None
    day_of_month: int | None = Field(default=None, ge=1, le=31)
    is_active: bool | None = None
    notes: str | None = None


class RecurringTransactionResponse(RecurringTransactionBase):
    id: uuid.UUID
    user_id: uuid.UUID
    last_processed_date: dt_date | None = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Finance Overview
class CategorySpending(BaseModel):
    category: str
    amount: Decimal
    percentage: float


class FinanceOverviewResponse(BaseModel):
    month: int
    year: int
    currency: str = "₹"
    total_income: Decimal
    total_expenses: Decimal
    net_savings: Decimal
    latest_salary: SalaryRecordResponse | None = None
    savings_goals: list[SavingsGoalResponse] = []
    category_breakdown: list[CategorySpending] = []
    recent_transactions: list[dict] = []
    budget_overview: list[BudgetResponse] = []
