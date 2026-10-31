import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IndianRupee,
  Plus,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Briefcase,
  Calendar,
  Wallet,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Repeat,
  Trash2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { EmptyState } from '../../components/common/EmptyState';
import {
  FinanceOverviewResponse,
  ExpenseCategory,
  SalaryRecord,
  SavingsGoal,
  Budget,
  RecurringTransaction,
  IncomeEntry,
  ExpenseEntry,
} from '../../types';

export const FinancePage: React.FC = () => {
  const queryClient = useQueryClient();
  const today = new Date();
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'salary' | 'savings' | 'budgets'>('overview');

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  // Form states
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Food');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState('UPI');
  const [expenseDate, setExpenseDate] = useState(today.toISOString().split('T')[0]);

  const [incomeTitle, setIncomeTitle] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeCategory, setIncomeCategory] = useState('Salary');
  const [incomePaymentMethod, setIncomePaymentMethod] = useState('Bank Transfer');
  const [incomeDate, setIncomeDate] = useState(today.toISOString().split('T')[0]);

  const [employer, setEmployer] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const [allowances, setAllowances] = useState('0');
  const [deductions, setDeductions] = useState('0');
  const [salaryDate, setSalaryDate] = useState(today.toISOString().split('T')[0]);

  const [goalName, setGoalName] = useState('');
  const [goalTargetAmount, setGoalTargetAmount] = useState('');
  const [goalCurrentAmount, setGoalCurrentAmount] = useState('0');
  const [goalTargetDate, setGoalTargetDate] = useState('');

  const [budgetCategory, setBudgetCategory] = useState('Food');
  const [budgetAllocatedAmount, setBudgetAllocatedAmount] = useState('');

  // Queries
  const { data: overview, isLoading: loadingOverview } = useQuery<FinanceOverviewResponse>({
    queryKey: ['finance-overview'],
    queryFn: async () => {
      const res = await api.get('/finance/overview');
      return res.data;
    },
  });

  const { data: categories = [] } = useQuery<ExpenseCategory[]>({
    queryKey: ['finance-categories'],
    queryFn: async () => {
      const res = await api.get('/finance/categories');
      return res.data;
    },
  });

  const { data: salaries = [] } = useQuery<SalaryRecord[]>({
    queryKey: ['finance-salaries'],
    queryFn: async () => {
      const res = await api.get('/finance/salaries');
      return res.data;
    },
  });

  const { data: savings = [] } = useQuery<SavingsGoal[]>({
    queryKey: ['finance-savings'],
    queryFn: async () => {
      const res = await api.get('/finance/savings');
      return res.data;
    },
  });

  const { data: budgets = [] } = useQuery<Budget[]>({
    queryKey: ['finance-budgets'],
    queryFn: async () => {
      const res = await api.get('/finance/budgets');
      return res.data;
    },
  });

  const { data: recurring = [] } = useQuery<RecurringTransaction[]>({
    queryKey: ['finance-recurring'],
    queryFn: async () => {
      const res = await api.get('/finance/recurring');
      return res.data;
    },
  });

  // Mutations
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['finance-overview'] });
    queryClient.invalidateQueries({ queryKey: ['finance-categories'] });
    queryClient.invalidateQueries({ queryKey: ['finance-salaries'] });
    queryClient.invalidateQueries({ queryKey: ['finance-savings'] });
    queryClient.invalidateQueries({ queryKey: ['finance-budgets'] });
    queryClient.invalidateQueries({ queryKey: ['finance-recurring'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
  };

  const createExpenseMutation = useMutation({
    mutationFn: async (payload: any) => api.post('/finance/expenses', payload),
    onSuccess: () => {
      invalidateAll();
      setIsExpenseModalOpen(false);
      setExpenseTitle('');
      setExpenseAmount('');
    },
  });

  const createIncomeMutation = useMutation({
    mutationFn: async (payload: any) => api.post('/finance/incomes', payload),
    onSuccess: () => {
      invalidateAll();
      setIsIncomeModalOpen(false);
      setIncomeTitle('');
      setIncomeAmount('');
    },
  });

  const createSalaryMutation = useMutation({
    mutationFn: async (payload: any) => api.post('/finance/salaries', payload),
    onSuccess: () => {
      invalidateAll();
      setIsSalaryModalOpen(false);
      setEmployer('');
      setBasicSalary('');
    },
  });

  const createSavingsGoalMutation = useMutation({
    mutationFn: async (payload: any) => api.post('/finance/savings', payload),
    onSuccess: () => {
      invalidateAll();
      setIsSavingsModalOpen(false);
      setGoalName('');
      setGoalTargetAmount('');
      setGoalCurrentAmount('0');
    },
  });

  const createBudgetMutation = useMutation({
    mutationFn: async (payload: any) => api.post('/finance/budgets', payload),
    onSuccess: () => {
      invalidateAll();
      setIsBudgetModalOpen(false);
      setBudgetAllocatedAmount('');
    },
  });

  const processRecurringMutation = useMutation({
    mutationFn: async () => api.post('/finance/recurring/process'),
    onSuccess: () => invalidateAll(),
  });

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || !expenseAmount) return;
    createExpenseMutation.mutate({
      title: expenseTitle.trim(),
      amount: parseFloat(expenseAmount),
      category: expenseCategory,
      payment_method: expensePaymentMethod,
      date: expenseDate,
    });
  };

  const handleIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomeTitle.trim() || !incomeAmount) return;
    createIncomeMutation.mutate({
      title: incomeTitle.trim(),
      amount: parseFloat(incomeAmount),
      category: incomeCategory,
      payment_method: incomePaymentMethod,
      date: incomeDate,
    });
  };

  const handleSalarySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const basic = parseFloat(basicSalary || '0');
    const allow = parseFloat(allowances || '0');
    const ded = parseFloat(deductions || '0');
    const net = basic + allow - ded;
    createSalaryMutation.mutate({
      employer: employer.trim(),
      basic_salary: basic,
      allowances: allow,
      deductions: ded,
      net_salary: net,
      salary_date: salaryDate,
    });
  };

  const handleSavingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName.trim() || !goalTargetAmount) return;
    createSavingsGoalMutation.mutate({
      name: goalName.trim(),
      target_amount: parseFloat(goalTargetAmount),
      current_amount: parseFloat(goalCurrentAmount || '0'),
      target_date: goalTargetDate || null,
    });
  };

  const handleBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetAllocatedAmount) return;
    createBudgetMutation.mutate({
      month: today.getMonth() + 1,
      year: today.getFullYear(),
      category: budgetCategory,
      allocated_amount: parseFloat(budgetAllocatedAmount),
    });
  };

  const formatINR = (val: number | undefined) => {
    if (val === undefined || val === null) return '₹0';
    return `₹${Math.round(val).toLocaleString('en-IN')}`;
  };

  const totalInc = overview?.total_income || 0;
  const totalExp = overview?.total_expenses || 0;
  const netSave = overview?.net_savings || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#121215] to-[#16161c] border border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
              Personal Wealth Intelligence
            </span>
            <Badge variant="emerald" size="sm">INR (₹)</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 flex items-center gap-2">
            <IndianRupee className="w-7 h-7 text-emerald-400" /> Money & Salary Tracker
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Complete management of salary slips, daily UPI expenses, savings goals, and budgets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
            onClick={() => setIsIncomeModalOpen(true)}
          >
            Add Income
          </Button>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsExpenseModalOpen(true)}
          >
            Add Expense
          </Button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <Card className="bg-[#121215] border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">Monthly Income</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100">{formatINR(totalInc)}</div>
          <p className="mt-2 text-[11px] text-zinc-400">
            {today.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </p>
        </Card>

        {/* Total Expenses */}
        <Card className="bg-[#121215] border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">Monthly Expenses</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100">{formatINR(totalExp)}</div>
          <p className="mt-2 text-[11px] text-zinc-400">
            Recorded UPI, Card & Cash
          </p>
        </Card>

        {/* Net Savings */}
        <Card className="bg-[#121215] border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">Net Month Savings</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className={`text-2xl font-bold ${netSave >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatINR(netSave)}
          </div>
          <p className="mt-2 text-[11px] text-zinc-400">
            {netSave >= 0 ? 'Surplus retained this month' : 'Deficit spending this month'}
          </p>
        </Card>

        {/* Latest Salary */}
        <Card className="bg-[#121215] border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">Latest Net Salary</span>
            <Briefcase className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100">
            {overview?.latest_salary ? formatINR(overview.latest_salary.net_salary) : 'No Slip'}
          </div>
          <p className="mt-2 text-[11px] text-zinc-400">
            {overview?.latest_salary ? `${overview.latest_salary.employer} (${overview.latest_salary.salary_date})` : 'Record your salary'}
          </p>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'overview'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Overview & Breakdown
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'expenses'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Transactions
        </button>
        <button
          onClick={() => setActiveTab('salary')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'salary'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Salary Records
        </button>
        <button
          onClick={() => setActiveTab('savings')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'savings'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Savings Goals
        </button>
        <button
          onClick={() => setActiveTab('budgets')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'budgets'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Budgets & Recurring
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Spending */}
          <Card className="bg-[#121215] border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base text-zinc-100">Category Spending</CardTitle>
            </CardHeader>
            <div className="space-y-3 pt-2">
              {overview?.category_breakdown && overview.category_breakdown.length > 0 ? (
                overview.category_breakdown.map((item) => (
                  <div key={item.category} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-300 font-medium">{item.category}</span>
                      <span className="text-zinc-400">
                        {formatINR(item.amount)} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800/80 rounded-full h-1.5">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500 py-6 text-center">
                  No expenses recorded for this month.
                </p>
              )}
            </div>
          </Card>

          {/* Recent Transactions List */}
          <Card className="bg-[#121215] border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base text-zinc-100">Recent Transactions</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setActiveTab('expenses')}>
                View All
              </Button>
            </CardHeader>
            <div className="divide-y divide-zinc-800/60">
              {overview?.recent_transactions && overview.recent_transactions.length > 0 ? (
                overview.recent_transactions.map((tx) => (
                  <div key={tx.id} className="py-3 px-1 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-zinc-200">{tx.title}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        <span className="text-emerald-400">{tx.category}</span> • {tx.payment_method} • {tx.date}
                      </div>
                    </div>
                    <div className={`text-sm font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-zinc-100'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500 py-6 text-center">No recent transactions.</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Transactions (Expenses & Incomes) */}
      {activeTab === 'expenses' && (
        <Card className="bg-[#121215] border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base text-zinc-100">All Month Transactions</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setIsIncomeModalOpen(true)}>
                + Income
              </Button>
              <Button size="sm" variant="primary" onClick={() => setIsExpenseModalOpen(true)}>
                + Expense
              </Button>
            </div>
          </CardHeader>
          <div className="divide-y divide-zinc-800/60">
            {overview?.recent_transactions && overview.recent_transactions.length > 0 ? (
              overview.recent_transactions.map((tx) => (
                <div key={tx.id} className="py-3 px-2 flex items-center justify-between hover:bg-zinc-800/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {tx.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-200">{tx.title}</h4>
                      <p className="text-[11px] text-zinc-400">
                        {tx.category} • {tx.payment_method} • {tx.date}
                      </p>
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-zinc-200'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={<Receipt className="w-6 h-6" />}
                title="No transactions recorded"
                description="Start recording your daily income and expense transactions."
                actionLabel="Add Expense"
                onAction={() => setIsExpenseModalOpen(true)}
              />
            )}
          </div>
        </Card>
      )}

      {/* Tab 3: Salary Records */}
      {activeTab === 'salary' && (
        <Card className="bg-[#121215] border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base text-zinc-100">Salary Records History</CardTitle>
            <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsSalaryModalOpen(true)}>
              Record Salary Slip
            </Button>
          </CardHeader>
          {salaries.length > 0 ? (
            <div className="divide-y divide-zinc-800/60">
              {salaries.map((sal) => (
                <div key={sal.id} className="py-4 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-800/20 rounded-lg">
                  <div>
                    <h4 className="text-base font-bold text-zinc-100">{sal.employer}</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">Credited: {sal.salary_date}</p>
                    <div className="flex gap-4 text-xs text-zinc-400 mt-2">
                      <span>Basic: {formatINR(sal.basic_salary)}</span>
                      <span>Allowances: +{formatINR(sal.allowances)}</span>
                      <span>Deductions: -{formatINR(sal.deductions)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-zinc-400 block">Net Take-Home</span>
                    <span className="text-xl font-bold text-emerald-400">{formatINR(sal.net_salary)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Briefcase className="w-6 h-6" />}
              title="No salary slips recorded"
              description="Keep an organized track of your monthly salary credits, allowances, and deductions."
              actionLabel="Record Salary"
              onAction={() => setIsSalaryModalOpen(true)}
            />
          )}
        </Card>
      )}

      {/* Tab 4: Savings Goals */}
      {activeTab === 'savings' && (
        <Card className="bg-[#121215] border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base text-zinc-100">Savings Goals</CardTitle>
            <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsSavingsModalOpen(true)}>
              New Savings Goal
            </Button>
          </CardHeader>
          {savings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {savings.map((g) => (
                <div key={g.id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-bold text-zinc-100">{g.name}</h4>
                    <Badge variant={g.is_achieved ? 'emerald' : 'zinc'} size="sm">
                      {g.progress_percentage}%
                    </Badge>
                  </div>
                  <div className="text-lg font-bold text-emerald-400">
                    {formatINR(g.current_amount)}{' '}
                    <span className="text-xs text-zinc-400 font-normal">/ {formatINR(g.target_amount)}</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2 mt-3">
                    <div
                      className="bg-emerald-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, g.progress_percentage)}%` }}
                    />
                  </div>
                  <div className="mt-2 text-[11px] text-zinc-400 flex justify-between">
                    <span>Target: {g.target_date || 'No deadline'}</span>
                    <span>Remaining: {formatINR(g.remaining_amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<PiggyBank className="w-6 h-6" />}
              title="No savings goals set"
              description="Define target goals for emergency funds, tech purchases, or long-term investments."
              actionLabel="Create Savings Goal"
              onAction={() => setIsSavingsModalOpen(true)}
            />
          )}
        </Card>
      )}

      {/* Tab 5: Budgets & Recurring */}
      {activeTab === 'budgets' && (
        <div className="space-y-6">
          {/* Monthly Budgets */}
          <Card className="bg-[#121215] border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base text-zinc-100">Monthly Category Budgets</CardTitle>
              <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsBudgetModalOpen(true)}>
                Set Budget
              </Button>
            </CardHeader>
            {budgets.length > 0 ? (
              <div className="space-y-4 pt-2">
                {budgets.map((b) => (
                  <div key={b.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-200 font-semibold">{b.category}</span>
                      <span className="text-zinc-400">
                        {formatINR(b.spent_amount)} spent / {formatINR(b.allocated_amount)} allocated ({b.spent_percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${b.spent_percentage > 100 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, b.spent_percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Wallet className="w-6 h-6" />}
                title="No monthly budgets defined"
                description="Set monthly spending limits for categories like Food, Travel, or Entertainment."
                actionLabel="Set Category Budget"
                onAction={() => setIsBudgetModalOpen(true)}
              />
            )}
          </Card>

          {/* Recurring Transactions */}
          <Card className="bg-[#121215] border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base text-zinc-100">Recurring Subscriptions & Incomes</CardTitle>
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Repeat className="w-4 h-4" />}
                onClick={() => processRecurringMutation.mutate()}
                isLoading={processRecurringMutation.isPending}
              >
                Process Due
              </Button>
            </CardHeader>
            {recurring.length > 0 ? (
              <div className="divide-y divide-zinc-800/60">
                {recurring.map((r) => (
                  <div key={r.id} className="py-3 px-2 flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-200">{r.title}</h4>
                      <p className="text-[11px] text-zinc-400">
                        {r.category} • Day {r.day_of_month} monthly • Last: {r.last_processed_date || 'Never'}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-zinc-100">{formatINR(r.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 py-6 text-center">
                No recurring monthly subscriptions configured.
              </p>
            )}
          </Card>
        </div>
      )}

      {/* Add Expense Modal */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Add Expense"
        description="Record an expense in INR (₹)"
      >
        <form onSubmit={handleExpenseSubmit} className="space-y-4">
          <Input
            label="Title"
            placeholder="e.g. Grocery Shopping, Metro Recharge"
            value={expenseTitle}
            onChange={(e) => setExpenseTitle(e.target.value)}
            required
          />
          <Input
            type="number"
            step="0.01"
            label="Amount (₹)"
            placeholder="0.00"
            value={expenseAmount}
            onChange={(e) => setExpenseAmount(e.target.value)}
            required
          />
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Category</label>
            <select
              value={expenseCategory}
              onChange={(e) => setExpenseCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Payment Method</label>
            <select
              value={expensePaymentMethod}
              onChange={(e) => setExpensePaymentMethod(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Net Banking">Net Banking</option>
              <option value="Cash">Cash</option>
            </select>
          </div>
          <Input
            type="date"
            label="Date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsExpenseModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={createExpenseMutation.isPending}>
              Save Expense
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Income Modal */}
      <Modal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        title="Add Income"
        description="Record an income credit in INR (₹)"
      >
        <form onSubmit={handleIncomeSubmit} className="space-y-4">
          <Input
            label="Title"
            placeholder="e.g. Freelance Project, Dividend, Gift"
            value={incomeTitle}
            onChange={(e) => setIncomeTitle(e.target.value)}
            required
          />
          <Input
            type="number"
            step="0.01"
            label="Amount (₹)"
            placeholder="0.00"
            value={incomeAmount}
            onChange={(e) => setIncomeAmount(e.target.value)}
            required
          />
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Category</label>
            <select
              value={incomeCategory}
              onChange={(e) => setIncomeCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="Salary">Salary</option>
              <option value="Freelancing">Freelancing</option>
              <option value="Business">Business</option>
              <option value="Investment">Investment</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <Input
            type="date"
            label="Date"
            value={incomeDate}
            onChange={(e) => setIncomeDate(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsIncomeModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={createIncomeMutation.isPending}>
              Save Income
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Salary Slip Modal */}
      <Modal
        isOpen={isSalaryModalOpen}
        onClose={() => setIsSalaryModalOpen(false)}
        title="Record Salary Slip"
        description="Log your monthly salary slip components."
      >
        <form onSubmit={handleSalarySubmit} className="space-y-4">
          <Input
            label="Employer Name"
            placeholder="e.g. Google India, Tech Mahindra"
            value={employer}
            onChange={(e) => setEmployer(e.target.value)}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              type="number"
              label="Basic Salary (₹)"
              placeholder="0.00"
              value={basicSalary}
              onChange={(e) => setBasicSalary(e.target.value)}
              required
            />
            <Input
              type="number"
              label="Allowances (₹)"
              placeholder="0.00"
              value={allowances}
              onChange={(e) => setAllowances(e.target.value)}
            />
            <Input
              type="number"
              label="Deductions (₹)"
              placeholder="0.00"
              value={deductions}
              onChange={(e) => setDeductions(e.target.value)}
            />
          </div>
          <Input
            type="date"
            label="Credit Date"
            value={salaryDate}
            onChange={(e) => setSalaryDate(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsSalaryModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={createSalaryMutation.isPending}>
              Save Salary Slip
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Savings Goal Modal */}
      <Modal
        isOpen={isSavingsModalOpen}
        onClose={() => setIsSavingsModalOpen(false)}
        title="Create Savings Goal"
        description="Track targets for gadgets, emergencies, or milestones."
      >
        <form onSubmit={handleSavingsSubmit} className="space-y-4">
          <Input
            label="Goal Name"
            placeholder="e.g. MacBook Pro M3, Emergency Fund"
            value={goalName}
            onChange={(e) => setGoalName(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              label="Target Amount (₹)"
              placeholder="150000"
              value={goalTargetAmount}
              onChange={(e) => setGoalTargetAmount(e.target.value)}
              required
            />
            <Input
              type="number"
              label="Current Saved (₹)"
              placeholder="0"
              value={goalCurrentAmount}
              onChange={(e) => setGoalCurrentAmount(e.target.value)}
            />
          </div>
          <Input
            type="date"
            label="Target Date (Optional)"
            value={goalTargetDate}
            onChange={(e) => setGoalTargetDate(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsSavingsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={createSavingsGoalMutation.isPending}>
              Create Goal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Set Category Budget Modal */}
      <Modal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        title="Set Category Monthly Budget"
        description={`Allocate spending limit for ${today.toLocaleString('default', { month: 'long' })}`}
      >
        <form onSubmit={handleBudgetSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Category</label>
            <select
              value={budgetCategory}
              onChange={(e) => setBudgetCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <Input
            type="number"
            label="Allocated Amount (₹)"
            placeholder="10000"
            value={budgetAllocatedAmount}
            onChange={(e) => setBudgetAllocatedAmount(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsBudgetModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={createBudgetMutation.isPending}>
              Save Budget
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
