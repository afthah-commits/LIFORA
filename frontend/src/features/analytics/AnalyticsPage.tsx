import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart as LineChartIcon,
  Flame,
  Award,
  Footprints,
  Dumbbell,
  Scale,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { AnalyticsOverview } from '../../types';

export const AnalyticsPage: React.FC = () => {
  const [periodDays, setPeriodDays] = useState<number>(30);

  const { data: analytics, isLoading } = useQuery<AnalyticsOverview>({
    queryKey: ['analytics-overview', periodDays],
    queryFn: async () => {
      const resp = await api.get(`/analytics/overview?days=${periodDays}`);
      return resp.data;
    },
  });

  const periods = [
    { label: 'Past 7 Days', days: 7 },
    { label: 'Past 30 Days', days: 30 },
    { label: 'Past 90 Days', days: 90 },
  ];

  // Nutrition trend formatted for Recharts
  const nutritionChartData = (analytics?.nutrition_trend || []).map((pt) => ({
    date: pt.date.slice(5),
    calories: pt.has_data ? pt.calories : null,
    protein: pt.has_data ? pt.protein_g : null,
  }));

  // Activity trend formatted for Recharts
  const activityChartData = (analytics?.activity_trend || []).map((pt) => ({
    date: pt.date.slice(5),
    runningKm: pt.running_distance_km || 0,
    footballMin: pt.football_duration_min || 0,
    workoutMin: pt.workout_duration_min || 0,
  }));

  // Weight trend formatted for Recharts
  const weightChartData = (analytics?.weight_trend || []).map((pt) => ({
    date: pt.date.slice(5),
    weight: pt.has_data ? pt.weight_kg : null,
  }));

  return (
    <div className="space-y-6">
      {/* Top Header & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2.5">
            <LineChartIcon className="w-6 h-6 text-emerald-400" />
            Fitness Analytics & Insights
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Data-backed progression across nutrition, training volume, and body weight.
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#121215] border border-zinc-800 rounded-xl">
          {periods.map((p) => (
            <button
              key={p.days}
              onClick={() => setPeriodDays(p.days)}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
                periodDays === p.days
                  ? 'bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <span className="text-xs font-medium text-zinc-400 block mb-1">Data Completeness</span>
          <div className="text-2xl font-bold text-zinc-100 font-mono">
            {analytics?.nutrition_days_recorded || 0}{' '}
            <span className="text-xs font-normal text-zinc-500">/ {analytics?.total_days_in_period || 0} days</span>
          </div>
          <span className="text-xs text-zinc-500 mt-2 block">
            {analytics?.nutrition_days_recorded
              ? `${Math.round((analytics.nutrition_days_recorded / analytics.total_days_in_period) * 100)}% tracking consistency`
              : 'Start logging daily'}
          </span>
        </Card>

        <Card>
          <span className="text-xs font-medium text-zinc-400 block mb-1">Average Daily Protein</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {analytics?.average_protein_g !== null && analytics?.average_protein_g !== undefined
              ? `${analytics.average_protein_g} g`
              : 'No entries'}
          </div>
          <span className="text-xs text-zinc-500 mt-2 block">
            Target: {analytics?.protein_target_g || 85} g ({analytics?.protein_goal_completion_rate || 0}% met)
          </span>
        </Card>

        <Card>
          <span className="text-xs font-medium text-zinc-400 block mb-1">Average Daily Calories</span>
          <div className="text-2xl font-bold text-zinc-100 font-mono">
            {analytics?.average_calories !== null && analytics?.average_calories !== undefined
              ? `${analytics.average_calories} kcal`
              : 'No entries'}
          </div>
          <span className="text-xs text-zinc-500 mt-2 block">Calculated only on recorded days</span>
        </Card>

        <Card>
          <span className="text-xs font-medium text-zinc-400 block mb-1">Total Training Output</span>
          <div className="text-2xl font-bold text-purple-400 font-mono">
            {analytics?.total_workout_sessions || 0} workouts
          </div>
          <span className="text-xs text-zinc-500 mt-2 block">
            + {analytics?.total_running_distance_km || 0} km runs • {analytics?.total_football_sessions || 0} football matches
          </span>
        </Card>
      </div>

      {/* 1. Nutrition & Protein Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Flame className="w-4 h-4 text-emerald-400" />
            Caloric & Protein Trend Over Period
          </CardTitle>
          <span className="text-xs text-zinc-400 font-mono">
            {analytics?.start_date} to {analytics?.end_date}
          </span>
        </CardHeader>
        <div className="h-64 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={nutritionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" stroke="#52525b" fontSize={11} tickLine={false} />
              <YAxis yAxisId="cals" stroke="#52525b" fontSize={11} tickLine={false} />
              <YAxis yAxisId="prot" orientation="right" stroke="#10b981" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  borderColor: '#27272a',
                  borderRadius: '0.75rem',
                  color: '#f4f4f5',
                }}
              />
              <Legend />
              <ReferenceLine
                yAxisId="prot"
                y={analytics?.protein_target_g || 85}
                stroke="#10b981"
                strokeDasharray="4 4"
                label={{ value: 'Protein Goal (85g)', fill: '#10b981', fontSize: 10, position: 'right' }}
              />
              <Line
                yAxisId="cals"
                type="monotone"
                dataKey="calories"
                name="Calories (kcal)"
                stroke="#f59e0b"
                strokeWidth={2}
                connectNulls={false}
                dot={{ r: 2 }}
              />
              <Line
                yAxisId="prot"
                type="monotone"
                dataKey="protein"
                name="Protein (g)"
                stroke="#10b981"
                strokeWidth={2.5}
                connectNulls={false}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 2. Activity Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Dumbbell className="w-4 h-4 text-emerald-400" />
            Physical Training Volume Breakdown
          </CardTitle>
          <span className="text-xs text-zinc-400 font-mono">Cardio, Football, & Strength</span>
        </CardHeader>
        <div className="h-64 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              <Legend />
              <Bar dataKey="workoutMin" name="Strength (min)" fill="#3b82f6" stackId="a" />
              <Bar dataKey="footballMin" name="Football (min)" fill="#a855f7" stackId="a" />
              <Bar dataKey="runningKm" name="Running (km)" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 3. Weight Trajectory Chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Scale className="w-4 h-4 text-emerald-400" />
            Weight Progression vs Goal ({analytics?.target_weight_kg || 60} kg)
          </CardTitle>
        </CardHeader>
        <div className="h-64 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weightChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                y={analytics?.target_weight_kg || 60}
                stroke="#10b981"
                strokeDasharray="4 4"
                label={{ value: 'Target (60kg)', fill: '#10b981', fontSize: 11 }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                name="Weight (kg)"
                stroke="#3b82f6"
                strokeWidth={2.5}
                connectNulls={false}
                dot={{ fill: '#3b82f6', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};
