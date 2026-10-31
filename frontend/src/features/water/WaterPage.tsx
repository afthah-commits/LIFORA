import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Droplets,
  Plus,
  Trash2,
  Edit2,
  Settings2,
  Bell,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { EmptyState } from '../../components/common/EmptyState';
import {
  DailyWaterSummary,
  WaterEntry,
  WaterGoal,
  WeeklyWaterSummary,
} from '../../types';

export const WaterPage: React.FC = () => {
  const queryClient = useQueryClient();
  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WaterEntry | null>(null);

  // Form states
  const [customAmount, setCustomAmount] = useState('250');
  const [entryNotes, setEntryNotes] = useState('');
  const [goalTarget, setGoalTarget] = useState('2500');
  const [goalReminderEnabled, setGoalReminderEnabled] = useState(true);
  const [goalReminderHours, setGoalReminderHours] = useState('2');

  // 1. Fetch Daily Summary
  const { data: dailySummary, isLoading: loadingDaily } = useQuery<DailyWaterSummary>({
    queryKey: ['water-daily', selectedDate],
    queryFn: async () => {
      const res = await api.get(`/water/daily?date_str=${selectedDate}`);
      return res.data;
    },
  });

  // 2. Fetch Goal
  const { data: waterGoal } = useQuery<WaterGoal>({
    queryKey: ['water-goal'],
    queryFn: async () => {
      const res = await api.get('/water/goal');
      return res.data;
    },
  });

  // 3. Fetch Weekly Summary
  const { data: weeklySummary } = useQuery<WeeklyWaterSummary>({
    queryKey: ['water-weekly', selectedDate],
    queryFn: async () => {
      const res = await api.get(`/water/weekly?end_date_str=${selectedDate}`);
      return res.data;
    },
  });

  // Invalidate queries
  const invalidateWater = () => {
    queryClient.invalidateQueries({ queryKey: ['water-daily'] });
    queryClient.invalidateQueries({ queryKey: ['water-weekly'] });
    queryClient.invalidateQueries({ queryKey: ['water-goal'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    queryClient.invalidateQueries({ queryKey: ['analytics-7d'] });
  };

  // Mutations
  const logWaterMutation = useMutation({
    mutationFn: async (amount: number) => {
      return api.post('/water/entries', {
        amount_ml: amount,
        date: selectedDate,
        notes: entryNotes || undefined,
      });
    },
    onSuccess: () => {
      invalidateWater();
      setIsCustomModalOpen(false);
      setEntryNotes('');
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: async ({ id, amount, notes }: { id: string; amount: number; notes?: string }) => {
      return api.put(`/water/entries/${id}`, { amount_ml: amount, notes });
    },
    onSuccess: () => {
      invalidateWater();
      setEditingEntry(null);
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/water/entries/${id}`);
    },
    onSuccess: invalidateWater,
  });

  const updateGoalMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.put('/water/goal', payload);
    },
    onSuccess: () => {
      invalidateWater();
      setIsGoalModalOpen(false);
    },
  });

  // Quick 1-tap handler
  const handleQuickLog = (amount: number) => {
    logWaterMutation.mutate(amount);
  };

  const consumed = dailySummary?.total_consumed_ml || 0;
  const target = dailySummary?.daily_target_ml || waterGoal?.daily_target_ml || 2500;
  const remaining = Math.max(0, target - consumed);
  const progressPct = Math.min(100, Math.round((consumed / target) * 100));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#101924] to-[#121c2a] border border-cyan-900/30">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-wider font-semibold text-cyan-400">
              Personal Hydration
            </span>
            <Badge variant="emerald" size="sm">
              {progressPct >= 100 ? 'Goal Reached 🎉' : `${progressPct}% Hydrated`}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 flex items-center gap-2">
            <Droplets className="w-7 h-7 text-cyan-400" /> Water Tracker
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Log water in one tap, stay energized, and track your daily hydration habit.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-750 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
          />
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Settings2 className="w-4 h-4" />}
            onClick={() => {
              setGoalTarget(String(target));
              setGoalReminderEnabled(waterGoal?.reminder_enabled ?? true);
              setGoalReminderHours(String(waterGoal?.reminder_interval_hours ?? 2));
              setIsGoalModalOpen(true);
            }}
          >
            Daily Goal
          </Button>
        </div>
      </div>

      {/* Main Visual Progress Card */}
      <Card className="bg-[#121215] border-zinc-800 p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Visual Hydration Circular / Wave Indicator */}
          <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                className="text-zinc-800"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
              />
              {/* Progress circle with smooth stroke */}
              <circle
                cx="50"
                cy="50"
                r="40"
                className="text-cyan-400 transition-all duration-700 ease-out"
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - progressPct / 100)}`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <Droplets className="w-6 h-6 text-cyan-400 mb-1" />
              <span className="text-3xl font-extrabold text-zinc-100">{consumed}</span>
              <span className="text-[11px] font-medium text-zinc-400">of {target} ml</span>
            </div>
          </div>

          {/* Quick Metrics & Touch-Friendly 1-Tap Buttons */}
          <div className="flex-1 space-y-5 w-full">
            {/* Stat Row */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <span className="text-[11px] text-zinc-400 block">Daily Goal</span>
                <span className="text-lg font-bold text-zinc-100 block mt-0.5">{target} ml</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <span className="text-[11px] text-cyan-400 font-medium block">Consumed</span>
                <span className="text-lg font-bold text-cyan-300 block mt-0.5">{consumed} ml</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <span className="text-[11px] text-zinc-400 block">Remaining</span>
                <span className="text-lg font-bold text-zinc-100 block mt-0.5">{remaining} ml</span>
              </div>
            </div>

            {/* 1-Tap Quick Quantity Buttons */}
            <div>
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-2.5">
                Quick Log (1-Tap)
              </span>
              <div className="grid grid-cols-4 gap-2.5">
                <button
                  onClick={() => handleQuickLog(100)}
                  disabled={logWaterMutation.isPending}
                  className="py-3 px-2 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/40 text-cyan-300 font-bold text-xs flex flex-col items-center gap-1 transition-all active:scale-95 hover:border-cyan-500/50"
                >
                  <span className="text-sm">+100 ml</span>
                  <span className="text-[10px] text-cyan-500 font-normal">Small Cup</span>
                </button>
                <button
                  onClick={() => handleQuickLog(250)}
                  disabled={logWaterMutation.isPending}
                  className="py-3 px-2 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/40 text-cyan-300 font-bold text-xs flex flex-col items-center gap-1 transition-all active:scale-95 hover:border-cyan-500/50"
                >
                  <span className="text-sm">+250 ml</span>
                  <span className="text-[10px] text-cyan-500 font-normal">Glass</span>
                </button>
                <button
                  onClick={() => handleQuickLog(500)}
                  disabled={logWaterMutation.isPending}
                  className="py-3 px-2 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/40 text-cyan-300 font-bold text-xs flex flex-col items-center gap-1 transition-all active:scale-95 hover:border-cyan-500/50"
                >
                  <span className="text-sm">+500 ml</span>
                  <span className="text-[10px] text-cyan-500 font-normal">Bottle</span>
                </button>
                <button
                  onClick={() => setIsCustomModalOpen(true)}
                  className="py-3 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-300 font-semibold text-xs flex flex-col items-center gap-1 transition-all active:scale-95 hover:border-zinc-600"
                >
                  <span className="text-sm">Custom</span>
                  <span className="text-[10px] text-zinc-500 font-normal">Enter ml</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Middle: 7-Day Trend Chart & Today's Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend Chart */}
        <Card className="bg-[#121215] border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base text-zinc-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" /> 7-Day Hydration
            </CardTitle>
            <Badge variant="cyan" size="sm">
              Avg: {weeklySummary?.daily_average_ml || 0} ml
            </Badge>
          </CardHeader>

          <div className="h-52 pt-2">
            {weeklySummary && weeklySummary.daily_breakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklySummary.daily_breakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day_name" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={10} tickFormatter={(v) => `${v}ml`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val: any) => [`${val} ml`, 'Consumed']}
                  />
                  <ReferenceLine y={target} stroke="#06b6d4" strokeDasharray="3 3" />
                  <Bar dataKey="consumed_ml" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-zinc-500 py-12 text-center">No logs recorded this week.</p>
            )}
          </div>
        </Card>

        {/* Daily Water Log History */}
        <Card className="bg-[#121215] border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base text-zinc-100">
              Entries for {selectedDate === todayStr ? 'Today' : selectedDate}
            </CardTitle>
            <span className="text-xs text-zinc-400">
              {dailySummary?.entries_count || 0} entries
            </span>
          </CardHeader>

          {loadingDaily ? (
            <div className="py-8 text-center text-xs text-zinc-500">Loading entries...</div>
          ) : dailySummary && dailySummary.entries.length > 0 ? (
            <div className="divide-y divide-zinc-800/60 max-h-56 overflow-y-auto">
              {dailySummary.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="py-2.5 px-3 flex items-center justify-between hover:bg-zinc-800/20 rounded-lg transition-colors text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 font-bold">
                      <Droplets className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-zinc-100">{entry.amount_ml} ml</span>
                      <div className="text-[11px] text-zinc-500">
                        {entry.time} {entry.notes && `• ${entry.notes}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingEntry(entry)}
                      className="p-1.5 text-zinc-500 hover:text-cyan-400 rounded hover:bg-cyan-500/10"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteEntryMutation.mutate(entry.id)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 rounded hover:bg-rose-500/10"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Droplets className="w-6 h-6 text-cyan-400" />}
              title="No water logged yet"
              description="Tap +250 ml or any quick quantity above to record your first glass."
              actionLabel="Add 250 ml"
              onAction={() => handleQuickLog(250)}
            />
          )}
        </Card>
      </div>

      {/* 1. Custom Amount Modal */}
      <Modal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        title="Log Custom Water Quantity"
        description="Enter the exact amount of water consumed."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const val = parseInt(customAmount, 10);
            if (val > 0) logWaterMutation.mutate(val);
          }}
          className="space-y-4"
        >
          <Input
            type="number"
            label="Amount (ml)"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Notes (Optional)"
            placeholder="e.g. Infused lemon water, herbal tea"
            value={entryNotes}
            onChange={(e) => setEntryNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCustomModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={logWaterMutation.isPending}>
              Log Water
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Edit Entry Modal */}
      <Modal
        isOpen={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        title="Edit Water Entry"
        description="Update the recorded amount or notes."
      >
        {editingEntry && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const val = parseInt(String(editingEntry.amount_ml), 10);
              if (val > 0) {
                updateEntryMutation.mutate({
                  id: editingEntry.id,
                  amount: val,
                  notes: editingEntry.notes || undefined,
                });
              }
            }}
            className="space-y-4"
          >
            <Input
              type="number"
              label="Amount (ml)"
              value={String(editingEntry.amount_ml)}
              onChange={(e) =>
                setEditingEntry({ ...editingEntry, amount_ml: parseInt(e.target.value, 10) || 0 })
              }
              required
            />
            <Input
              label="Notes"
              value={editingEntry.notes || ''}
              onChange={(e) => setEditingEntry({ ...editingEntry, notes: e.target.value })}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditingEntry(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={updateEntryMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* 3. Daily Goal & Reminders Modal */}
      <Modal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        title="Hydration Target & Reminders"
        description="Set your daily intake goal and reminder preferences."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateGoalMutation.mutate({
              daily_target_ml: parseInt(goalTarget, 10),
              reminder_enabled: goalReminderEnabled,
              reminder_interval_hours: parseInt(goalReminderHours, 10),
            });
          }}
          className="space-y-4"
        >
          <Input
            type="number"
            label="Daily Target (ml)"
            value={goalTarget}
            onChange={(e) => setGoalTarget(e.target.value)}
            required
          />

          <div className="pt-2 border-t border-zinc-800 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-200">
              <input
                type="checkbox"
                checked={goalReminderEnabled}
                onChange={(e) => setGoalReminderEnabled(e.target.checked)}
                className="rounded border-zinc-700 text-cyan-500 focus:ring-cyan-500 w-4 h-4"
              />
              <span className="font-medium">Enable Hydration Reminders</span>
            </label>

            {goalReminderEnabled && (
              <Input
                type="number"
                label="Reminder Interval (Hours)"
                value={goalReminderHours}
                onChange={(e) => setGoalReminderHours(e.target.value)}
                required
              />
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsGoalModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={updateGoalMutation.isPending}>
              Update Target
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
