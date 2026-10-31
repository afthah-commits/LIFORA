import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Footprints,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Gauge,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LogActivityModal } from './LogActivityModal';
import { ActivitySession, RunningSummary, FootballSummary } from '../../types';

export const ActivitiesPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [filterType, setFilterType] = useState<string>('all');
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [initialType, setInitialType] = useState<'running' | 'football'>('running');
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);

  // 1. Fetch Activities
  const { data: activities = [], isLoading } = useQuery<ActivitySession[]>({
    queryKey: ['activities', filterType],
    queryFn: async () => {
      const typeParam = filterType !== 'all' ? `?activity_type=${filterType}` : '';
      const resp = await api.get(`/activities${typeParam}`);
      return resp.data;
    },
  });

  // 2. Fetch Running Summary
  const { data: runningSummary } = useQuery<RunningSummary>({
    queryKey: ['running-summary'],
    queryFn: async () => {
      const resp = await api.get('/activities/running/summary');
      return resp.data;
    },
  });

  // 3. Fetch Football Summary
  const { data: footballSummary } = useQuery<FootballSummary>({
    queryKey: ['football-summary'],
    queryFn: async () => {
      const resp = await api.get('/activities/football/summary');
      return resp.data;
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/activities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['running-summary'] });
      queryClient.invalidateQueries({ queryKey: ['football-summary'] });
      setDeletingActivityId(null);
    },
  });

  // Running distance trend chart data
  const runningChartData = activities
    .filter((a) => a.activity_type === 'running' && a.distance_km)
    .slice(0, 15)
    .reverse()
    .map((a) => ({
      date: a.date.slice(5),
      km: a.distance_km,
      pace: a.calculated_pace || 'N/A',
    }));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2.5">
            <Footprints className="w-6 h-6 text-emerald-400" />
            Running & Football Tracker
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Log distance runs with pace calculations and track weekly football match volume.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setInitialType('football');
              setIsLogOpen(true);
            }}
          >
            ⚽ Log Football
          </Button>

          <Button
            size="sm"
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setInitialType('running');
              setIsLogOpen(true);
            }}
          >
            Log Run (5 km)
          </Button>
        </div>
      </div>

      {/* Summary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <span className="text-xs font-medium text-zinc-400 block mb-1">Total Running Distance</span>
          <div className="text-2xl font-bold text-zinc-100 font-mono">
            {runningSummary?.total_distance_km || 0}{' '}
            <span className="text-xs font-normal text-zinc-500">km</span>
          </div>
          <span className="text-xs text-zinc-500 mt-2 block">
            Target: 5.0 km/session
          </span>
        </Card>

        <Card>
          <span className="text-xs font-medium text-zinc-400 block mb-1">Average Running Pace</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {runningSummary?.average_pace || '--:--'}
          </div>
          <span className="text-xs text-zinc-500 mt-2 block">
            Across {runningSummary?.total_sessions || 0} run sessions
          </span>
        </Card>

        <Card>
          <span className="text-xs font-medium text-zinc-400 block mb-1">Weekly Running Volume</span>
          <div className="text-2xl font-bold text-zinc-100 font-mono">
            {runningSummary?.weekly_distance_km || 0}{' '}
            <span className="text-xs font-normal text-zinc-500">km</span>
          </div>
          <span className="text-xs text-zinc-500 mt-2 block">Last 7 days</span>
        </Card>

        <Card>
          <span className="text-xs font-medium text-zinc-400 block mb-1">Football Volume</span>
          <div className="text-2xl font-bold text-purple-400 font-mono">
            {footballSummary?.weekly_duration_minutes || 0}{' '}
            <span className="text-xs font-normal text-zinc-500">min this week</span>
          </div>
          <span className="text-xs text-zinc-500 mt-2 block">
            {footballSummary?.total_sessions || 0} total match sessions
          </span>
        </Card>
      </div>

      {/* Distance Trend Chart */}
      {runningChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Running Distance Progression
            </CardTitle>
            <span className="text-xs text-zinc-400 font-mono">Recent Sessions</span>
          </CardHeader>
          <div className="h-56 w-full mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={runningChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="runGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#52525b" fontSize={11} tickLine={false} />
                <YAxis stroke="#52525b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                    borderRadius: '0.75rem',
                    color: '#f4f4f5',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="km"
                  name="Distance (km)"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#runGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Activity Filter & Sessions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 p-1 bg-[#121215] border border-zinc-800 rounded-xl">
            {['all', 'running', 'football'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterType(tab)}
                className={`text-xs px-3 py-1.5 rounded-lg capitalize font-medium transition-colors ${
                  filterType === tab
                    ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab === 'all' ? 'All Activities' : tab}
              </button>
            ))}
          </div>
        </div>

        {activities.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {activities.map((act) => (
              <Card key={act.id} hoverEffect className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-emerald-400 shrink-0">
                      {act.activity_type === 'running' ? (
                        <Footprints className="w-5 h-5" />
                      ) : (
                        <span className="text-lg">⚽</span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-100 capitalize">
                          {act.activity_type} Session
                        </span>
                        <Badge
                          variant={act.activity_type === 'running' ? 'emerald' : 'purple'}
                          size="sm"
                        >
                          {act.duration_minutes} min
                        </Badge>
                        {act.effort_level && (
                          <Badge variant="zinc" size="sm">
                            Effort: {act.effort_level}
                          </Badge>
                        )}
                        {act.intensity && (
                          <Badge variant="zinc" size="sm">
                            Intensity: {act.intensity}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-zinc-400 mt-1 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                          {act.date}
                        </span>
                        {act.activity_type === 'running' && act.distance_km && (
                          <span>
                            Distance: <strong className="text-zinc-200">{act.distance_km} km</strong>
                          </span>
                        )}
                        {act.calculated_pace && (
                          <span>
                            Pace: <strong className="text-emerald-400">{act.calculated_pace}</strong>
                          </span>
                        )}
                      </div>

                      {act.notes && (
                        <p className="text-xs text-zinc-400 italic mt-2">Note: {act.notes}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setDeletingActivityId(act.id)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 rounded transition-colors"
                    title="Delete activity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Footprints className="w-6 h-6" />}
            title="No activities recorded yet"
            description="Log your runs or football sessions to track your aerobic output and weekly distance."
            actionLabel="Log Activity"
            onAction={() => setIsLogOpen(true)}
          />
        )}
      </div>

      {/* Modals */}
      <LogActivityModal
        isOpen={isLogOpen}
        onClose={() => setIsLogOpen(false)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['activities'] });
          queryClient.invalidateQueries({ queryKey: ['running-summary'] });
          queryClient.invalidateQueries({ queryKey: ['football-summary'] });
        }}
        initialType={initialType}
      />

      <ConfirmDialog
        isOpen={!!deletingActivityId}
        onClose={() => setDeletingActivityId(null)}
        onConfirm={() => {
          if (deletingActivityId) deleteMutation.mutate(deletingActivityId);
        }}
        title="Delete Activity Record"
        message="Are you sure you want to delete this activity record?"
        confirmLabel="Delete Activity"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
