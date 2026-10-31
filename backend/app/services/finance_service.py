import uuid
from datetime import date as dt_date
from decimal import Decimal
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.finance import (
    Budget,
    ExpenseCategory,
    ExpenseEntry,
    IncomeEntry,
    RecurringTransaction,
    SalaryRecord,
    SavingsGoal,
)
from backend.app.schemas.finance import (
    BudgetCreate,
    BudgetResponse,
    BudgetUpdate,
    CategorySpending,
    ExpenseCategoryCreate,
    ExpenseEntryCreate,
    ExpenseEntryResponse,
    ExpenseEntryUpdate,
    FinanceOverviewResponse,
    IncomeEntryCreate,
    IncomeEntryResponse,
    IncomeEntryUpdate,
    RecurringTransactionCreate,
    RecurringTransactionUpdate,
    SalaryRecordCreate,
    SalaryRecordResponse,
    SalaryRecordUpdate,
    SavingsGoalCreate,
    SavingsGoalResponse,
    SavingsGoalUpdate,
)

DEFAULT_EXPENSE_CATEGORIES = [
    ("Food", "Utensils", "#10b981"),
    ("Travel", "Car", "#3b82f6"),
    ("Shopping", "ShoppingBag", "#ec4899"),
    ("Bills", "Receipt", "#f59e0b"),
    ("Education", "GraduationCap", "#8b5cf6"),
    ("Entertainment", "Film", "#06b6d4"),
    ("Healthcare", "HeartPulse", "#ef4444"),
    ("Personal", "User", "#a855f7"),
    ("Other", "MoreHorizontal", "#6b7280"),
]


class FinanceService:
    @staticmethod
    async def seed_default_categories(db: AsyncSession) -> None:
        query = select(func.count(ExpenseCategory.id)).where(ExpenseCategory.user_id.is_(None))
        res = await db.execute(query)
        if (res.scalar_one() or 0) == 0:
            for name, icon, color in DEFAULT_EXPENSE_CATEGORIES:
                cat = ExpenseCategory(name=name, icon=icon, color=color, is_default=True, user_id=None)
                db.add(cat)
            await db.commit()

    @staticmethod
    async def get_categories(db: AsyncSession, user_id: uuid.UUID) -> list[ExpenseCategory]:
        await FinanceService.seed_default_categories(db)
        query = (
            select(ExpenseCategory)
            .where((ExpenseCategory.user_id == user_id) | (ExpenseCategory.user_id.is_(None)))
            .order_by(ExpenseCategory.name)
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def create_category(
        db: AsyncSession, user_id: uuid.UUID, data: ExpenseCategoryCreate
    ) -> ExpenseCategory:
        cat = ExpenseCategory(
            user_id=user_id,
            name=data.name.strip(),
            icon=data.icon or "Tag",
            color=data.color or "#10b981",
            is_default=False,
        )
        db.add(cat)
        await db.commit()
        await db.refresh(cat)
        return cat

    # Salary
    @staticmethod
    async def create_salary(
        db: AsyncSession, user_id: uuid.UUID, data: SalaryRecordCreate
    ) -> SalaryRecord:
        record = SalaryRecord(
            user_id=user_id,
            salary_date=data.salary_date,
            employer=data.employer.strip(),
            basic_salary=data.basic_salary,
            allowances=data.allowances,
            deductions=data.deductions,
            net_salary=data.net_salary,
            notes=data.notes,
        )
        db.add(record)
        # Also automatically record as income entry for this month if user wishes
        income = IncomeEntry(
            user_id=user_id,
            title=f"Salary - {data.employer}",
            amount=data.net_salary,
            category="Salary",
            date=data.salary_date,
            payment_method="Bank Transfer",
            notes=data.notes,
        )
        db.add(income)
        await db.commit()
        await db.refresh(record)
        return record

    @staticmethod
    async def get_salaries(db: AsyncSession, user_id: uuid.UUID) -> list[SalaryRecord]:
        query = (
            select(SalaryRecord)
            .where(SalaryRecord.user_id == user_id)
            .order_by(SalaryRecord.salary_date.desc())
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_salary_by_id(
        db: AsyncSession, salary_id: uuid.UUID, user_id: uuid.UUID
    ) -> SalaryRecord | None:
        query = select(SalaryRecord).where(
            SalaryRecord.id == salary_id, SalaryRecord.user_id == user_id
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def update_salary(
        db: AsyncSession, record: SalaryRecord, data: SalaryRecordUpdate
    ) -> SalaryRecord:
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(record, k, v)
        await db.commit()
        await db.refresh(record)
        return record

    @staticmethod
    async def delete_salary(db: AsyncSession, record: SalaryRecord) -> None:
        await db.delete(record)
        await db.commit()

    # Income
    @staticmethod
    async def create_income(
        db: AsyncSession, user_id: uuid.UUID, data: IncomeEntryCreate
    ) -> IncomeEntry:
        entry = IncomeEntry(
            user_id=user_id,
            title=data.title.strip(),
            amount=data.amount,
            category=data.category,
            date=data.date,
            payment_method=data.payment_method,
            notes=data.notes,
            recurring_id=data.recurring_id,
        )
        db.add(entry)
        await db.commit()
        await db.refresh(entry)
        return entry

    @staticmethod
    async def get_incomes(
        db: AsyncSession, user_id: uuid.UUID, month: int | None = None, year: int | None = None
    ) -> list[IncomeEntry]:
        query = select(IncomeEntry).where(IncomeEntry.user_id == user_id)
        if month and year:
            start_date = dt_date(year, month, 1)
            end_date = dt_date(year + (1 if month == 12 else 0), 1 if month == 12 else month + 1, 1)
            query = query.where(IncomeEntry.date >= start_date, IncomeEntry.date < end_date)
        query = query.order_by(IncomeEntry.date.desc())
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_income_by_id(
        db: AsyncSession, entry_id: uuid.UUID, user_id: uuid.UUID
    ) -> IncomeEntry | None:
        query = select(IncomeEntry).where(IncomeEntry.id == entry_id, IncomeEntry.user_id == user_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def update_income(
        db: AsyncSession, entry: IncomeEntry, data: IncomeEntryUpdate
    ) -> IncomeEntry:
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(entry, k, v)
        await db.commit()
        await db.refresh(entry)
        return entry

    @staticmethod
    async def delete_income(db: AsyncSession, entry: IncomeEntry) -> None:
        await db.delete(entry)
        await db.commit()

    # Expense
    @staticmethod
    async def create_expense(
        db: AsyncSession, user_id: uuid.UUID, data: ExpenseEntryCreate
    ) -> ExpenseEntry:
        entry = ExpenseEntry(
            user_id=user_id,
            title=data.title.strip(),
            amount=data.amount,
            category=data.category,
            date=data.date,
            payment_method=data.payment_method,
            notes=data.notes,
            recurring_id=data.recurring_id,
        )
        db.add(entry)
        await db.commit()
        await db.refresh(entry)
        return entry

    @staticmethod
    async def get_expenses(
        db: AsyncSession, user_id: uuid.UUID, month: int | None = None, year: int | None = None
    ) -> list[ExpenseEntry]:
        query = select(ExpenseEntry).where(ExpenseEntry.user_id == user_id)
        if month and year:
            start_date = dt_date(year, month, 1)
            end_date = dt_date(year + (1 if month == 12 else 0), 1 if month == 12 else month + 1, 1)
            query = query.where(ExpenseEntry.date >= start_date, ExpenseEntry.date < end_date)
        query = query.order_by(ExpenseEntry.date.desc())
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_expense_by_id(
        db: AsyncSession, entry_id: uuid.UUID, user_id: uuid.UUID
    ) -> ExpenseEntry | None:
        query = select(ExpenseEntry).where(
            ExpenseEntry.id == entry_id, ExpenseEntry.user_id == user_id
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def update_expense(
        db: AsyncSession, entry: ExpenseEntry, data: ExpenseEntryUpdate
    ) -> ExpenseEntry:
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(entry, k, v)
        await db.commit()
        await db.refresh(entry)
        return entry

    @staticmethod
    async def delete_expense(db: AsyncSession, entry: ExpenseEntry) -> None:
        await db.delete(entry)
        await db.commit()

    # Savings Goals
    @staticmethod
    async def create_savings_goal(
        db: AsyncSession, user_id: uuid.UUID, data: SavingsGoalCreate
    ) -> SavingsGoal:
        goal = SavingsGoal(
            user_id=user_id,
            name=data.name.strip(),
            target_amount=data.target_amount,
            current_amount=data.current_amount,
            target_date=data.target_date,
            notes=data.notes,
            is_achieved=data.is_achieved,
        )
        db.add(goal)
        await db.commit()
        await db.refresh(goal)
        return goal

    @staticmethod
    async def get_savings_goals(db: AsyncSession, user_id: uuid.UUID) -> list[SavingsGoalResponse]:
        query = select(SavingsGoal).where(SavingsGoal.user_id == user_id).order_by(SavingsGoal.created_at)
        result = await db.execute(query)
        goals = list(result.scalars().all())
        responses = []
        for g in goals:
            pct = float(g.current_amount / g.target_amount * 100) if g.target_amount > 0 else 0.0
            rem = max(Decimal("0.00"), g.target_amount - g.current_amount)
            res = SavingsGoalResponse(
                id=g.id,
                user_id=g.user_id,
                name=g.name,
                target_amount=g.target_amount,
                current_amount=g.current_amount,
                target_date=g.target_date,
                notes=g.notes,
                is_achieved=g.is_achieved or g.current_amount >= g.target_amount,
                progress_percentage=round(pct, 1),
                remaining_amount=rem,
                created_at=g.created_at,
                updated_at=g.updated_at,
            )
            responses.append(res)
        return responses

    @staticmethod
    async def update_savings_goal(
        db: AsyncSession, goal_id: uuid.UUID, user_id: uuid.UUID, data: SavingsGoalUpdate
    ) -> SavingsGoal | None:
        query = select(SavingsGoal).where(SavingsGoal.id == goal_id, SavingsGoal.user_id == user_id)
        result = await db.execute(query)
        goal = result.scalar_one_or_none()
        if not goal:
            return None
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(goal, k, v)
        if goal.current_amount >= goal.target_amount:
            goal.is_achieved = True
        await db.commit()
        await db.refresh(goal)
        return goal

    @staticmethod
    async def delete_savings_goal(db: AsyncSession, goal_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        query = select(SavingsGoal).where(SavingsGoal.id == goal_id, SavingsGoal.user_id == user_id)
        result = await db.execute(query)
        goal = result.scalar_one_or_none()
        if not goal:
            return False
        await db.delete(goal)
        await db.commit()
        return True

    # Budgets
    @staticmethod
    async def set_budget(db: AsyncSession, user_id: uuid.UUID, data: BudgetCreate) -> Budget:
        query = select(Budget).where(
            Budget.user_id == user_id,
            Budget.month == data.month,
            Budget.year == data.year,
            Budget.category == data.category,
        )
        result = await db.execute(query)
        budget = result.scalar_one_or_none()
        if budget:
            budget.allocated_amount = data.allocated_amount
        else:
            budget = Budget(
                user_id=user_id,
                month=data.month,
                year=data.year,
                category=data.category,
                allocated_amount=data.allocated_amount,
            )
            db.add(budget)
        await db.commit()
        await db.refresh(budget)
        return budget

    @staticmethod
    async def get_budgets(
        db: AsyncSession, user_id: uuid.UUID, month: int, year: int
    ) -> list[BudgetResponse]:
        query = select(Budget).where(
            Budget.user_id == user_id, Budget.month == month, Budget.year == year
        )
        result = await db.execute(query)
        budgets = list(result.scalars().all())

        # Calculate spent for this month & category
        start_date = dt_date(year, month, 1)
        end_date = dt_date(year + (1 if month == 12 else 0), 1 if month == 12 else month + 1, 1)

        responses = []
        for b in budgets:
            exp_q = select(func.coalesce(func.sum(ExpenseEntry.amount), Decimal("0.00"))).where(
                ExpenseEntry.user_id == user_id,
                ExpenseEntry.date >= start_date,
                ExpenseEntry.date < end_date,
            )
            if b.category != "ALL":
                exp_q = exp_q.where(ExpenseEntry.category == b.category)
            exp_res = await db.execute(exp_q)
            spent = exp_res.scalar_one() or Decimal("0.00")

            pct = float(spent / b.allocated_amount * 100) if b.allocated_amount > 0 else 0.0
            rem = max(Decimal("0.00"), b.allocated_amount - spent)
            responses.append(
                BudgetResponse(
                    id=b.id,
                    user_id=b.user_id,
                    month=b.month,
                    year=b.year,
                    category=b.category,
                    allocated_amount=b.allocated_amount,
                    spent_amount=spent,
                    remaining_amount=rem,
                    spent_percentage=round(pct, 1),
                    created_at=b.created_at,
                    updated_at=b.updated_at,
                )
            )
        return responses

    # Recurring Transactions
    @staticmethod
    async def create_recurring(
        db: AsyncSession, user_id: uuid.UUID, data: RecurringTransactionCreate
    ) -> RecurringTransaction:
        rec = RecurringTransaction(
            user_id=user_id,
            transaction_type=data.transaction_type,
            title=data.title.strip(),
            amount=data.amount,
            category=data.category,
            payment_method=data.payment_method,
            frequency=data.frequency,
            day_of_month=data.day_of_month,
            is_active=data.is_active,
            notes=data.notes,
        )
        db.add(rec)
        await db.commit()
        await db.refresh(rec)
        return rec

    @staticmethod
    async def get_recurring(
        db: AsyncSession, user_id: uuid.UUID
    ) -> list[RecurringTransaction]:
        query = select(RecurringTransaction).where(RecurringTransaction.user_id == user_id)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def process_recurring(db: AsyncSession, user_id: uuid.UUID, today: dt_date) -> int:
        """Processes active recurring transactions for the current month without duplication."""
        query = select(RecurringTransaction).where(
            RecurringTransaction.user_id == user_id, RecurringTransaction.is_active.is_(True)
        )
        result = await db.execute(query)
        recurring_list = list(result.scalars().all())
        created_count = 0

        for r in recurring_list:
            # Check if already processed in this month/year
            if r.last_processed_date and (
                r.last_processed_date.month == today.month
                and r.last_processed_date.year == today.year
            ):
                continue

            # If today >= day_of_month or end of month
            if today.day >= r.day_of_month:
                target_date = dt_date(today.year, today.month, min(r.day_of_month, 28))
                if r.transaction_type == "income":
                    inc = IncomeEntry(
                        user_id=user_id,
                        title=r.title,
                        amount=r.amount,
                        category=r.category,
                        date=target_date,
                        payment_method=r.payment_method,
                        notes=f"Auto-generated recurring: {r.notes or ''}".strip(),
                        recurring_id=r.id,
                    )
                    db.add(inc)
                else:
                    exp = ExpenseEntry(
                        user_id=user_id,
                        title=r.title,
                        amount=r.amount,
                        category=r.category,
                        date=target_date,
                        payment_method=r.payment_method,
                        notes=f"Auto-generated recurring: {r.notes or ''}".strip(),
                        recurring_id=r.id,
                    )
                    db.add(exp)
                r.last_processed_date = today
                created_count += 1

        if created_count > 0:
            await db.commit()
        return created_count

    # Finance Overview
    @classmethod
    async def get_overview(
        cls, db: AsyncSession, user_id: uuid.UUID, month: int, year: int
    ) -> FinanceOverviewResponse:
        today = dt_date.today()
        # Process recurring transactions safely
        await cls.process_recurring(db, user_id, today)

        start_date = dt_date(year, month, 1)
        end_date = dt_date(year + (1 if month == 12 else 0), 1 if month == 12 else month + 1, 1)

        # Incomes
        inc_res = await db.execute(
            select(func.coalesce(func.sum(IncomeEntry.amount), Decimal("0.00"))).where(
                IncomeEntry.user_id == user_id,
                IncomeEntry.date >= start_date,
                IncomeEntry.date < end_date,
            )
        )
        total_income = inc_res.scalar_one() or Decimal("0.00")

        # Expenses
        exp_res = await db.execute(
            select(func.coalesce(func.sum(ExpenseEntry.amount), Decimal("0.00"))).where(
                ExpenseEntry.user_id == user_id,
                ExpenseEntry.date >= start_date,
                ExpenseEntry.date < end_date,
            )
        )
        total_expense = exp_res.scalar_one() or Decimal("0.00")
        net_savings = total_income - total_expense

        # Category Breakdown
        cat_q = (
            select(
                ExpenseEntry.category,
                func.sum(ExpenseEntry.amount).label("cat_amount"),
            )
            .where(
                ExpenseEntry.user_id == user_id,
                ExpenseEntry.date >= start_date,
                ExpenseEntry.date < end_date,
            )
            .group_by(ExpenseEntry.category)
            .order_by(func.sum(ExpenseEntry.amount).desc())
        )
        cat_res = await db.execute(cat_q)
        cat_breakdown: list[CategorySpending] = []
        for cat_name, cat_amt in cat_res.all():
            pct = float(cat_amt / total_expense * 100) if total_expense > 0 else 0.0
            cat_breakdown.append(
                CategorySpending(category=cat_name, amount=cat_amt, percentage=round(pct, 1))
            )

        # Latest salary
        sal_res = await db.execute(
            select(SalaryRecord)
            .where(SalaryRecord.user_id == user_id)
            .order_by(SalaryRecord.salary_date.desc())
            .limit(1)
        )
        latest_sal = sal_res.scalar_one_or_none()
        latest_sal_resp = SalaryRecordResponse.model_validate(latest_sal) if latest_sal else None

        # Savings goals
        savings = await cls.get_savings_goals(db, user_id)

        # Budgets
        budgets = await cls.get_budgets(db, user_id, month, year)

        # Recent transactions (combining last 5 income and expenses)
        recent_incomes = await cls.get_incomes(db, user_id)
        recent_expenses = await cls.get_expenses(db, user_id)

        txs = []
        for i in recent_incomes[:5]:
            txs.append({
                "id": str(i.id),
                "type": "income",
                "title": i.title,
                "amount": float(i.amount),
                "category": i.category,
                "date": i.date.isoformat(),
                "payment_method": i.payment_method,
            })
        for e in recent_expenses[:5]:
            txs.append({
                "id": str(e.id),
                "type": "expense",
                "title": e.title,
                "amount": float(e.amount),
                "category": e.category,
                "date": e.date.isoformat(),
                "payment_method": e.payment_method,
            })
        txs.sort(key=lambda x: x["date"], reverse=True)

        return FinanceOverviewResponse(
            month=month,
            year=year,
            currency="₹",
            total_income=total_income,
            total_expenses=total_expense,
            net_savings=net_savings,
            latest_salary=latest_sal_resp,
            savings_goals=savings,
            category_breakdown=cat_breakdown,
            recent_transactions=txs[:10],
            budget_overview=budgets,
        )
