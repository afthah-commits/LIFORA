import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Flame,
  Droplets,
  IndianRupee,
  CalendarCheck2,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  UtensilsCrossed,
  Dumbbell,
  Scale,
  TrendingUp,
  Smartphone,
  Check,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useCustomizationStore } from '../../stores/customizationStore';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { OnboardingModal } from '../onboarding/OnboardingModal';
import {
  DailyNutritionSummary,
  DailyWaterSummary,
  FinanceOverviewResponse,
  WeeklyPlan,
  WeightSummary,
} from '../../types';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { config, fetchConfig, isFeatureEnabled } = useCustomizationStore();
  const queryClient = useQueryClient();
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchConfig();
  }, []);

  // Welcome / Onboarding modal state
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const isCompleted = localStorage.getItem('fitpulse_onboarding_completed');
    if (!isCompleted) {
      setShowOnboarding(true);
    }
  }, []);

  // Quick Action Modal states
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Quick action form states
  const [qaFoodName, setQaFoodName] = useState('');
  const [qaFoodMeal, setQaFoodMeal] = useState('Lunch');
  const [qaFoodCals, setQaFoodCals] = useState('450');
  const [qaFoodProtein, setQaFoodProtein] = useState('25');

  const [qaExpenseTitle, setQaExpenseTitle] = useState('');
  const [qaExpenseAmount, setQaExpenseAmount] = useState('');
  const [qaExpenseCategory, setQaExpenseCategory] = useState('Food');

  const [qaIncomeTitle, setQaIncomeTitle] = useState('');
  const [qaIncomeAmount, setQaIncomeAmount] = useState('');

  const [qaWeightVal, setQaWeightVal] = useState('53.0');

  const [qaWorkoutName, setQaWorkoutName] = useState('');
  const [qaWorkoutType, setQaWorkoutType] = useState('Strength');
  const [qaWorkoutDuration, setQaWorkoutDuration] = useState('45');

  const [qaAppName, setQaAppName] = useState('');
  const [qaAppMinutes, setQaAppMinutes] = useState('30');
  const [qaWaterAmount, setQaWaterAmount] = useState('250');
  const [qaTaskTitle, setQaTaskTitle] = useState('');

  // Custom module quick add state
  const [selectedCustomMod, setSelectedCustomMod] = useState<any | null>(null);
  const [customRecordData, setCustomRecordData] = useState<Record<string, any>>({});
  const [isSavingCustomRecord, setIsSavingCustomRecord] = useState(false);

  // 0. Fetch Custom Modules
  const { data: customModules } = useQuery<any[]>({
    queryKey: ['custom-modules'],
    queryFn: async () => {
      const resp = await api.get('/custom-modules');
      return resp.data || [];
    },
  });

  // 1. Fetch Nutrition
  const { data: nutrition } = useQuery<DailyNutritionSummary>({
    queryKey: ['nutrition-summary', todayStr],
    queryFn: async () => {
      const resp = await api.get(`/nutrition/daily-summary?target_date=${todayStr}`);
      return resp.data;
    },
  });

  // 2. Fetch Water
  const { data: waterDaily } = useQuery<DailyWaterSummary>({
    queryKey: ['water-daily', todayStr],
    queryFn: async () => {
      const resp = await api.get(`/water/daily?date_str=${todayStr}`);
      return resp.data;
    },
  });

  // 3. Fetch Finance Overview
  const { data: finance } = useQuery<FinanceOverviewResponse>({
    queryKey: ['finance-overview'],
    queryFn: async () => {
      const resp = await api.get('/finance/overview');
      return resp.data;
    },
  });

  // 4. Fetch Weekly Planner
  const { data: weeklyPlan } = useQuery<WeeklyPlan>({
    queryKey: ['weekly-plan', todayStr],
    queryFn: async () => {
      const resp = await api.get(`/planner?week_date=${todayStr}`);
      return resp.data;
    },
  });

  // 5. Fetch Weight
  const { data: weight } = useQuery<WeightSummary>({
    queryKey: ['weight-summary'],
    queryFn: async () => {
      const resp = await api.get('/weight/summary');
      return resp.data;
    },
  });

  // 6. Fetch Screen Time
  const { data: screenTimeDaily } = useQuery<{ total_minutes: number; top_app?: string }>({
    queryKey: ['screen-time-daily', todayStr],
    queryFn: async () => {
      try {
        const resp = await api.get(`/screen-time/daily?target_date=${todayStr}`);
        return resp.data;
      } catch {
        return { total_minutes: 0, top_app: 'None' };
      }
    },
  });

  // Invalidate queries helper
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['nutrition-summary'] });
    queryClient.invalidateQueries({ queryKey: ['water-daily'] });
    queryClient.invalidateQueries({ queryKey: ['finance-overview'] });
    queryClient.invalidateQueries({ queryKey: ['weekly-plan'] });
    queryClient.invalidateQueries({ queryKey: ['weight-summary'] });
    queryClient.invalidateQueries({ queryKey: ['screen-time-daily'] });
    setActiveModal(null);
    setIsQuickAddOpen(false);
  };

  // Mutations
  const addWaterMutation = useMutation({
    mutationFn: async (amount: number) => {
      return api.post('/water/entries', {
        amount_ml: amount,
        date: todayStr,
      });
    },
    onSuccess: invalidateAll,
  });

  const addFoodMutation = useMutation({
    mutationFn: async () => {
      return api.post('/food-entries', {
        date: todayStr,
        meal_type: qaFoodMeal,
        items: [
          {
            food_name: qaFoodName,
            quantity: 1,
            unit: 'serving',
            calories: parseFloat(qaFoodCals || '0'),
            protein_g: parseFloat(qaFoodProtein || '0'),
            carbs_g: 0,
            fat_g: 0,
          },
        ],
      });
    },
    onSuccess: invalidateAll,
  });

  const addExpenseMutation = useMutation({
    mutationFn: async () => {
      return api.post('/finance/expenses', {
        title: qaExpenseTitle,
        amount: parseFloat(qaExpenseAmount),
        category: qaExpenseCategory,
        payment_method: 'UPI',
        date: todayStr,
      });
    },
    onSuccess: invalidateAll,
  });

  const addIncomeMutation = useMutation({
    mutationFn: async () => {
      return api.post('/finance/incomes', {
        title: qaIncomeTitle,
        amount: parseFloat(qaIncomeAmount),
        category: 'Salary',
        payment_method: 'Bank Transfer',
        date: todayStr,
      });
    },
    onSuccess: invalidateAll,
  });

  const addWorkoutMutation = useMutation({
    mutationFn: async () => {
      return api.post('/workouts', {
        name: qaWorkoutName,
        type: qaWorkoutType,
        date: todayStr,
        duration_minutes: parseInt(qaWorkoutDuration, 10),
      });
    },
    onSuccess: invalidateAll,
  });

  const addWeightMutation = useMutation({
    mutationFn: async () => {
      return api.post('/weight', {
        date: todayStr,
        weight_kg: parseFloat(qaWeightVal),
      });
    },
    onSuccess: invalidateAll,
  });

  const addScreenTimeMutation = useMutation({
    mutationFn: async () => {
      return api.post('/screen-time/sessions', {
        app_name: qaAppName,
        category: 'Social Media',
        duration_minutes: parseInt(qaAppMinutes, 10),
        date: todayStr,
        source: 'manual',
      });
    },
    onSuccess: invalidateAll,
  });

  const addTaskMutation = useMutation({
    mutationFn: async () => {
      if (!weeklyPlan?.id) return;
      return api.post(`/planner/${weeklyPlan.id}/items`, {
        activity_type: 'strength',
        notes: qaTaskTitle,
        planned_date: todayStr,
        is_completed: false,
      });
    },
    onSuccess: invalidateAll,
  });

  // Dynamic Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const userName = user?.profile?.display_name || user?.email?.split('@')[0] || 'User';

  // Stats computation
  // Fitness
  const calConsumed = Math.round(nutrition?.total_calories || 0);
  const calTarget = user?.goals?.daily_calorie_target || 2400;
  const proteinConsumed = Math.round(nutrition?.total_protein_g || 0);
  const proteinTarget = user?.goals?.daily_protein_target_g || 85;

  // Water
  const waterConsumed = waterDaily?.total_consumed_ml || 0;
  const waterTarget = waterDaily?.daily_target_ml || 2500;
  const waterPercent = Math.min(100, Math.round((waterConsumed / (waterTarget || 2500)) * 100));

  // Money
  const monthlyBalance = (finance?.net_savings ?? 60000);
  const monthlyExpenses = (finance?.total_expenses ?? 25000);

  // Planner
  const todayTasks = (weeklyPlan?.items || []).filter((i) => i.planned_date === todayStr);
  const completedTasks = todayTasks.filter((i) => i.is_completed).length;
  const totalTasks = todayTasks.length;
  const plannerSummary =
    totalTasks > 0 ? `${completedTasks} of ${totalTasks} completed` : 'All tasks up to date';

  // Card renderer based on customization
  const renderCard = (cardId: string) => {
    const size = config.dashboard.card_sizes[cardId] || 'normal';
    const isWide = size === 'wide' || size === 'full';
    const colSpanClass = isWide ? 'col-span-1 sm:col-span-2' : '';

    if (cardId === 'fitness' && isFeatureEnabled('fitness')) {
      return (
        <Link
          key="fitness"
          to="/fitness"
          className={`group p-4 sm:p-5 rounded-2xl bg-[#121215] border border-zinc-800 hover:border-emerald-500/40 hover:bg-[#15151a] transition-all shadow-md space-y-3.5 ${colSpanClass}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Flame className="w-5 h-5 fill-emerald-500 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                  Fitness & Health
                </h3>
                <p className="text-[11px] text-zinc-500">Nutrition & workouts</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80">
            <div>
              <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium block">
                Calories
              </span>
              <span className="text-base sm:text-lg font-bold text-zinc-100">
                {calConsumed}{' '}
                <span className="text-[10px] text-zinc-500 font-normal">/ {calTarget} kcal</span>
              </span>
            </div>
            <div>
              <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium block">
                Protein
              </span>
              <span className="text-base sm:text-lg font-bold text-zinc-100">
                {proteinConsumed}g{' '}
                <span className="text-[10px] text-zinc-500 font-normal">/ {proteinTarget}g</span>
              </span>
            </div>
          </div>
        </Link>
      );
    }

    if (cardId === 'water' && isFeatureEnabled('water')) {
      return (
        <Link
          key="water"
          to="/water"
          className={`group p-4 sm:p-5 rounded-2xl bg-[#121215] border border-zinc-800 hover:border-cyan-500/40 hover:bg-[#15151a] transition-all shadow-md space-y-3.5 ${colSpanClass}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Droplets className="w-5 h-5 fill-cyan-500 text-cyan-500" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-100 group-hover:text-cyan-400 transition-colors">
                  Hydration & Water
                </h3>
                <p className="text-[11px] text-zinc-500">Daily water intake</p>
              </div>
            </div>
            <Badge variant="cyan" size="sm">{waterPercent}% Hydrated</Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80">
            <div>
              <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium block">
                Consumed
              </span>
              <span className="text-base sm:text-lg font-bold text-zinc-100">
                {waterConsumed}{' '}
                <span className="text-[10px] text-zinc-500 font-normal">/ {waterTarget} ml</span>
              </span>
            </div>
            <div>
              <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium block">
                Remaining
              </span>
              <span className="text-base sm:text-lg font-bold text-cyan-400">
                {Math.max(0, waterTarget - waterConsumed)}{' '}
                <span className="text-[10px] text-zinc-500 font-normal">ml</span>
              </span>
            </div>
          </div>
        </Link>
      );
    }

    if (cardId === 'money' && isFeatureEnabled('finance')) {
      return (
        <Link
          key="money"
          to="/finance"
          className={`group p-4 sm:p-5 rounded-2xl bg-[#121215] border border-zinc-800 hover:border-emerald-500/40 hover:bg-[#15151a] transition-all shadow-md space-y-3.5 ${colSpanClass}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <IndianRupee className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                  Money & Salary
                </h3>
                <p className="text-[11px] text-zinc-500">Income & expenses</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80">
            <div>
              <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium block">
                Savings Balance
              </span>
              <span className="text-base sm:text-lg font-bold text-emerald-400">
                ₹{monthlyBalance.toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium block">
                Monthly Spent
              </span>
              <span className="text-base sm:text-lg font-bold text-zinc-100">
                ₹{monthlyExpenses.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </Link>
      );
    }

    if (cardId === 'planner' && isFeatureEnabled('planner')) {
      return (
        <Link
          key="planner"
          to="/planner"
          className={`group p-4 sm:p-5 rounded-2xl bg-[#121215] border border-zinc-800 hover:border-blue-500/40 hover:bg-[#15151a] transition-all shadow-md space-y-3.5 ${colSpanClass}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <CalendarCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-100 group-hover:text-blue-400 transition-colors">
                  Daily Planner
                </h3>
                <p className="text-[11px] text-zinc-500">Tasks & schedule</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80">
            <div>
              <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium block">
                Today's Tasks
              </span>
              <span className="text-base sm:text-lg font-bold text-zinc-100">
                {totalTasks > 0 ? `${completedTasks}/${totalTasks}` : '0 planned'}
              </span>
            </div>
            <div>
              <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium block">
                Status
              </span>
              <span className="text-xs sm:text-sm font-semibold text-zinc-200 block truncate mt-0.5">
                {totalTasks === 0
                  ? 'Free Day'
                  : completedTasks === totalTasks
                  ? 'All Done 🎉'
                  : `${totalTasks - completedTasks} remaining`}
              </span>
            </div>
          </div>
        </Link>
      );
    }

    if (cardId === 'screentime' && isFeatureEnabled('screentime')) {
      const totalMins = screenTimeDaily?.total_minutes || 0;
      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      return (
        <Link
          key="screentime"
          to="/screen-time"
          className={`group p-4 sm:p-5 rounded-2xl bg-[#121215] border border-zinc-800 hover:border-purple-500/40 hover:bg-[#15151a] transition-all shadow-md space-y-3.5 ${colSpanClass}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-100 group-hover:text-purple-400 transition-colors">
                  Screen Time
                </h3>
                <p className="text-[11px] text-zinc-500">Digital wellbeing</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80">
            <div>
              <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium block">
                Today's Usage
              </span>
              <span className="text-base sm:text-lg font-bold text-zinc-100">
                {hours}h {mins}m
              </span>
            </div>
            <div>
              <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium block">
                Top App
              </span>
              <span className="text-xs sm:text-sm font-semibold text-purple-400 block truncate mt-0.5">
                {screenTimeDaily?.top_app || 'No data yet'}
              </span>
            </div>
          </div>
        </Link>
      );
    }

    const customWidget = config.dashboard.custom_widgets?.find((w) => w.id === cardId);
    if (customWidget) {
      return (
        <Link
          key={customWidget.id}
          to={customWidget.target || '#'}
          className={`group p-4 sm:p-5 rounded-2xl bg-[#121215] border border-zinc-800 hover:border-emerald-500/40 hover:bg-[#15151a] transition-all shadow-md space-y-3.5 ${colSpanClass}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 text-emerald-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                  {customWidget.title}
                </h3>
                <p className="text-[11px] text-zinc-500 capitalize">{customWidget.type}</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
            <span>Custom Widget</span>
            <span className="text-emerald-400 font-medium">Open →</span>
          </div>
        </Link>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 1. Welcoming Header */}
      {config.widgets.show_greeting && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#031d1a] to-[#042420] border border-emerald-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-400">
                LIFORA Operating System
              </span>
              <Badge variant="emerald" size="sm">Active</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
              {getGreeting()},{' '}
              <span className="text-emerald-400 capitalize">{userName}</span>
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200/70 mt-1">
              Your Life. Your Space. Your Rules. Here is your essential daily overview.
            </p>
          </div>

          {/* Primary Quick Add Button */}
          {config.widgets.show_quick_add_button && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(true)}
                className="h-11 px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                aria-label="Quick Add"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Quick Add</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. CORE PILLARS / CARDS */}
      {config.widgets.show_core_pillars && (
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Today's Core Pillars
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-zinc-500">Tap card to view details</span>
              <Link
                to="/customization"
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium hover:underline"
              >
                Customize
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {(config.dashboard.card_order || ['fitness', 'water', 'money', 'planner'])
              .filter((cardId) => config.dashboard.visible_cards.includes(cardId))
              .map((cardId) => renderCard(cardId))}
          </div>
        </div>
      )}

      {/* 3. TODAY'S PROGRESS SECTION */}
      {config.widgets.show_progress_checklist && (
        <div className="p-5 rounded-3xl bg-[#121215] border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
                Today's Progress
              </h2>
            </div>
            <span className="text-xs text-zinc-500">Daily Checklist</span>
          </div>

          <div className="space-y-3">
            {/* Hydration Milestone */}
            {isFeatureEnabled('water') && (
              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                    <Droplets className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 truncate">Water Hydration</p>
                    <p className="text-[11px] text-zinc-500">
                      {waterConsumed} ml of {waterTarget} ml target
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden xs:block w-24 bg-zinc-800 rounded-full h-2">
                    <div className="bg-cyan-500 h-2 rounded-full" style={{ width: `${waterPercent}%` }} />
                  </div>
                  <span className="text-xs font-bold text-cyan-400 shrink-0">{waterPercent}%</span>
                </div>
              </div>
            )}

            {/* Nutrition Milestone */}
            {isFeatureEnabled('fitness') && (
              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                    <UtensilsCrossed className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 truncate">Protein & Nutrition</p>
                    <p className="text-[11px] text-zinc-500">
                      {proteinConsumed}g of {proteinTarget}g daily protein target
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden xs:block w-24 bg-zinc-800 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full"
                      style={{
                        width: `${Math.min(100, Math.round((proteinConsumed / proteinTarget) * 100))}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-emerald-400 shrink-0">
                    {Math.min(100, Math.round((proteinConsumed / proteinTarget) * 100))}%
                  </span>
                </div>
              </div>
            )}

            {/* Daily Schedule Milestone */}
            {isFeatureEnabled('planner') && (
              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                    <CalendarCheck2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 truncate">Daily Planning</p>
                    <p className="text-[11px] text-zinc-500">{plannerSummary}</p>
                  </div>
                </div>
                <Link to="/planner">
                  <Button size="sm" variant="ghost" className="text-blue-400 text-xs px-2.5">
                    Open Planner
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. 1-TAP HYDRATION QUICK BAR */}
      {config.widgets.show_hydration_bar && isFeatureEnabled('water') && (
        <div className="p-4 rounded-2xl bg-[#121215] border border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-zinc-200">1-Tap Water:</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => addWaterMutation.mutate(100)}
              disabled={addWaterMutation.isPending}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-bold transition-all active:scale-95"
            >
              +100ml
            </button>
            <button
              type="button"
              onClick={() => addWaterMutation.mutate(250)}
              disabled={addWaterMutation.isPending}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-bold transition-all active:scale-95"
            >
              +250ml
            </button>
            <button
              type="button"
              onClick={() => addWaterMutation.mutate(500)}
              disabled={addWaterMutation.isPending}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-bold transition-all active:scale-95"
            >
              +500ml
            </button>
            <button
              type="button"
              onClick={() => setActiveModal('water')}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-all"
            >
              Custom...
            </button>
          </div>
        </div>
      )}

      {/* QUICK ADD MODAL SELECTOR */}
      <Modal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        title="Quick Log"
        description="Choose what you want to record today"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => {
              setIsQuickAddOpen(false);
              setActiveModal('water');
            }}
            className="p-4 rounded-2xl bg-zinc-900 hover:bg-cyan-500/10 border border-zinc-800 hover:border-cyan-500/30 text-left transition-all space-y-1.5 group"
          >
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Droplets className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-zinc-100 group-hover:text-cyan-400 block">
              Water
            </span>
            <span className="text-[10px] text-zinc-500 block">Quick hydration</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsQuickAddOpen(false);
              setActiveModal('food');
            }}
            className="p-4 rounded-2xl bg-zinc-900 hover:bg-emerald-500/10 border border-zinc-800 hover:border-emerald-500/30 text-left transition-all space-y-1.5 group"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-zinc-100 group-hover:text-emerald-400 block">
              Food / Meal
            </span>
            <span className="text-[10px] text-zinc-500 block">Calories & protein</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsQuickAddOpen(false);
              setActiveModal('expense');
            }}
            className="p-4 rounded-2xl bg-zinc-900 hover:bg-rose-500/10 border border-zinc-800 hover:border-rose-500/30 text-left transition-all space-y-1.5 group"
          >
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-zinc-100 group-hover:text-rose-400 block">
              Expense
            </span>
            <span className="text-[10px] text-zinc-500 block">Log daily spend</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsQuickAddOpen(false);
              setActiveModal('workout');
            }}
            className="p-4 rounded-2xl bg-zinc-900 hover:bg-blue-500/10 border border-zinc-800 hover:border-blue-500/30 text-left transition-all space-y-1.5 group"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Dumbbell className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-zinc-100 group-hover:text-blue-400 block">
              Workout
            </span>
            <span className="text-[10px] text-zinc-500 block">Training session</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsQuickAddOpen(false);
              setActiveModal('weight');
            }}
            className="p-4 rounded-2xl bg-zinc-900 hover:bg-amber-500/10 border border-zinc-800 hover:border-amber-500/30 text-left transition-all space-y-1.5 group"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-zinc-100 group-hover:text-amber-400 block">
              Weight
            </span>
            <span className="text-[10px] text-zinc-500 block">Morning weight</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsQuickAddOpen(false);
              setActiveModal('task');
            }}
            className="p-4 rounded-2xl bg-zinc-900 hover:bg-purple-500/10 border border-zinc-800 hover:border-purple-500/30 text-left transition-all space-y-1.5 group"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <CalendarCheck2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-zinc-100 group-hover:text-purple-400 block">
              Task
            </span>
            <span className="text-[10px] text-zinc-500 block">To-do item</span>
          </button>

          {/* Active Dynamic Custom Modules */}
          {customModules?.filter((m: any) => m.is_active).map((mod: any) => (
            <button
              key={mod.id}
              type="button"
              onClick={() => {
                setIsQuickAddOpen(false);
                setSelectedCustomMod(mod);
                setCustomRecordData({});
              }}
              className="p-4 rounded-2xl bg-zinc-900 hover:bg-emerald-500/10 border border-zinc-800 hover:border-emerald-500/30 text-left transition-all space-y-1.5 group"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-zinc-100 group-hover:text-emerald-400 block truncate">
                {mod.name}
              </span>
              <span className="text-[10px] text-zinc-500 block truncate">Custom Record</span>
            </button>
          ))}
        </div>
      </Modal>

      {/* Dynamic Custom Module Log Modal */}
      <Modal
        isOpen={!!selectedCustomMod}
        onClose={() => {
          setSelectedCustomMod(null);
          setCustomRecordData({});
        }}
        title={`Log ${selectedCustomMod?.name || 'Custom Record'}`}
        description={selectedCustomMod?.description || 'Enter values for this custom tracking entry'}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!selectedCustomMod) return;
            setIsSavingCustomRecord(true);
            try {
              await api.post(`/custom-modules/${selectedCustomMod.id}/records`, {
                data: customRecordData,
              });
              setSelectedCustomMod(null);
              setCustomRecordData({});
              queryClient.invalidateQueries({ queryKey: ['custom-modules'] });
            } catch (err) {
              console.error('Failed to log custom record:', err);
            } finally {
              setIsSavingCustomRecord(false);
            }
          }}
          className="space-y-4"
        >
          {selectedCustomMod?.fields?.map((field: any) => (
            <div key={field.name || field.id}>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                {field.label} {field.is_required && <span className="text-rose-400">*</span>}
              </label>
              {field.field_type === 'select' && field.options ? (
                <select
                  value={customRecordData[field.name] || ''}
                  onChange={(e) =>
                    setCustomRecordData({ ...customRecordData, [field.name]: e.target.value })
                  }
                  required={field.is_required}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select an option</option>
                  {field.options.map((opt: string) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : field.field_type === 'checkbox' ? (
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={!!customRecordData[field.name]}
                    onChange={(e) =>
                      setCustomRecordData({ ...customRecordData, [field.name]: e.target.checked })
                    }
                    className="rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Mark as true</span>
                </label>
              ) : field.field_type === 'textarea' ? (
                <textarea
                  value={customRecordData[field.name] || ''}
                  onChange={(e) =>
                    setCustomRecordData({ ...customRecordData, [field.name]: e.target.value })
                  }
                  required={field.is_required}
                  rows={3}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              ) : (
                <input
                  type={
                    field.field_type === 'number' || field.field_type === 'currency'
                      ? 'number'
                      : field.field_type === 'date'
                      ? 'date'
                      : 'text'
                  }
                  value={customRecordData[field.name] || ''}
                  onChange={(e) =>
                    setCustomRecordData({ ...customRecordData, [field.name]: e.target.value })
                  }
                  required={field.is_required}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              )}
            </div>
          ))}

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCustomMod(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSavingCustomRecord}
              className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold"
            >
              Save Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* Water Modal */}
      <Modal
        isOpen={activeModal === 'water'}
        onClose={() => setActiveModal(null)}
        title="Quick Log Water"
        description="Record water intake"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => addWaterMutation.mutate(100)}
              className="p-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-bold text-center transition-all active:scale-95"
            >
              +100 ml
            </button>
            <button
              type="button"
              onClick={() => addWaterMutation.mutate(250)}
              className="p-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-bold text-center transition-all active:scale-95"
            >
              +250 ml
            </button>
            <button
              type="button"
              onClick={() => addWaterMutation.mutate(500)}
              className="p-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-bold text-center transition-all active:scale-95"
            >
              +500 ml
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const val = parseInt(qaWaterAmount, 10);
              if (val > 0) addWaterMutation.mutate(val);
            }}
            className="space-y-4 pt-2 border-t border-zinc-800"
          >
            <Input
              type="number"
              label="Custom Quantity (ml)"
              value={qaWaterAmount}
              onChange={(e) => setQaWaterAmount(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={addWaterMutation.isPending}>
                Save Water
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Food Modal */}
      <Modal
        isOpen={activeModal === 'food'}
        onClose={() => setActiveModal(null)}
        title="Quick Log Food"
        description="Add a meal to today's log"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addFoodMutation.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="Food / Meal Name"
            placeholder="e.g. Chicken Rice"
            value={qaFoodName}
            onChange={(e) => setQaFoodName(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              label="Calories (kcal)"
              value={qaFoodCals}
              onChange={(e) => setQaFoodCals(e.target.value)}
              required
            />
            <Input
              type="number"
              label="Protein (g)"
              value={qaFoodProtein}
              onChange={(e) => setQaFoodProtein(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={addFoodMutation.isPending}>
              Save Food
            </Button>
          </div>
        </form>
      </Modal>

      {/* Expense Modal */}
      <Modal
        isOpen={activeModal === 'expense'}
        onClose={() => setActiveModal(null)}
        title="Quick Log Expense"
        description="Record a spend transaction in ₹ INR"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addExpenseMutation.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="Expense Description"
            placeholder="e.g. Groceries, Gym equipment"
            value={qaExpenseTitle}
            onChange={(e) => setQaExpenseTitle(e.target.value)}
            required
          />
          <Input
            type="number"
            label="Amount (₹)"
            placeholder="e.g. 450"
            value={qaExpenseAmount}
            onChange={(e) => setQaExpenseAmount(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={addExpenseMutation.isPending}>
              Save Expense
            </Button>
          </div>
        </form>
      </Modal>

      {/* Workout Modal */}
      <Modal
        isOpen={activeModal === 'workout'}
        onClose={() => setActiveModal(null)}
        title="Quick Log Workout"
        description="Add a training session"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addWorkoutMutation.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="Workout Name"
            placeholder="e.g. Upper Body Strength"
            value={qaWorkoutName}
            onChange={(e) => setQaWorkoutName(e.target.value)}
            required
          />
          <Input
            type="number"
            label="Duration (minutes)"
            value={qaWorkoutDuration}
            onChange={(e) => setQaWorkoutDuration(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={addWorkoutMutation.isPending}>
              Save Workout
            </Button>
          </div>
        </form>
      </Modal>

      {/* Weight Modal */}
      <Modal
        isOpen={activeModal === 'weight'}
        onClose={() => setActiveModal(null)}
        title="Quick Log Weight"
        description="Record today's body weight"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addWeightMutation.mutate();
          }}
          className="space-y-4"
        >
          <Input
            type="number"
            step="0.1"
            label="Weight (kg)"
            value={qaWeightVal}
            onChange={(e) => setQaWeightVal(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={addWeightMutation.isPending}>
              Save Weight
            </Button>
          </div>
        </form>
      </Modal>

      {/* Task Modal */}
      <Modal
        isOpen={activeModal === 'task'}
        onClose={() => setActiveModal(null)}
        title="Quick Add Task"
        description="Add an item to today's planner"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addTaskMutation.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="Task Description"
            placeholder="e.g. Read 20 pages, Gym at 6 PM"
            value={qaTaskTitle}
            onChange={(e) => setQaTaskTitle(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={addTaskMutation.isPending}>
              Save Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* First-Time Welcome & Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => {
          queryClient.invalidateQueries();
        }}
      />
    </div>
  );
};
export default DashboardPage;
