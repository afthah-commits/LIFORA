import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck2,
  Plus,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  ArrowRightLeft,
  Trash2,
} from 'lucide-react';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { AddPlanItemModal } from './AddPlanItemModal';
import { WeeklyPlan, WeeklyPlanItem } from '../../types';

export const PlannerPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [currentWeekDate, setCurrentWeekDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // 1. Fetch Weekly Plan
  const { data: plan, isLoading } = useQuery<WeeklyPlan>({
    queryKey: ['weekly-plan', currentWeekDate],
    queryFn: async () => {
      const resp = await api.get(`/planner?week_date=${currentWeekDate}`);
      return resp.data;
    },
  });

  // Toggle completion mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ itemId, isCompleted }: { itemId: string; isCompleted: boolean }) => {
      await api.patch(`/planner/items/${itemId}`, { is_completed: isCompleted });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-plan', currentWeekDate] });
    },
  });

  // Replace running with football mutation
  const replaceMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await api.post(`/planner/items/${itemId}/replace-with-football?duration_minutes=90`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-plan', currentWeekDate] });
    },
  });

  // Delete item mutation
  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`/planner/items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-plan', currentWeekDate] });
    },
  });

  const handlePrevWeek = () => {
    const d = new Date(currentWeekDate);
    d.setDate(d.getDate() - 7);
    setCurrentWeekDate(d.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const d = new Date(currentWeekDate);
    d.setDate(d.getDate() + 7);
    setCurrentWeekDate(d.toISOString().split('T')[0]);
  };

  // Build the 7 days of this week starting Monday
  const weekStart = plan?.week_start_date ? new Date(plan.week_start_date) : new Date();
  const daysOfWeek = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return {
      dateStr: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: d.getDate(),
      isToday: d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0],
    };
  });

  const completedCount = (plan?.items || []).filter((i) => i.is_completed).length;
  const totalItemsCount = plan?.items?.length || 0;
  const completionRate = totalItemsCount > 0 ? Math.round((completedCount / totalItemsCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2.5">
            <CalendarCheck2 className="w-6 h-6 text-emerald-400" />
            Weekly Fitness Planner
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Schedule strength workouts, running targets, football matches, and active recovery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Card className="py-2 px-3 flex items-center gap-2.5">
            <span className="text-xs text-zinc-400">Week Progress:</span>
            <strong className="text-xs text-emerald-400 font-mono font-bold">
              {completedCount} / {totalItemsCount} ({completionRate}%)
            </strong>
          </Card>
        </div>
      </div>

      {/* Week Navigator */}
      <Card className="flex items-center justify-between py-3 px-4">
        <button
          onClick={handlePrevWeek}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-sm font-semibold text-zinc-100 font-mono">
          Week of {plan?.week_start_date || currentWeekDate}
        </div>

        <button
          onClick={handleNextWeek}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </Card>

      {/* 7-Day Planner Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
        {daysOfWeek.map((day) => {
          const dayItems = (plan?.items || []).filter((i) => i.planned_date === day.dateStr);

          return (
            <div
              key={day.dateStr}
              className={`rounded-2xl p-3.5 border flex flex-col justify-between min-h-[320px] transition-all ${
                day.isToday
                  ? 'bg-[#141816] border-emerald-500/40 shadow-sm shadow-emerald-500/5'
                  : 'bg-[#121215] border-zinc-800/80'
              }`}
            >
              <div>
                {/* Day Header */}
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-800/60">
                  <div>
                    <span className="text-xs font-bold text-zinc-200 block">{day.dayName}</span>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {day.dayNumber} {new Date(day.dateStr).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                  </div>
                  {day.isToday && <Badge variant="emerald" size="sm">Today</Badge>}
                </div>

                {/* Day's Activities */}
                <div className="space-y-2">
                  {dayItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-xl border text-xs space-y-1.5 transition-all ${
                        item.is_completed
                          ? 'bg-zinc-900/40 border-zinc-800 opacity-70'
                          : 'bg-[#18181b] border-zinc-700/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <button
                          onClick={() =>
                            toggleMutation.mutate({
                              itemId: item.id,
                              isCompleted: !item.is_completed,
                            })
                          }
                          className="flex items-center gap-1.5 font-semibold text-zinc-200 hover:text-emerald-400 text-left transition-colors truncate"
                        >
                          {item.is_completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-zinc-500 shrink-0" />
                          )}
                          <span className={`capitalize truncate ${item.is_completed ? 'line-through text-zinc-500' : ''}`}>
                            {item.activity_type}
                          </span>
                        </button>

                        <button
                          onClick={() => deleteMutation.mutate(item.id)}
                          className="text-zinc-600 hover:text-rose-400 p-0.5 shrink-0"
                          title="Remove item"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {item.duration_minutes && (
                        <div className="text-[11px] text-zinc-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          {item.duration_minutes} min
                        </div>
                      )}

                      {item.notes && (
                        <p className="text-[10px] text-zinc-400 leading-tight">
                          {item.notes}
                        </p>
                      )}

                      {item.replaced_by_football && (
                        <Badge variant="purple" size="sm" className="mt-1">
                          ⚽ Replaced Run
                        </Badge>
                      )}

                      {/* Requirement: Football sessions can replace planned running */}
                      {item.activity_type === 'running' && !item.replaced_by_football && !item.is_completed && (
                        <button
                          type="button"
                          onClick={() => replaceMutation.mutate(item.id)}
                          className="w-full mt-1.5 py-1 px-1.5 rounded text-[10px] bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 flex items-center justify-center gap-1 transition-colors"
                          title="Replace this planned run with a 90 min football match"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          Replace with Football
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Activity Button for this day */}
              <button
                onClick={() => {
                  setSelectedDayDate(day.dateStr);
                  setIsAddOpen(true);
                }}
                className="w-full mt-3 py-1.5 px-2 rounded-lg border border-dashed border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-800/40 text-zinc-400 hover:text-zinc-200 text-xs flex items-center justify-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Add Plan Item Modal */}
      {plan && (
        <AddPlanItemModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['weekly-plan', currentWeekDate] });
          }}
          planId={plan.id}
          defaultDate={selectedDayDate}
        />
      )}
    </div>
  );
};
