import uuid
from datetime import date as dt_date
from decimal import Decimal
from sqlalchemy import Boolean, Date, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base
from backend.app.models.base import GUID, TimestampMixin


class SalaryRecord(Base, TimestampMixin):
    __tablename__ = "salary_records"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    salary_date: Mapped[dt_date] = mapped_column(Date, nullable=False, index=True)
    employer: Mapped[str] = mapped_column(String(255), nullable=False)
    basic_salary: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    allowances: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    deductions: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    net_salary: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    user = relationship("User", back_populates="salary_records")


class ExpenseCategory(Base, TimestampMixin):
    __tablename__ = "expense_categories"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )  # None = system default
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    color: Mapped[str | None] = mapped_column(String(30), nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class IncomeEntry(Base, TimestampMixin):
    __tablename__ = "income_entries"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    category: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
    )  # Salary, Freelancing, Business, Other, Additional
    date: Mapped[dt_date] = mapped_column(Date, nullable=False, index=True)
    payment_method: Mapped[str] = mapped_column(
        String(50), default="Bank Transfer", nullable=False
    )  # Bank Transfer, UPI, Cash, Cheque, Other
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    recurring_id: Mapped[uuid.UUID | None] = mapped_column(GUID, nullable=True)

    user = relationship("User", back_populates="income_entries")


class ExpenseEntry(Base, TimestampMixin):
    __tablename__ = "expense_entries"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    category: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
    )  # Food, Travel, Shopping, Bills, Education, Entertainment, Healthcare, Personal, Other
    date: Mapped[dt_date] = mapped_column(Date, nullable=False, index=True)
    payment_method: Mapped[str] = mapped_column(
        String(50), default="UPI", nullable=False
    )  # UPI, Credit Card, Debit Card, Cash, Net Banking, Other
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    recurring_id: Mapped[uuid.UUID | None] = mapped_column(GUID, nullable=True)

    user = relationship("User", back_populates="expense_entries")


class SavingsGoal(Base, TimestampMixin):
    __tablename__ = "savings_goals"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    target_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    current_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00"), nullable=False
    )
    target_date: Mapped[dt_date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_achieved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="savings_goals")


class Budget(Base, TimestampMixin):
    __tablename__ = "budgets"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    month: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-12
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="ALL", nullable=False, index=True)
    allocated_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    user = relationship("User", back_populates="budgets")


class RecurringTransaction(Base, TimestampMixin):
    __tablename__ = "recurring_transactions"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    transaction_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # "income" or "expense"
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(50), default="UPI", nullable=False)
    frequency: Mapped[str] = mapped_column(String(20), default="monthly", nullable=False)  # monthly, weekly, yearly
    day_of_month: Mapped[int] = mapped_column(Integer, default=1, nullable=False)  # 1-31
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_processed_date: Mapped[dt_date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    user = relationship("User", back_populates="recurring_transactions")
