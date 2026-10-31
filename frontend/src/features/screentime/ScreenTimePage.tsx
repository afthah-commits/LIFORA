import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Smartphone,
  Plus,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Trash2,
  RefreshCw,
  Info,
  Upload,
  Image as ImageIcon,
  Edit2,
  History,
  ExternalLink,
  Check,
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
  DailyScreenTimeSummary,
  ExtractedScreenTimeItem,
  ScreenTimeGoal,
  ScreenTimeImportHistoryItem,
  ScreenTimeImportReviewResponse,
  ScreenTimeSession,
  WeeklyScreenTimeSummary,
} from '../../types';

const CATEGORIES = [
  'Social Media',
  'Entertainment',
  'Productivity',
  'Communication',
  'Education',
  'Other',
];

export const ScreenTimePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Modals
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form states for manual log
  const [appName, setAppName] = useState('');
  const [category, setCategory] = useState('Social Media');
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('30');
  const [notes, setNotes] = useState('');

  // Form states for session edit
  const [editingSession, setEditingSession] = useState<ScreenTimeSession | null>(null);
  const [editAppName, setEditAppName] = useState('');
  const [editCategory, setEditCategory] = useState('Social Media');
  const [editHours, setEditHours] = useState('0');
  const [editMinutes, setEditMinutes] = useState('0');
  const [editNotes, setEditNotes] = useState('');

  // Form states for goal
  const [goalMinutes, setGoalMinutes] = useState('240');

  // Screenshot Upload & Review States
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<ScreenTimeImportReviewResponse | null>(null);
  const [reviewDate, setReviewDate] = useState<string>(selectedDate);
  const [editableItems, setEditableItems] = useState<
    Array<{ app_name: string; category: string; duration_minutes: number; notes?: string }>
  >([]);

  // Queries
  const { data: goal } = useQuery<ScreenTimeGoal>({
    queryKey: ['screen-time-goal'],
    queryFn: async () => {
      const res = await api.get('/screen-time/goal');
      return res.data;
    },
  });

  const { data: dailySummary, isLoading: loadingDaily } = useQuery<DailyScreenTimeSummary>({
    queryKey: ['screen-time-daily', selectedDate],
    queryFn: async () => {
      const res = await api.get(`/screen-time/daily?date_str=${selectedDate}`);
      return res.data;
    },
  });

  const { data: weeklySummary } = useQuery<WeeklyScreenTimeSummary>({
    queryKey: ['screen-time-weekly', selectedDate],
    queryFn: async () => {
      const res = await api.get(`/screen-time/weekly?end_date_str=${selectedDate}`);
      return res.data;
    },
  });

  const { data: importHistory = [] } = useQuery<ScreenTimeImportHistoryItem[]>({
    queryKey: ['screen-time-imports'],
    queryFn: async () => {
      const res = await api.get('/screen-time/imports');
      return res.data;
    },
  });

  // Mutations
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['screen-time-daily'] });
    queryClient.invalidateQueries({ queryKey: ['screen-time-weekly'] });
    queryClient.invalidateQueries({ queryKey: ['screen-time-imports'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
  };

  const createSessionMutation = useMutation({
    mutationFn: async (payload: any) => api.post('/screen-time/sessions', payload),
    onSuccess: () => {
      invalidateAll();
      setIsLogModalOpen(false);
      setAppName('');
      setHours('0');
      setMinutes('30');
      setNotes('');
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return api.put(`/screen-time/sessions/${id}`, payload);
    },
    onSuccess: () => {
      invalidateAll();
      setIsEditModalOpen(false);
      setEditingSession(null);
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: async (daily_target_minutes: number) => {
      return api.put('/screen-time/goal', { daily_target_minutes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screen-time-goal'] });
      invalidateAll();
      setIsGoalModalOpen(false);
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/screen-time/sessions/${id}`),
    onSuccess: invalidateAll,
  });

  // Screenshot Upload Mutation
  const uploadScreenshotMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadError(null);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('target_date', selectedDate);
      const res = await api.post('/screen-time/upload-screenshot', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data as ScreenTimeImportReviewResponse;
    },
    onSuccess: (data) => {
      setReviewData(data);
      setReviewDate(data.detected_date);
      setEditableItems(
        data.items.map((it) => ({
          app_name: it.app_name,
          category: it.category,
          duration_minutes: it.duration_minutes,
        }))
      );
      setIsUploadModalOpen(false);
      setIsReviewModalOpen(true);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to process screenshot. Please check the file.';
      setUploadError(msg);
    },
  });

  // Confirm Import Mutation
  const confirmImportMutation = useMutation({
    mutationFn: async () => {
      if (!reviewData?.id) return;
      return api.post(`/screen-time/imports/${reviewData.id}/confirm`, {
        target_date: reviewDate,
        items: editableItems,
      });
    },
    onSuccess: () => {
      invalidateAll();
      setIsReviewModalOpen(false);
      setReviewData(null);
      setScreenshotFile(null);
      setScreenshotPreview(null);
      setSelectedDate(reviewDate);
    },
  });

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    const duration = parseInt(hours || '0', 10) * 60 + parseInt(minutes || '0', 10);
    if (!appName.trim() || duration <= 0) return;

    createSessionMutation.mutate({
      app_name: appName.trim(),
      category,
      duration_minutes: duration,
      date: selectedDate,
      notes: notes.trim() || null,
      source: 'manual',
    });
  };

  const handleEditSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;
    const duration = parseInt(editHours || '0', 10) * 60 + parseInt(editMinutes || '0', 10);
    if (!editAppName.trim() || duration <= 0) return;

    updateSessionMutation.mutate({
      id: editingSession.id,
      payload: {
        app_name: editAppName.trim(),
        category: editCategory,
        duration_minutes: duration,
        notes: editNotes.trim() || null,
      },
    });
  };

  const openEditModal = (sess: ScreenTimeSession) => {
    setEditingSession(sess);
    setEditAppName(sess.app_name);
    setEditCategory(sess.category);
    setEditHours(String(Math.floor(sess.duration_minutes / 60)));
    setEditMinutes(String(sess.duration_minutes % 60));
    setEditNotes(sess.notes || '');
    setIsEditModalOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setScreenshotFile(file);
      setUploadError(null);
      const reader = new FileReader();
      reader.onload = () => setScreenshotPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAddReviewRow = () => {
    setEditableItems((prev) => [
      ...prev,
      { app_name: 'New App', category: 'Other', duration_minutes: 30 },
    ]);
  };

  const handleRemoveReviewRow = (idx: number) => {
    setEditableItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleReviewItemChange = (idx: number, field: string, val: any) => {
    setEditableItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  const totalMin = dailySummary?.total_duration_minutes || 0;
  const targetMin = dailySummary?.daily_target_minutes || goal?.daily_target_minutes || 240;
  const remainingMin = dailySummary?.remaining_allowed_minutes || 0;
  const isOver = dailySummary?.is_over_limit || false;
  const progressPct = Math.min(100, Math.round((totalMin / (targetMin || 1)) * 100));

  const formatHoursMins = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const reviewTotalMinutes = editableItems.reduce(
    (acc, curr) => acc + (curr.duration_minutes || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#121215] to-[#16161c] border border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
              Mobile Digital Wellbeing
            </span>
            <Badge variant={isOver ? 'rose' : 'emerald'} size="sm">
              {isOver ? 'Over Limit' : 'On Track'}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 flex items-center gap-2">
            <Smartphone className="w-7 h-7 text-emerald-400" /> Screen Time Tracker
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Track daily mobile usage, import Android Digital Wellbeing screenshots, and manage app limits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
          />
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Upload className="w-4 h-4 text-emerald-400" />}
            onClick={() => {
              setScreenshotFile(null);
              setScreenshotPreview(null);
              setUploadError(null);
              setIsUploadModalOpen(true);
            }}
          >
            Import Screenshot
          </Button>
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Target className="w-4 h-4" />}
            onClick={() => {
              setGoalMinutes(String(targetMin));
              setIsGoalModalOpen(true);
            }}
          >
            Daily Limit ({formatHoursMins(targetMin)})
          </Button>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsLogModalOpen(true)}
          >
            Manual Entry
          </Button>
        </div>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today Total */}
        <Card className="bg-[#121215] border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">Today's Usage</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100">{formatHoursMins(totalMin)}</div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Target: {formatHoursMins(targetMin)}</span>
            <span className={isOver ? 'text-rose-400 font-semibold' : 'text-emerald-400'}>
              {progressPct}%
            </span>
          </div>
          <div className="mt-1.5 w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOver ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </Card>

        {/* Card 2: Remaining Allowed */}
        <Card className="bg-[#121215] border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">Allowance Status</span>
            {isOver ? (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <div className={`text-2xl font-bold ${isOver ? 'text-rose-400' : 'text-emerald-400'}`}>
            {isOver ? `+${formatHoursMins(totalMin - targetMin)} over` : formatHoursMins(remainingMin)}
          </div>
          <p className="mt-2 text-[11px] text-zinc-400">
            {isOver
              ? 'Exceeded daily digital wellbeing limit'
              : 'Remaining time allowed before limit'}
          </p>
        </Card>

        {/* Card 3: Most Used App */}
        <Card className="bg-[#121215] border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">Top Application</span>
            <Smartphone className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-zinc-100 truncate">
            {dailySummary?.most_used_app?.app_name || 'None Recorded'}
          </div>
          <p className="mt-2 text-[11px] text-zinc-400">
            {dailySummary?.most_used_app
              ? `${formatHoursMins(dailySummary.most_used_app.duration_minutes)} (${dailySummary.most_used_app.percentage_of_total}% of today)`
              : 'Log app usage to view breakdown'}
          </p>
        </Card>

        {/* Card 4: Weekly Average */}
        <Card className="bg-[#121215] border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">Weekly Daily Average</span>
            <TrendingDown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100">
            {weeklySummary ? formatHoursMins(weeklySummary.daily_average_minutes) : '--'}
          </div>
          <p className="mt-2 text-[11px] text-zinc-400">
            {weeklySummary ? `Total: ${formatHoursMins(weeklySummary.total_minutes)} over 7 days` : 'Calculating trend...'}
          </p>
        </Card>
      </div>

      {/* Android Companion Sync Information Banner */}
      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-start gap-3">
        <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-zinc-300 leading-relaxed">
          <strong className="text-zinc-100">Screenshot Import & Companion Sync:</strong> You can upload screenshots from your phone's Digital Wellbeing app using <strong>Import Screenshot</strong> above. OCR will automatically extract app names, hours, and minutes into an editable review table.
        </div>
      </div>

      {/* Middle Grid: Category Breakdown & Weekly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card className="bg-[#121215] border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base text-zinc-100">Category Distribution</CardTitle>
          </CardHeader>
          <div className="space-y-3 pt-2">
            {dailySummary?.category_breakdown && Object.keys(dailySummary.category_breakdown).length > 0 ? (
              Object.entries(dailySummary.category_breakdown).map(([cat, mins]) => {
                const pct = totalMin > 0 ? Math.round((mins / totalMin) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-300 font-medium">{cat}</span>
                      <span className="text-zinc-400">
                        {formatHoursMins(mins)} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800/80 rounded-full h-1.5">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-zinc-500 py-4 text-center">
                No category data for {selectedDate}.
              </p>
            )}
          </div>
        </Card>

        {/* Weekly Trend Chart */}
        <Card className="bg-[#121215] border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base text-zinc-100">7-Day Top Apps</CardTitle>
          </CardHeader>
          <div className="h-48 pt-2">
            {weeklySummary?.top_apps && weeklySummary.top_apps.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklySummary.top_apps} layout="vertical">
                  <XAxis type="number" stroke="#71717a" fontSize={10} tickFormatter={(v) => `${v}m`} />
                  <YAxis
                    dataKey="app_name"
                    type="category"
                    stroke="#71717a"
                    fontSize={11}
                    width={85}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val: any) => [`${val} minutes`, 'Duration']}
                  />
                  <Bar dataKey="duration_minutes" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-zinc-500 py-12 text-center">
                No weekly top apps recorded yet.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Recorded Sessions for Selected Date */}
      <Card className="bg-[#121215] border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base text-zinc-100">
            Recorded Applications ({dailySummary?.sessions.length || 0})
          </CardTitle>
          <Badge variant="zinc" size="sm">
            {selectedDate}
          </Badge>
        </CardHeader>

        {loadingDaily ? (
          <div className="py-8 text-center text-xs text-zinc-500">Loading usage records...</div>
        ) : dailySummary && dailySummary.sessions.length > 0 ? (
          <div className="divide-y divide-zinc-800/60">
            {dailySummary.sessions.map((sess: ScreenTimeSession) => (
              <div
                key={sess.id}
                className="py-3 px-2 flex items-center justify-between hover:bg-zinc-800/20 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold text-xs uppercase">
                    {sess.app_name.slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-200">{sess.app_name}</h4>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                      <span className="text-emerald-400">{sess.category}</span>
                      <span>•</span>
                      <span>
                        {sess.import_id ? 'Screenshot OCR' : sess.is_synced ? 'Android Sync' : 'Manual Entry'}
                      </span>
                      {sess.notes && (
                        <>
                          <span>•</span>
                          <span className="italic">{sess.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-zinc-100">
                    {formatHoursMins(sess.duration_minutes)}
                  </span>
                  <button
                    onClick={() => openEditModal(sess)}
                    className="p-1.5 text-zinc-500 hover:text-emerald-400 rounded-lg hover:bg-emerald-500/10 transition-colors"
                    title="Edit record"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteSessionMutation.mutate(sess.id)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                    title="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Smartphone className="w-6 h-6" />}
            title="No screen time logged today"
            description="Upload an Android Digital Wellbeing screenshot or log application usage manually."
            actionLabel="Import Screenshot"
            onAction={() => setIsUploadModalOpen(true)}
          />
        )}
      </Card>

      {/* Screenshot Import History */}
      {importHistory.length > 0 && (
        <Card className="bg-[#121215] border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-400" />
              <CardTitle className="text-base text-zinc-100">Screenshot Import History</CardTitle>
            </div>
            <span className="text-xs text-zinc-500">{importHistory.length} uploads</span>
          </CardHeader>
          <div className="divide-y divide-zinc-800/60">
            {importHistory.map((h) => (
              <div key={h.id} className="py-3 px-2 flex items-center justify-between hover:bg-zinc-800/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-200">
                        Usage Date: {h.target_date}
                      </span>
                      <Badge variant={h.status === 'confirmed' ? 'emerald' : 'zinc'} size="sm">
                        {h.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Imported on {h.import_date} • {h.app_count} apps detected • Total: {formatHoursMins(h.total_duration_minutes)}
                    </p>
                  </div>
                </div>

                <a
                  href={h.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View Screenshot
                </a>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 1. Screenshot Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Screen Time Screenshot"
        description="Select a screenshot from Android Digital Wellbeing or screen time settings."
      >
        <div className="space-y-4">
          {uploadError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {uploadError}
            </div>
          )}

          <div className="border-2 border-dashed border-zinc-700 hover:border-emerald-500/50 rounded-2xl p-6 text-center transition-colors">
            {screenshotPreview ? (
              <div className="space-y-3">
                <img
                  src={screenshotPreview}
                  alt="Screenshot Preview"
                  className="max-h-64 mx-auto rounded-xl border border-zinc-700 object-contain"
                />
                <p className="text-xs text-zinc-400">{screenshotFile?.name}</p>
                <button
                  type="button"
                  onClick={() => {
                    setScreenshotFile(null);
                    setScreenshotPreview(null);
                  }}
                  className="text-xs text-rose-400 hover:underline"
                >
                  Remove & Choose Another
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-10 h-10 text-zinc-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-zinc-200">Tap to browse screenshot</p>
                <p className="text-xs text-zinc-500 mt-1">Supports PNG, JPG, WebP</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="opacity-0 absolute inset-0 cursor-pointer"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!screenshotFile}
              isLoading={uploadScreenshotMutation.isPending}
              onClick={() => {
                if (screenshotFile) uploadScreenshotMutation.mutate(screenshotFile);
              }}
            >
              Extract Screen Time (OCR)
            </Button>
          </div>
        </div>
      </Modal>

      {/* 2. Editable Review Modal */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title="Review & Edit Extracted Usage"
        description="Verify OCR extracted apps and durations before confirming."
        maxWidth="xl"
      >
        <div className="space-y-4">
          {reviewData?.message && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              {reviewData.message}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Target Usage Date:</span>
              <input
                type="date"
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
                className="px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200"
              />
            </div>
            <div className="text-zinc-300">
              Total Calculated Duration: <strong className="text-emerald-400 text-sm">{formatHoursMins(reviewTotalMinutes)}</strong>
            </div>
          </div>

          {/* Editable Items Table */}
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {editableItems.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl bg-zinc-900/60 border border-zinc-800"
              >
                <div className="col-span-5">
                  <input
                    type="text"
                    value={item.app_name}
                    placeholder="App Name"
                    onChange={(e) => handleReviewItemChange(idx, 'app_name', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-100"
                  />
                </div>
                <div className="col-span-4">
                  <select
                    value={item.category}
                    onChange={(e) => handleReviewItemChange(idx, 'category', e.target.value)}
                    className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-100"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    min={0}
                    max={1440}
                    value={item.duration_minutes}
                    placeholder="Mins"
                    onChange={(e) =>
                      handleReviewItemChange(idx, 'duration_minutes', parseInt(e.target.value || '0', 10))
                    }
                    className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-100"
                  />
                </div>
                <div className="col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => handleRemoveReviewRow(idx)}
                    className="p-1 text-zinc-500 hover:text-rose-400"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
            <Button size="sm" variant="secondary" onClick={handleAddReviewRow} leftIcon={<Plus className="w-3.5 h-3.5" />}>
              Add Application
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setIsReviewModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                isLoading={confirmImportMutation.isPending}
                onClick={() => confirmImportMutation.mutate()}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Confirm & Save ({editableItems.length} Apps)
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* 3. Manual Log Modal */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title="Manual Screen Time Entry"
        description={`Record screen time usage for ${selectedDate}`}
      >
        <form onSubmit={handleCreateSession} className="space-y-4">
          <Input
            label="Application Name"
            placeholder="e.g. YouTube, Instagram, WhatsApp"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              label="Hours"
              min={0}
              max={23}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
            <Input
              type="number"
              label="Minutes"
              min={0}
              max={59}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              required
            />
          </div>

          <Input
            label="Notes (Optional)"
            placeholder="e.g. Watched coding tutorial"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsLogModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={createSessionMutation.isPending}>
              Save Usage
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Edit Session Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Application Usage"
        description="Update recorded duration, category, or notes."
      >
        <form onSubmit={handleEditSessionSubmit} className="space-y-4">
          <Input
            label="Application Name"
            value={editAppName}
            onChange={(e) => setEditAppName(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Category</label>
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              label="Hours"
              min={0}
              max={23}
              value={editHours}
              onChange={(e) => setEditHours(e.target.value)}
            />
            <Input
              type="number"
              label="Minutes"
              min={0}
              max={59}
              value={editMinutes}
              onChange={(e) => setEditMinutes(e.target.value)}
              required
            />
          </div>

          <Input
            label="Notes"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={updateSessionMutation.isPending}>
              Update Usage
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. Daily Goal Modal */}
      <Modal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        title="Daily Screen Time Limit"
        description="Set your maximum allowed daily usage in minutes."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const m = parseInt(goalMinutes, 10);
            if (m > 0 && m <= 1440) updateGoalMutation.mutate(m);
          }}
          className="space-y-4"
        >
          <Input
            type="number"
            label="Daily Target (Minutes)"
            min={30}
            max={1440}
            value={goalMinutes}
            onChange={(e) => setGoalMinutes(e.target.value)}
            helperText={`Equivalent to ${(parseInt(goalMinutes || '0', 10) / 60).toFixed(1)} hours`}
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsGoalModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={updateGoalMutation.isPending}>
              Save Limit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
