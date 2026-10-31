import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Scale,
  Plus,
  Trash2,
  TrendingUp,
  Calendar,
  Info,
  Target,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardHeader, CardTitle } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LogWeightModal } from './LogWeightModal';
import { WeightSummary, WeightEntry } from '../../types';

export const WeightPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [isLogOpen, setIsLogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 1. Fetch Weight Summary
  const { data: summary, isLoading: loadingSummary } = useQuery<WeightSummary>({
    queryKey: ['weight-summary'],
    queryFn: async () => {
      const resp = await api.get('/weight/summary');
      return resp.data;
    },
  });

  // 2. Fetch Weight Entries
  const { data: entries = [], isLoading: loadingEntries } = useQuery<WeightEntry[]>({
    queryKey: ['weight-entries'],
    queryFn: async () => {
      const resp = await api.get('/weight');
      return resp.data;
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/weight/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weight-entries'] });
      queryClient.invalidateQueries({ queryKey: ['weight-summary'] });
      setDeletingId(null);
    },
  });

  const currentWeight = summary?.current_weight_kg || user?.profile?.current_weight_kg || 53.0;
  const targetWeight = summary?.target_weight_kg || user?.goals?.target_weight_kg || 60.0;
  const weightGap = Math.round((targetWeight - currentWeight) * 10) / 10;

  // Chart data from chronological history
  const chartData = (summary?.history || []).map((e) => ({
    date: e.date.slice(5),
    weight: e.weight_kg,
    target: targetWeight,
  }));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2.5">
            <Scale className="w-6 h-6 text-emerald-400" />
            Body Weight & Target Progression
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Tracking your trajectory towards {targetWeight} kg with rolling weekly averages.
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsLogOpen(true)}
        >
          Log Weight
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <span className="text-xs font-medium text-zinc-400 block mb-1">Current Weight</span>
          <div className="text-3xl font-extrabold text-zinc-100 font-mono">
            {currentWeight} <span className="text-sm font-normal text-zinc-500">kg</span>
          </div>
          <span className="text-xs text-zinc-500 mt-2 block">Latest logged entry</span>
        </Card>

        <Card>
          <span className="text-xs font-medium text-zinc-400 block mb-1">Target Weight</span>
          <div className="text-3xl font-extrabold text-emerald-400 font-mono">
            {targetWeight} <span className="text-sm font-normal text-zinc-500">kg</span>
          </div>
          <span className="text-xs text-zinc-500 mt-2 block">
            Gap: <strong className="text-zinc-200">{weightGap > 0 ? `+${weightGap}` : weightGap} kg</strong>
          </span>
        </Card>

        <Card>
          <span className="text-xs font-medium text-zinc-400 block mb-1">Weekly Rolling Avg</span>
          <div className="text-3xl font-extrabold text-blue-400 font-mono">
            {summary?.weekly_average_kg ? `${summary.weekly_average_kg} kg` : `${currentWeight} kg`}
          </div>
          <span className="text-xs text-zinc-500 mt-2 block">Smooths daily water shifts</span>
        </Card>

        <Card>
          <span className="text-xs font-medium text-zinc-400 block mb-1">Monthly Progression</span>
          <div className="text-3xl font-extrabold text-purple-400 font-mono">
            {summary?.monthly_change_kg !== null && summary?.monthly_change_kg !== undefined
              ? `${summary.monthly_change_kg > 0 ? '+' : ''}${summary.monthly_change_kg} kg`
              : 'Baseline'}
          </div>
          <span className="text-xs text-zinc-500 mt-2 block">Net 30-day change</span>
        </Card>
      </div>

      {/* Fluctuation Educational Callout */}
      <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-400 flex items-start gap-3">
        <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-zinc-200">Physiological Guidance:</strong> Daily body weight fluctuates by 0.5–1.5 kg due to hydration, sodium, and muscle glycogen stores. FITPULSE AI uses a 7-day rolling average to measure legitimate lean tissue and mass gain, rather than short-term fluctuations.
        </p>
      </div>

      {/* Weight Trend Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Weight Trend vs Goal Target ({targetWeight} kg)
            </CardTitle>
            <span className="text-xs text-zinc-400 font-mono">Chronological Weigh-Ins</span>
          </CardHeader>

          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" stroke="#52525b" fontSize={11} tickLine={false} />
                <YAxis domain={['auto', 'auto']} stroke="#52525b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                    borderRadius: '0.75rem',
                    color: '#f4f4f5',
                  }}
                />
                <ReferenceLine
                  y={targetWeight}
                  label={{ value: `Target (${targetWeight} kg)`, fill: '#10b981', fontSize: 11, position: 'top' }}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  name="Weight (kg)"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ fill: '#3b82f6', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Historical Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Calendar className="w-4 h-4 text-emerald-400" />
            Historical Weigh-In Log ({entries.length})
          </CardTitle>
        </CardHeader>

        {entries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 font-medium">
                  <th className="pb-3 px-3">Date</th>
                  <th className="pb-3 px-3">Weight (kg)</th>
                  <th className="pb-3 px-3">Gap to Target</th>
                  <th className="pb-3 px-3">Notes</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {entries.map((entry) => {
                  const diff = Math.round((targetWeight - entry.weight_kg) * 10) / 10;
                  return (
                    <tr key={entry.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 px-3 text-zinc-200">{entry.date}</td>
                      <td className="py-3 px-3 font-bold text-zinc-100">{entry.weight_kg} kg</td>
                      <td className="py-3 px-3 text-emerald-400">
                        {diff > 0 ? `+${diff} kg` : `${diff} kg`}
                      </td>
                      <td className="py-3 px-3 text-zinc-400 font-sans">
                        {entry.notes || '—'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setDeletingId(entry.id)}
                          className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<Scale className="w-6 h-6" />}
            title="No weight logs recorded"
            description="Log your daily or weekly weigh-in to track your mass trajectory toward your 60 kg goal."
            actionLabel="Log Weight"
            onAction={() => setIsLogOpen(true)}
          />
        )}
      </Card>

      {/* Modals */}
      <LogWeightModal
        isOpen={isLogOpen}
        onClose={() => setIsLogOpen(false)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['weight-entries'] });
          queryClient.invalidateQueries({ queryKey: ['weight-summary'] });
        }}
        currentWeight={currentWeight}
      />

      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => {
          if (deletingId) deleteMutation.mutate(deletingId);
        }}
        title="Delete Weight Entry"
        message="Are you sure you want to remove this weight record?"
        confirmLabel="Delete Entry"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
