import uuid
from datetime import date as dt_date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user, get_db
from backend.app.models.user import User
from backend.app.schemas.finance import (
    BudgetCreate,
    BudgetResponse,
    ExpenseCategoryCreate,
    ExpenseCategoryResponse,
    ExpenseEntryCreate,
    ExpenseEntryResponse,
    ExpenseEntryUpdate,
    FinanceOverviewResponse,
    IncomeEntryCreate,
    IncomeEntryResponse,
    IncomeEntryUpdate,
    RecurringTransactionCreate,
    RecurringTransactionResponse,
    RecurringTransactionUpdate,
    SalaryRecordCreate,
    SalaryRecordResponse,
    SalaryRecordUpdate,
    SavingsGoalCreate,
    SavingsGoalResponse,
    SavingsGoalUpdate,
)
from backend.app.services.finance_service import FinanceService

router = APIRouter()


# Overview
@router.get("/overview", response_model=FinanceOverviewResponse)
async def get_overview(
    month: int = Query(default=dt_date.today().month, ge=1, le=12),
    year: int = Query(default=dt_date.today().year, ge=2000, le=2100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await FinanceService.get_overview(db, current_user.id, month, year)


# Categories
@router.get("/categories", response_model=list[ExpenseCategoryResponse])
async def get_categories(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    cats = await FinanceService.get_categories(db, current_user.id)
    return [ExpenseCategoryResponse.model_validate(c) for c in cats]


@router.post("/categories", response_model=ExpenseCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: ExpenseCategoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cat = await FinanceService.create_category(db, current_user.id, data)
    return ExpenseCategoryResponse.model_validate(cat)


# Salaries
@router.get("/salaries", response_model=list[SalaryRecordResponse])
async def get_salaries(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    records = await FinanceService.get_salaries(db, current_user.id)
    return [SalaryRecordResponse.model_validate(r) for r in records]


@router.post("/salaries", response_model=SalaryRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_salary(
    data: SalaryRecordCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    record = await FinanceService.create_salary(db, current_user.id, data)
    return SalaryRecordResponse.model_validate(record)


@router.put("/salaries/{salary_id}", response_model=SalaryRecordResponse)
async def update_salary(
    salary_id: uuid.UUID,
    data: SalaryRecordUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    record = await FinanceService.get_salary_by_id(db, salary_id, current_user.id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salary record not found")
    updated = await FinanceService.update_salary(db, record, data)
    return SalaryRecordResponse.model_validate(updated)


@router.delete("/salaries/{salary_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_salary(
    salary_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    record = await FinanceService.get_salary_by_id(db, salary_id, current_user.id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salary record not found")
    await FinanceService.delete_salary(db, record)


# Incomes
@router.get("/incomes", response_model=list[IncomeEntryResponse])
async def get_incomes(
    month: int | None = None,
    year: int | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entries = await FinanceService.get_incomes(db, current_user.id, month, year)
    return [IncomeEntryResponse.model_validate(e) for e in entries]


@router.post("/incomes", response_model=IncomeEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_income(
    data: IncomeEntryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = await FinanceService.create_income(db, current_user.id, data)
    return IncomeEntryResponse.model_validate(entry)


@router.put("/incomes/{entry_id}", response_model=IncomeEntryResponse)
async def update_income(
    entry_id: uuid.UUID,
    data: IncomeEntryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = await FinanceService.get_income_by_id(db, entry_id, current_user.id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Income entry not found")
    updated = await FinanceService.update_income(db, entry, data)
    return IncomeEntryResponse.model_validate(updated)


@router.delete("/incomes/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_income(
    entry_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = await FinanceService.get_income_by_id(db, entry_id, current_user.id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Income entry not found")
    await FinanceService.delete_income(db, entry)


# Expenses
@router.get("/expenses", response_model=list[ExpenseEntryResponse])
async def get_expenses(
    month: int | None = None,
    year: int | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entries = await FinanceService.get_expenses(db, current_user.id, month, year)
    return [ExpenseEntryResponse.model_validate(e) for e in entries]


@router.post("/expenses", response_model=ExpenseEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    data: ExpenseEntryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = await FinanceService.create_expense(db, current_user.id, data)
    return ExpenseEntryResponse.model_validate(entry)


@router.put("/expenses/{entry_id}", response_model=ExpenseEntryResponse)
async def update_expense(
    entry_id: uuid.UUID,
    data: ExpenseEntryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = await FinanceService.get_expense_by_id(db, entry_id, current_user.id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense entry not found")
    updated = await FinanceService.update_expense(db, entry, data)
    return ExpenseEntryResponse.model_validate(updated)


@router.delete("/expenses/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    entry_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = await FinanceService.get_expense_by_id(db, entry_id, current_user.id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense entry not found")
    await FinanceService.delete_expense(db, entry)


# Savings Goals
@router.get("/savings", response_model=list[SavingsGoalResponse])
async def get_savings(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    return await FinanceService.get_savings_goals(db, current_user.id)


@router.post("/savings", response_model=SavingsGoalResponse, status_code=status.HTTP_201_CREATED)
async def create_savings_goal(
    data: SavingsGoalCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    goal = await FinanceService.create_savings_goal(db, current_user.id, data)
    pct = float(goal.current_amount / goal.target_amount * 100) if goal.target_amount > 0 else 0.0
    return SavingsGoalResponse(
        id=goal.id,
        user_id=goal.user_id,
        name=goal.name,
        target_amount=goal.target_amount,
        current_amount=goal.current_amount,
        target_date=goal.target_date,
        notes=goal.notes,
        is_achieved=goal.is_achieved,
        progress_percentage=round(pct, 1),
        remaining_amount=max(0, goal.target_amount - goal.current_amount),
        created_at=goal.created_at,
        updated_at=goal.updated_at,
    )


@router.put("/savings/{goal_id}", response_model=SavingsGoalResponse)
async def update_savings_goal(
    goal_id: uuid.UUID,
    data: SavingsGoalUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    goal = await FinanceService.update_savings_goal(db, goal_id, current_user.id, data)
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Savings goal not found")
    pct = float(goal.current_amount / goal.target_amount * 100) if goal.target_amount > 0 else 0.0
    return SavingsGoalResponse(
        id=goal.id,
        user_id=goal.user_id,
        name=goal.name,
        target_amount=goal.target_amount,
        current_amount=goal.current_amount,
        target_date=goal.target_date,
        notes=goal.notes,
        is_achieved=goal.is_achieved,
        progress_percentage=round(pct, 1),
        remaining_amount=max(0, goal.target_amount - goal.current_amount),
        created_at=goal.created_at,
        updated_at=goal.updated_at,
    )


@router.delete("/savings/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_savings_goal(
    goal_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    success = await FinanceService.delete_savings_goal(db, goal_id, current_user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Savings goal not found")


# Budgets
@router.get("/budgets", response_model=list[BudgetResponse])
async def get_budgets(
    month: int = Query(default=dt_date.today().month, ge=1, le=12),
    year: int = Query(default=dt_date.today().year, ge=2000, le=2100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await FinanceService.get_budgets(db, current_user.id, month, year)


@router.post("/budgets", response_model=BudgetResponse)
async def set_budget(
    data: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    b = await FinanceService.set_budget(db, current_user.id, data)
    # Return formatted with spent
    budgets = await FinanceService.get_budgets(db, current_user.id, data.month, data.year)
    for res in budgets:
        if res.id == b.id:
            return res
    return BudgetResponse(
        id=b.id,
        user_id=b.user_id,
        month=b.month,
        year=b.year,
        category=b.category,
        allocated_amount=b.allocated_amount,
        spent_amount=0,
        remaining_amount=b.allocated_amount,
        spent_percentage=0.0,
        created_at=b.created_at,
        updated_at=b.updated_at,
    )


# Recurring Transactions
@router.get("/recurring", response_model=list[RecurringTransactionResponse])
async def get_recurring(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    items = await FinanceService.get_recurring(db, current_user.id)
    return [RecurringTransactionResponse.model_validate(r) for r in items]


@router.post("/recurring", response_model=RecurringTransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_recurring(
    data: RecurringTransactionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rec = await FinanceService.create_recurring(db, current_user.id, data)
    return RecurringTransactionResponse.model_validate(rec)


@router.post("/recurring/process")
async def process_recurring_transactions(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    count = await FinanceService.process_recurring(db, current_user.id, dt_date.today())
    return {"message": f"Processed {count} recurring transactions for the current period.", "count": count}
