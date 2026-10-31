import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Flame,
  UtensilsCrossed,
  Dumbbell,
  Footprints,
  Scale,
  Plus,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Trophy,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardHeader, CardTitle } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import {
  DailyNutritionSummary,
  WeightSummary,
  RunningSummary,
  FootballSummary,
  WorkoutSession,
} from '../../types';

export const FitnessPage: React.FC = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const todayStr = new Date().toISOString().split('T')[0];

  // Quick modals
  const [activeModal, setActiveModal] = useState<'food' | 'workout' | 'weight' | null>(null);

  // Form states
  const [foodName, setFoodName] = useState('');
  const [foodMeal, setFoodMeal] = useState('Lunch');
  const [foodCals, setFoodCals] = useState('450');
  const [foodProtein, setFoodProtein] = useState('25');

  const [workoutName, setWorkoutName] = useState('');
  const [workoutType, setWorkoutType] = useState('Strength');
  const [workoutDuration, setWorkoutDuration] = useState('45');

  const [weightVal, setWeightVal] = useState('53.0');

  // Queries
  const { data: nutrition } = useQuery<DailyNutritionSummary>({
    queryKey: ['nutrition-summary', todayStr],
    queryFn: async () => {
      const resp = await api.get(`/nutrition/daily-summary?target_date=${todayStr}`);
      return resp.data;
    },
  });

  const { data: weight } = useQuery<WeightSummary>({
    queryKey: ['weight-summary'],
    queryFn: async () => {
      const resp = await api.get('/weight/summary');
      return resp.data;
    },
  });

  const { data: runningSummary } = useQuery<RunningSummary>({
    queryKey: ['running-summary'],
    queryFn: async () => {
      const resp = await api.get('/activities/running/summary');
      return resp.data;
    },
  });

  const { data: footballSummary } = useQuery<FootballSummary>({
    queryKey: ['football-summary'],
    queryFn: async () => {
      const resp = await api.get('/activities/football/summary');
      return resp.data;
    },
  });

  const { data: workouts = [] } = useQuery<WorkoutSession[]>({
    queryKey: ['workouts-recent'],
    queryFn: async () => {
      const resp = await api.get('/workouts');
      return resp.data;
    },
  });

  // Invalidate queries
  const invalidateFitness = () => {
    queryClient.invalidateQueries({ queryKey: ['nutrition-summary'] });
    queryClient.invalidateQueries({ queryKey: ['weight-summary'] });
    queryClient.invalidateQueries({ queryKey: ['workouts-recent'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    setActiveModal(null);
  };

  const addFoodMutation = useMutation({
    mutationFn: async () => {
      return api.post('/food-entries', {
        date: todayStr,
        meal_type: foodMeal,
        items: [
          {
            food_name: foodName,
            quantity: 1,
            unit: 'serving',
            calories: parseFloat(foodCals || '0'),
            protein_g: parseFloat(foodProtein || '0'),
            carbs_g: 0,
            fat_g: 0,
          },
        ],
      });
    },
    onSuccess: () => {
      invalidateFitness();
      setFoodName('');
    },
  });

  const addWorkoutMutation = useMutation({
    mutationFn: async () => {
      return api.post('/workouts', {
        name: workoutName,
        type: workoutType,
        date: todayStr,
        duration_minutes: parseInt(workoutDuration, 10),
      });
    },
    onSuccess: () => {
      invalidateFitness();
      setWorkoutName('');
    },
  });

  const addWeightMutation = useMutation({
    mutationFn: async () => {
      return api.post('/weight', {
        date: todayStr,
        weight_kg: parseFloat(weightVal),
      });
    },
    onSuccess: invalidateFitness,
  });

  // Stats calculation
  const targetCalories = user?.goals?.daily_calorie_target || 2400;
  const currentCalories = nutrition?.total_calories || 0;
  const targetProtein = user?.goals?.daily_protein_target_g || 85;
  const currentProtein = nutrition?.total_protein_g || 0;

  const currentWeight = weight?.current_weight_kg || user?.profile?.current_weight_kg || 53.0;
  const targetWeight = user?.goals?.target_weight_kg || 60.0;
  const weightProgress = Math.min(
    100,
    Math.max(0, Math.round(((currentWeight - 53) / (targetWeight - 53 || 1)) * 100))
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#121215] to-[#16161c] border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
              FITPULSE AI
            </span>
            <Badge variant="emerald" size="sm">Fitness Hub</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 flex items-center gap-2">
            <Flame className="w-7 h-7 text-emerald-400 fill-emerald-400" /> Fitness & Health
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Your unified physical wellness, nutrition, workouts, and weight progress.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<UtensilsCrossed className="w-4 h-4" />}
            onClick={() => setActiveModal('food')}
          >
            Log Food
          </Button>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Dumbbell className="w-4 h-4" />}
            onClick={() => setActiveModal('workout')}
          >
            Log Workout
          </Button>
        </div>
      </div>

      {/* 4 SIMPLIFIED PILLAR CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Nutrition & Food Card */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 hover:border-zinc-700 transition-all space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-100">Food & Nutrition</h2>
                <p className="text-xs text-zinc-500">Today's calorie & protein intake</p>
              </div>
            </div>
            <Link
              to="/nutrition"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
            >
              Details <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800/80">
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-[11px] text-zinc-400 font-medium block">Calories</span>
              <span className="text-lg font-bold text-zinc-100">
                {Math.round(currentCalories)}{' '}
                <span className="text-xs font-normal text-zinc-500">/ {targetCalories} kcal</span>
              </span>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, Math.round((currentCalories / targetCalories) * 100))}%` }}
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-[11px] text-zinc-400 font-medium block">Protein</span>
              <span className="text-lg font-bold text-zinc-100">
                {Math.round(currentProtein)}g{' '}
                <span className="text-xs font-normal text-zinc-500">/ {targetProtein}g</span>
              </span>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2">
                <div
                  className="bg-emerald-400 h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, Math.round((currentProtein / targetProtein) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              variant="ghost"
              className="text-emerald-400 text-xs"
              onClick={() => setActiveModal('food')}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Meal
            </Button>
          </div>
        </div>

        {/* 2. Workouts Card */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 hover:border-zinc-700 transition-all space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Dumbbell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-100">Workouts & Gym</h2>
                <p className="text-xs text-zinc-500">Strength & physical training</p>
              </div>
            </div>
            <Link
              to="/workouts"
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
            >
              Details <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800/80">
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-[11px] text-zinc-400 font-medium block">Total Sessions</span>
              <span className="text-lg font-bold text-zinc-100">{workouts.length}</span>
              <p className="text-[10px] text-zinc-500 mt-1">Logged workouts</p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-[11px] text-zinc-400 font-medium block">Latest Session</span>
              <span className="text-sm font-bold text-zinc-100 truncate block">
                {workouts[0]?.name || 'No sessions yet'}
              </span>
              <p className="text-[10px] text-zinc-500 mt-1">
                {workouts[0] ? `${workouts[0].duration_minutes}m duration` : 'Tap below to log'}
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              variant="ghost"
              className="text-blue-400 text-xs"
              onClick={() => setActiveModal('workout')}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Workout
            </Button>
          </div>
        </div>

        {/* 3. Running & Football Card */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 hover:border-zinc-700 transition-all space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <Footprints className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-100">Running & Football</h2>
                <p className="text-xs text-zinc-500">Outdoor endurance and match sessions</p>
              </div>
            </div>
            <Link
              to="/activities"
              className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1"
            >
              Details <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800/80">
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-[11px] text-zinc-400 font-medium block">Running Target</span>
              <span className="text-lg font-bold text-zinc-100">
                {user?.goals?.running_target_km || 5.0} <span className="text-xs font-normal text-zinc-500">km</span>
              </span>
              <p className="text-[10px] text-zinc-500 mt-1">
                {runningSummary?.total_sessions || 0} runs completed
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-[11px] text-zinc-400 font-medium block">Football</span>
              <span className="text-lg font-bold text-zinc-100">
                {footballSummary?.total_sessions || 0}{' '}
                <span className="text-xs font-normal text-zinc-500">sessions</span>
              </span>
              <p className="text-[10px] text-zinc-500 mt-1">
                {footballSummary?.total_duration_minutes || 0} min total played
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Link to="/activities">
              <Button size="sm" variant="ghost" className="text-purple-400 text-xs" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                Manage Activities
              </Button>
            </Link>
          </div>
        </div>

        {/* 4. Weight Progress Card */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 hover:border-zinc-700 transition-all space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-100">Body Weight</h2>
                <p className="text-xs text-zinc-500">Progress toward target bodyweight</p>
              </div>
            </div>
            <Link
              to="/weight"
              className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
            >
              Details <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800/80">
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-[11px] text-zinc-400 font-medium block">Current Weight</span>
              <span className="text-lg font-bold text-zinc-100">
                {currentWeight} <span className="text-xs font-normal text-zinc-500">kg</span>
              </span>
              <p className="text-[10px] text-zinc-500 mt-1">Target: {targetWeight} kg</p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-[11px] text-zinc-400 font-medium block">Remaining</span>
              <span className="text-lg font-bold text-emerald-400">
                {Math.max(0, targetWeight - currentWeight).toFixed(1)}{' '}
                <span className="text-xs font-normal text-zinc-500">kg to gain</span>
              </span>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2">
                <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${weightProgress}%` }} />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              variant="ghost"
              className="text-amber-400 text-xs"
              onClick={() => setActiveModal('weight')}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Log Weight
            </Button>
          </div>
        </div>
      </div>

      {/* QUICK ADD MODALS */}
      {/* Food Modal */}
      <Modal
        isOpen={activeModal === 'food'}
        onClose={() => setActiveModal(null)}
        title="Quick Log Food"
        description="Record a meal or nutrition entry"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addFoodMutation.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="Meal Name"
            placeholder="e.g. Chicken Rice, Protein Shake"
            value={foodName}
            onChange={(e) => setFoodName(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              label="Calories (kcal)"
              value={foodCals}
              onChange={(e) => setFoodCals(e.target.value)}
              required
            />
            <Input
              type="number"
              label="Protein (g)"
              value={foodProtein}
              onChange={(e) => setFoodProtein(e.target.value)}
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
            placeholder="e.g. Upper Body Hypertrophy"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Type</label>
              <select
                value={workoutType}
                onChange={(e) => setWorkoutType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="Strength">Strength</option>
                <option value="Cardio">Cardio</option>
                <option value="HIIT">HIIT</option>
                <option value="Mobility">Mobility</option>
              </select>
            </div>
            <Input
              type="number"
              label="Duration (Minutes)"
              value={workoutDuration}
              onChange={(e) => setWorkoutDuration(e.target.value)}
              required
            />
          </div>
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
        description="Record today's morning weight"
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
            value={weightVal}
            onChange={(e) => setWeightVal(e.target.value)}
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
    </div>
  );
};
export default FitnessPage;
