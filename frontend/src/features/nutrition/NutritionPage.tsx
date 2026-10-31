import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UtensilsCrossed,
  Plus,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Calendar,
  Apple,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardHeader, CardTitle } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { AddFoodModal } from './AddFoodModal';
import { AddCustomFoodModal } from './AddCustomFoodModal';
import { FoodAiScannerModal } from './FoodAiScannerModal';
import { DailyNutritionSummary, FoodEntry } from '../../types';

export const NutritionPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);
  const [isAiScannerOpen, setIsAiScannerOpen] = useState(false);
  const [activeMealType, setActiveMealType] = useState('Breakfast');

  // Deletion state
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  // 1. Fetch Daily Summary
  const { data: summary, isLoading: loadingSummary } = useQuery<DailyNutritionSummary>({
    queryKey: ['nutrition-summary', selectedDate],
    queryFn: async () => {
      const resp = await api.get(`/nutrition/daily-summary?target_date=${selectedDate}`);
      return resp.data;
    },
  });

  // 2. Fetch Entries for the day
  const { data: entries = [], isLoading: loadingEntries } = useQuery<FoodEntry[]>({
    queryKey: ['food-entries', selectedDate],
    queryFn: async () => {
      const resp = await api.get(`/food-entries?entry_date=${selectedDate}`);
      return resp.data;
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/food-entries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-entries', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-summary', selectedDate] });
      setDeletingEntryId(null);
    },
  });

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const proteinTarget = user?.goals?.daily_protein_target_g || 85;
  const currentProtein = summary?.total_protein_g || 0;
  const proteinPercent = Math.min(Math.round((currentProtein / proteinTarget) * 100), 100);

  const mealTypes = ['Breakfast', 'Morning Snack', 'Lunch', 'Evening Snack', 'Dinner', 'Other'];

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2.5">
            <UtensilsCrossed className="w-6 h-6 text-emerald-400" />
            Food & Nutrition Tracker
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Track daily calories, macros, and maintain your {proteinTarget}g protein intake.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Sparkles className="w-4 h-4 text-emerald-400" />}
            onClick={() => setIsAiScannerOpen(true)}
          >
            AI Photo Scanner
          </Button>

          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Apple className="w-4 h-4" />}
            onClick={() => setIsAddCustomOpen(true)}
          >
            New Custom Food
          </Button>

          <Button
            size="sm"
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setActiveMealType('Breakfast');
              setIsAddFoodOpen(true);
            }}
          >
            Log Meal
          </Button>
        </div>
      </div>

      {/* Date Navigator Bar */}
      <Card className="flex items-center justify-between py-3 px-4">
        <button
          onClick={handlePrevDay}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100 font-mono">
          <Calendar className="w-4 h-4 text-emerald-400" />
          {new Date(selectedDate).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
          {selectedDate === new Date().toISOString().split('T')[0] && (
            <Badge variant="emerald" size="sm">Today</Badge>
          )}
        </div>

        <button
          onClick={handleNextDay}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </Card>

      {/* Daily Nutrition Totals & Protein Target Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Daily Protein Target</CardTitle>
            <span className="text-xs text-zinc-400 font-mono">{proteinPercent}% reached</span>
          </CardHeader>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-emerald-400">{currentProtein}</span>
            <span className="text-sm text-zinc-400">/ {proteinTarget} g target</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${proteinPercent}%` }}
            />
          </div>
          <p className="text-xs text-zinc-400 mt-2.5">
            {currentProtein >= proteinTarget
              ? '🎉 Protein target hit for today! Excellent muscle recovery fuel.'
              : `${Math.round((proteinTarget - currentProtein) * 10) / 10}g needed to reach your target.`}
          </p>
        </Card>

        {/* Calories */}
        <Card>
          <span className="text-xs font-medium text-zinc-400 block mb-1">Total Calories</span>
          <div className="text-2xl font-bold text-zinc-100 font-mono">
            {summary?.total_calories || 0} <span className="text-xs font-normal text-zinc-500">kcal</span>
          </div>
          <div className="mt-3 text-xs text-zinc-400">
            {user?.goals?.daily_calorie_target
              ? `Target: ${user.goals.daily_calorie_target} kcal`
              : 'Calorie target: Configurable in Settings'}
          </div>
        </Card>

        {/* Macros */}
        <Card>
          <span className="text-xs font-medium text-zinc-400 block mb-1">Macronutrient Split</span>
          <div className="space-y-1.5 text-xs text-zinc-300 mt-2 font-mono">
            <div className="flex justify-between">
              <span className="text-zinc-400">Carbohydrates:</span>
              <strong className="text-zinc-100">{summary?.total_carbs_g || 0}g</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Fat:</span>
              <strong className="text-zinc-100">{summary?.total_fat_g || 0}g</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Dietary Fiber:</span>
              <strong className="text-zinc-100">{summary?.total_fiber_g || 0}g</strong>
            </div>
          </div>
        </Card>
      </div>

      {/* Meals Breakdown & Logged Entries */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-100">Meals Recorded</h2>

        {entries.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {mealTypes.map((mType) => {
              const mealEntries = entries.filter((e) => e.meal_type === mType);
              if (mealEntries.length === 0) return null;

              return (
                <Card key={mType}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-zinc-100">{mType}</span>
                      <Badge variant="emerald" size="sm">
                        {mealEntries.reduce((sum, e) => sum + e.total_calories, 0)} kcal
                      </Badge>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setActiveMealType(mType);
                        setIsAddFoodOpen(true);
                      }}
                    >
                      Add Item
                    </Button>
                  </CardHeader>

                  <div className="space-y-3">
                    {mealEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-400">
                            {entry.items.length} item(s) logged
                          </span>
                          <button
                            onClick={() => setDeletingEntryId(entry.id)}
                            className="text-zinc-500 hover:text-rose-400 p-1 rounded transition-colors"
                            title="Delete meal entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="divide-y divide-zinc-800/60">
                          {entry.items.map((item) => (
                            <div
                              key={item.id}
                              className="py-1.5 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-medium text-zinc-200">{item.food_name}</span>
                                <span className="text-zinc-500 ml-2">
                                  {item.quantity} {item.unit}
                                </span>
                              </div>
                              <div className="text-zinc-400 font-mono">
                                {item.calories} kcal •{' '}
                                <strong className="text-emerald-400">{item.protein_g}g P</strong>
                              </div>
                            </div>
                          ))}
                        </div>

                        {entry.notes && (
                          <p className="text-[11px] text-zinc-500 italic pt-1 border-t border-zinc-800/50">
                            Note: {entry.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<UtensilsCrossed className="w-6 h-6" />}
            title={`No meals logged for ${selectedDate}`}
            description="Start logging your meals or scan a food photo with AI to track your daily calories and protein."
            actionLabel="Log Food Entry"
            onAction={() => setIsAddFoodOpen(true)}
          />
        )}
      </div>

      {/* Modals */}
      <AddFoodModal
        isOpen={isAddFoodOpen}
        onClose={() => setIsAddFoodOpen(false)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['food-entries', selectedDate] });
          queryClient.invalidateQueries({ queryKey: ['nutrition-summary', selectedDate] });
        }}
        initialMealType={activeMealType}
        selectedDate={selectedDate}
      />

      <AddCustomFoodModal
        isOpen={isAddCustomOpen}
        onClose={() => setIsAddCustomOpen(false)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['foods-search'] });
        }}
      />

      <FoodAiScannerModal
        isOpen={isAiScannerOpen}
        onClose={() => setIsAiScannerOpen(false)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['food-entries', selectedDate] });
          queryClient.invalidateQueries({ queryKey: ['nutrition-summary', selectedDate] });
        }}
        selectedDate={selectedDate}
      />

      <ConfirmDialog
        isOpen={!!deletingEntryId}
        onClose={() => setDeletingEntryId(null)}
        onConfirm={() => {
          if (deletingEntryId) deleteMutation.mutate(deletingEntryId);
        }}
        title="Delete Food Entry"
        message="Are you sure you want to remove this logged meal entry? This action cannot be undone."
        confirmLabel="Delete Entry"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
