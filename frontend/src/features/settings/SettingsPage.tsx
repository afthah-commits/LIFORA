import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Settings,
  Target,
  Bell,
  Palette,
  User,
  Lock,
  Save,
  Check,
  AlertCircle,
  Shield,
  Smartphone,
  Download,
  CheckCircle2,
  Droplets,
  RotateCcw,
  IndianRupee,
  Database,
  Flame,
  FileSpreadsheet,
  Sliders,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardHeader, CardTitle } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { UserProfile, UserGoal, WaterGoal } from '../../types';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { PwaInstallModal } from '../../components/common/PwaInstallModal';

// Validation Schemas
const profileSchema = z.object({
  age: z.number().min(10).max(120),
  height_cm: z.number().min(50).max(280),
  current_weight_kg: z.number().min(20).max(300),
  timezone: z.string().min(1),
  preferred_language: z.string().min(1),
});
type ProfileFormData = z.infer<typeof profileSchema>;

const goalsSchema = z.object({
  target_weight_kg: z.number().min(20).max(300),
  daily_protein_target_g: z.number().min(10).max(500),
  running_target_km: z.number().min(0.5).max(100),
  daily_calorie_target: z.number().optional().nullable(),
  water_goal_ml: z.number().min(500).max(10000),
  screen_time_limit_min: z.number().min(15).max(1440).optional(),
});
type GoalsFormData = z.infer<typeof goalsSchema>;

const passwordSchema = z
  .object({
    old_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(8, 'New password must be at least 8 characters'),
    confirm_password: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'New passwords do not match',
    path: ['confirm_password'],
  });
type PasswordFormData = z.infer<typeof passwordSchema>;

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();
  const { isInstalled } = usePwaInstall();
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Exactly 6 Essential Sections
  const [activeTab, setActiveTab] = useState<
    'profile' | 'goals' | 'reminders' | 'appearance' | 'security' | 'backup'
  >('profile');

  // Success & Error States
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [goalsSuccess, setGoalsSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [remindersSuccess, setRemindersSuccess] = useState(false);
  const [appearanceSuccess, setAppearanceSuccess] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  // Backup & Restore states
  const [isExporting, setIsExporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [validationSummary, setValidationSummary] = useState<any | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Appearance settings
  const [themeMode, setThemeMode] = useState<'oled' | 'midnight' | 'charcoal'>('oled');
  const [uiDensity, setUiDensity] = useState<'comfortable' | 'compact'>('comfortable');

  // Reminder settings
  const [waterReminderEnabled, setWaterReminderEnabled] = useState(true);
  const [waterReminderInterval, setWaterReminderInterval] = useState(2);
  const [workoutReminderEnabled, setWorkoutReminderEnabled] = useState(true);
  const [workoutReminderTime, setWorkoutReminderTime] = useState('18:00');
  const [screenTimeAlertEnabled, setScreenTimeAlertEnabled] = useState(true);

  // 1. Fetch Water Goal
  const { data: waterGoal } = useQuery<WaterGoal>({
    queryKey: ['water-goal'],
    queryFn: async () => {
      const res = await api.get('/water/goal');
      return res.data;
    },
  });

  React.useEffect(() => {
    if (waterGoal) {
      setWaterReminderEnabled(waterGoal.reminder_enabled ?? true);
      setWaterReminderInterval(waterGoal.reminder_interval_hours ?? 2);
    }
  }, [waterGoal]);

  // Profile Form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: submittingProfile },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      age: user?.profile?.age || 19,
      height_cm: user?.profile?.height_cm || 167.0,
      current_weight_kg: user?.profile?.current_weight_kg || 53.0,
      timezone: user?.profile?.timezone || 'Asia/Kolkata',
      preferred_language: user?.profile?.preferred_language || 'English',
    },
  });

  // Goals Form
  const {
    register: registerGoals,
    handleSubmit: handleGoalsSubmit,
    setValue: setGoalsValue,
    formState: { errors: goalsErrors, isSubmitting: submittingGoals },
  } = useForm<GoalsFormData>({
    resolver: zodResolver(goalsSchema),
    defaultValues: {
      target_weight_kg: user?.goals?.target_weight_kg || 60.0,
      daily_protein_target_g: user?.goals?.daily_protein_target_g || 85.0,
      running_target_km: user?.goals?.running_target_km || 5.0,
      daily_calorie_target: user?.goals?.daily_calorie_target || null,
      water_goal_ml: waterGoal?.daily_target_ml || 2500,
      screen_time_limit_min: 180,
    },
  });

  React.useEffect(() => {
    if (waterGoal?.daily_target_ml) {
      setGoalsValue('water_goal_ml', waterGoal.daily_target_ml);
    }
  }, [waterGoal, setGoalsValue]);

  // Password Form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordFormErrors, isSubmitting: submittingPassword },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  // Save Profile
  const onSaveProfile = async (data: ProfileFormData) => {
    setProfileSuccess(false);
    try {
      const resp = await api.put<UserProfile>('/profile', data);
      if (user) {
        setUser({ ...user, profile: resp.data });
      }
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
    }
  };

  // Save Goals & Water Target
  const onSaveGoals = async (data: GoalsFormData) => {
    setGoalsSuccess(false);
    try {
      const resp = await api.put<UserGoal>('/goals', {
        target_weight_kg: data.target_weight_kg,
        daily_protein_target_g: data.daily_protein_target_g,
        running_target_km: data.running_target_km,
        daily_calorie_target: data.daily_calorie_target ? Number(data.daily_calorie_target) : null,
      });

      if (data.water_goal_ml) {
        await api.put('/water/goal', {
          daily_target_ml: Number(data.water_goal_ml),
        });
        queryClient.invalidateQueries({ queryKey: ['water-goal'] });
        queryClient.invalidateQueries({ queryKey: ['water-daily'] });
      }

      if (user) {
        setUser({ ...user, goals: resp.data });
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      setGoalsSuccess(true);
      setTimeout(() => setGoalsSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating goals:', err);
    }
  };

  // Save Reminders
  const onSaveReminders = async (e: React.FormEvent) => {
    e.preventDefault();
    setRemindersSuccess(false);
    try {
      await api.put('/water/goal', {
        reminder_enabled: waterReminderEnabled,
        reminder_interval_hours: waterReminderInterval,
      });
      queryClient.invalidateQueries({ queryKey: ['water-goal'] });
      setRemindersSuccess(true);
      setTimeout(() => setRemindersSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating reminders:', err);
    }
  };

  // Save Password
  const onSavePassword = async (data: PasswordFormData) => {
    setPasswordSuccess(false);
    setPasswordError(null);
    try {
      await api.post('/auth/change-password', {
        old_password: data.old_password,
        new_password: data.new_password,
      });
      setPasswordSuccess(true);
      resetPassword();
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.response?.data?.detail || 'Failed to update password');
    }
  };

  // Reset Onboarding action
  const handleResetOnboarding = () => {
    localStorage.removeItem('lifora_onboarding_completed');
    localStorage.removeItem('fitpulse_onboarding_completed');
    setBackupMessage('Onboarding reset! Redirecting to setup wizard...');
    setTimeout(() => {
      window.location.href = '/';
    }, 1200);
  };

  // Full Personal JSON Export
  const handleExportBackup = async () => {
    setIsExporting(true);
    setBackupMessage(null);
    try {
      const resp = await api.get('/backup/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `lifora_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      setBackupMessage('LIFORA personal backup JSON file exported successfully.');
    } catch (err: any) {
      console.error('Backup export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // File Upload and Validation
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const resp = await api.post('/backup/validate', parsed);
      setValidationSummary(resp.data);
    } catch (err: any) {
      setImportError(err.response?.data?.detail || 'Invalid or unreadable backup JSON file.');
      setValidationSummary(null);
    }
  };

  // Restore Execution
  const handleConfirmRestore = async () => {
    if (!importFile) return;
    if (
      importMode === 'overwrite' &&
      !window.confirm(
        'CAUTION: Overwrite mode will clear existing records before restoring backup. Do you want to proceed?'
      )
    ) {
      return;
    }
    setIsImporting(true);
    setImportError(null);
    try {
      const text = await importFile.text();
      const parsed = JSON.parse(text);
      await api.post(`/backup/restore?mode=${importMode}`, parsed);
      setBackupMessage('Personal life data restored successfully into LIFORA!');
      setValidationSummary(null);
      setImportFile(null);
      queryClient.invalidateQueries();
    } catch (err: any) {
      setImportError(err.response?.data?.detail || 'Failed to restore backup.');
    } finally {
      setIsImporting(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'reminders', label: 'Reminders', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'backup', label: 'Backup', icon: Database },
  ] as const;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#121215] to-[#16161c] border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
              Personal Preferences
            </span>
            <Badge variant="emerald" size="sm">Settings</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 flex items-center gap-2">
            <Settings className="w-7 h-7 text-emerald-400" /> Settings Center
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Manage your personal profile, targets, reminders, appearance, security, and backups.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/customization">
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Sliders className="w-4 h-4 text-emerald-400" />}
            >
              Customize App
            </Button>
          </Link>
        </div>
      </div>

      {/* 6 Essential Section Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-zinc-800/80">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. PROFILE SECTION */}
      {activeTab === 'profile' && (
        <Card className="bg-[#121215] border-zinc-800">
          <CardHeader>
            <CardTitle>
              <User className="w-4 h-4 text-emerald-400" />
              1. Profile & Personal Baseline
            </CardTitle>
            {profileSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" /> Profile updated successfully
              </span>
            )}
          </CardHeader>

          <form onSubmit={handleProfileSubmit(onSaveProfile)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Age (Years)"
                type="number"
                error={profileErrors.age?.message}
                {...registerProfile('age', { valueAsNumber: true })}
              />
              <Input
                label="Height (cm)"
                type="number"
                step="any"
                error={profileErrors.height_cm?.message}
                {...registerProfile('height_cm', { valueAsNumber: true })}
              />
              <Input
                label="Current Weight (kg)"
                type="number"
                step="any"
                error={profileErrors.current_weight_kg?.message}
                {...registerProfile('current_weight_kg', { valueAsNumber: true })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Timezone"
                placeholder="Asia/Kolkata"
                error={profileErrors.timezone?.message}
                {...registerProfile('timezone')}
              />
              <Input
                label="Preferred Language"
                placeholder="English"
                error={profileErrors.preferred_language?.message}
                {...registerProfile('preferred_language')}
              />
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Currency</label>
                <div className="px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-100 flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-emerald-400" />
                  <span>Indian Rupee (₹ INR)</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={submittingProfile}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save Profile
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* 2. GOALS SECTION */}
      {activeTab === 'goals' && (
        <Card className="bg-[#121215] border-zinc-800">
          <CardHeader>
            <CardTitle>
              <Target className="w-4 h-4 text-emerald-400" />
              2. Goals & Targets
            </CardTitle>
            {goalsSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" /> Goals updated successfully
              </span>
            )}
          </CardHeader>

          <form onSubmit={handleGoalsSubmit(onSaveGoals)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-cyan-500/5 border border-cyan-500/20 space-y-1">
                <div className="flex items-center gap-2 mb-1">
                  <Droplets className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-cyan-400">Daily Water Target (ml)</span>
                </div>
                <Input
                  type="number"
                  step="50"
                  placeholder="2500"
                  error={goalsErrors.water_goal_ml?.message}
                  {...registerGoals('water_goal_ml', { valueAsNumber: true })}
                />
                <p className="text-[10px] text-zinc-500">Standard: 2500 ml daily.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                <span className="text-xs font-semibold text-zinc-300">Target Weight (kg)</span>
                <Input
                  type="number"
                  step="any"
                  error={goalsErrors.target_weight_kg?.message}
                  {...registerGoals('target_weight_kg', { valueAsNumber: true })}
                />
                <p className="text-[10px] text-zinc-500">Default goal: 60.0 kg.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                <span className="text-xs font-semibold text-zinc-300">Daily Protein Target (g)</span>
                <Input
                  type="number"
                  step="any"
                  error={goalsErrors.daily_protein_target_g?.message}
                  {...registerGoals('daily_protein_target_g', { valueAsNumber: true })}
                />
                <p className="text-[10px] text-zinc-500">Default goal: 85 g.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                <span className="text-xs font-semibold text-zinc-300">Running Target (km)</span>
                <Input
                  type="number"
                  step="any"
                  error={goalsErrors.running_target_km?.message}
                  {...registerGoals('running_target_km', { valueAsNumber: true })}
                />
                <p className="text-[10px] text-zinc-500">Default: 5.0 km / run.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                <span className="text-xs font-semibold text-zinc-300">Daily Calorie Target (kcal)</span>
                <Input
                  type="number"
                  placeholder="e.g. 2400"
                  error={goalsErrors.daily_calorie_target?.message}
                  {...registerGoals('daily_calorie_target', {
                    setValueAs: (v) => (v === '' ? null : Number(v)),
                  })}
                />
                <p className="text-[10px] text-zinc-500">Optional calorie target.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-1">
                <div className="flex items-center gap-2 mb-1">
                  <Smartphone className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-purple-400">Screen Time Limit (Min)</span>
                </div>
                <Input
                  type="number"
                  step="15"
                  placeholder="180"
                  error={goalsErrors.screen_time_limit_min?.message}
                  {...registerGoals('screen_time_limit_min', { valueAsNumber: true })}
                />
                <p className="text-[10px] text-zinc-500">Default: 180 min (3h).</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={submittingGoals}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save Goals
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* 3. REMINDERS SECTION */}
      {activeTab === 'reminders' && (
        <Card className="bg-[#121215] border-zinc-800">
          <CardHeader>
            <CardTitle>
              <Bell className="w-4 h-4 text-emerald-400" />
              3. Reminders & Alerts
            </CardTitle>
            {remindersSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" /> Reminders configured
              </span>
            )}
          </CardHeader>

          <form onSubmit={onSaveReminders} className="space-y-4">
            {/* Water Reminder */}
            <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Droplets className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h4 className="text-sm font-bold text-zinc-100">Water Hydration Reminder</h4>
                    <p className="text-xs text-zinc-400">Regular intervals to ensure daily hydration target</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={waterReminderEnabled}
                    onChange={(e) => setWaterReminderEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500" />
                </label>
              </div>

              {waterReminderEnabled && (
                <div className="pt-2 flex items-center gap-3">
                  <label className="text-xs text-zinc-300">Repeat Interval:</label>
                  <select
                    value={waterReminderInterval}
                    onChange={(e) => setWaterReminderInterval(Number(e.target.value))}
                    className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value={1}>Every 1 hour</option>
                    <option value={2}>Every 2 hours (Recommended)</option>
                    <option value={3}>Every 3 hours</option>
                    <option value={4}>Every 4 hours</option>
                  </select>
                </div>
              )}
            </div>

            {/* Workout Reminder */}
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Flame className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h4 className="text-sm font-bold text-zinc-100">Daily Workout Reminder</h4>
                    <p className="text-xs text-zinc-400">Notification to log gym or conditioning session</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={workoutReminderEnabled}
                    onChange={(e) => setWorkoutReminderEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                </label>
              </div>

              {workoutReminderEnabled && (
                <div className="pt-2 flex items-center gap-3">
                  <label className="text-xs text-zinc-300">Reminder Time:</label>
                  <input
                    type="time"
                    value={workoutReminderTime}
                    onChange={(e) => setWorkoutReminderTime(e.target.value)}
                    className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>

            {/* Screen Time Notification */}
            <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-5 h-5 text-purple-400" />
                  <div>
                    <h4 className="text-sm font-bold text-zinc-100">Screen Time Limit Alerts</h4>
                    <p className="text-xs text-zinc-400">Alert at 80% and 100% of daily digital wellbeing limit</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={screenTimeAlertEnabled}
                    onChange={(e) => setScreenTimeAlertEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500" />
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" size="sm" leftIcon={<Save className="w-4 h-4" />}>
                Save Reminders
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* 4. APPEARANCE SECTION */}
      {activeTab === 'appearance' && (
        <Card className="bg-[#121215] border-zinc-800">
          <CardHeader>
            <CardTitle>
              <Palette className="w-4 h-4 text-emerald-400" />
              4. Appearance & Minimal Theme
            </CardTitle>
            {appearanceSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" /> Appearance updated
              </span>
            )}
          </CardHeader>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                Dark Theme Variant
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setThemeMode('oled')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    themeMode === 'oled'
                      ? 'bg-zinc-900 border-emerald-500 text-emerald-400 ring-1 ring-emerald-500'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  <span className="text-xs font-bold block">OLED Charcoal (Default)</span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">True dark #09090b</span>
                </button>

                <button
                  type="button"
                  onClick={() => setThemeMode('midnight')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    themeMode === 'midnight'
                      ? 'bg-zinc-900 border-emerald-500 text-emerald-400 ring-1 ring-emerald-500'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  <span className="text-xs font-bold block">Midnight Slate</span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">Deep slate tones</span>
                </button>

                <button
                  type="button"
                  onClick={() => setThemeMode('charcoal')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    themeMode === 'charcoal'
                      ? 'bg-zinc-900 border-emerald-500 text-emerald-400 ring-1 ring-emerald-500'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  <span className="text-xs font-bold block">Minimal Graphite</span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">Subtle neutral</span>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800/80">
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                UI Density
              </label>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() => setUiDensity('comfortable')}
                  className={`p-3 rounded-xl border text-center text-xs font-semibold transition-all ${
                    uiDensity === 'comfortable'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                  }`}
                >
                  Comfortable (Touch-friendly ≥ 44px)
                </button>
                <button
                  type="button"
                  onClick={() => setUiDensity('compact')}
                  className={`p-3 rounded-xl border text-center text-xs font-semibold transition-all ${
                    uiDensity === 'compact'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                  }`}
                >
                  Compact
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  setAppearanceSuccess(true);
                  setTimeout(() => setAppearanceSuccess(false), 3000);
                }}
              >
                Apply Appearance
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 5. SECURITY SECTION */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <Card className="bg-[#121215] border-zinc-800">
            <CardHeader>
              <CardTitle>
                <Lock className="w-4 h-4 text-emerald-400" />
                5. Account Security & Password
              </CardTitle>
              {passwordSuccess && (
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                  <Check className="w-3.5 h-3.5" /> Password changed successfully
                </span>
              )}
            </CardHeader>

            {passwordError && (
              <div className="p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit(onSavePassword)} className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                placeholder="••••••••••••"
                error={passwordFormErrors.old_password?.message}
                {...registerPassword('old_password')}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="New Password"
                  type="password"
                  placeholder="Min. 8 characters"
                  error={passwordFormErrors.new_password?.message}
                  {...registerPassword('new_password')}
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="Confirm new password"
                  error={passwordFormErrors.confirm_password?.message}
                  {...registerPassword('confirm_password')}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  isLoading={submittingPassword}
                  leftIcon={<Shield className="w-4 h-4" />}
                >
                  Change Password
                </Button>
              </div>
            </form>
          </Card>

          {/* PWA & Mobile Installation */}
          <Card className="bg-[#121215] border-zinc-800">
            <CardHeader>
              <CardTitle>
                <Smartphone className="w-4 h-4 text-emerald-400" />
                PWA Application Status
              </CardTitle>
            </CardHeader>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
              <div>
                <p className="text-xs font-medium text-zinc-200">Standalone App Status</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {isInstalled
                    ? 'FITPULSE AI is currently running in standalone PWA mode.'
                    : 'Install as a standalone app on your home screen or desktop.'}
                </p>
              </div>

              {isInstalled ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold shrink-0">
                  <CheckCircle2 className="w-4 h-4" /> Installed
                </span>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setIsInstallModalOpen(true)}
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Install App
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* 6. BACKUP SECTION */}
      {activeTab === 'backup' && (
        <Card className="bg-[#121215] border-zinc-800">
          <CardHeader>
            <CardTitle>
              <Database className="w-4 h-4 text-emerald-400" />
              6. Data Backup &amp; Restore
            </CardTitle>
          </CardHeader>

          <div className="space-y-6">
            {backupMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                <Check className="w-4 h-4" />
                <span>{backupMessage}</span>
              </div>
            )}

            {importError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4" />
                <span>{importError}</span>
              </div>
            )}

            {/* 1. Export Personal Data */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-zinc-100">Export All Personal Life Data (JSON)</h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Download a comprehensive backup of your profile, goals, hydration records, custom modules, dynamic records, and dashboard configurations.
                </p>
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                isLoading={isExporting}
                onClick={handleExportBackup}
                leftIcon={<Download className="w-4 h-4" />}
                className="shrink-0 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold"
              >
                Export JSON Backup
              </Button>
            </div>

            {/* 2. Restore Personal Data */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-zinc-100">Restore Personal Data from JSON</h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Upload a previously exported LIFORA JSON file to inspect contents and restore your records safely.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="block w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
                />
              </div>

              {/* Validation Summary Preview */}
              {validationSummary && (
                <div className="p-4 rounded-xl bg-[#021816] border border-emerald-500/30 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400">
                      ✓ Valid LIFORA Backup File Verified
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      v{validationSummary.version || '1.0'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px]">Water Logs</span>
                      <strong className="text-zinc-200">{validationSummary.counts?.water_entries || 0}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px]">Custom Modules</span>
                      <strong className="text-zinc-200">{validationSummary.counts?.custom_modules || 0}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px]">Module Records</span>
                      <strong className="text-zinc-200">{validationSummary.counts?.custom_records || 0}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px]">Finance Records</span>
                      <strong className="text-zinc-200">
                        {(validationSummary.counts?.income_entries || 0) + (validationSummary.counts?.expense_entries || 0)}
                      </strong>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-emerald-950">
                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
                        <input
                          type="radio"
                          name="importMode"
                          value="merge"
                          checked={importMode === 'merge'}
                          onChange={() => setImportMode('merge')}
                          className="text-emerald-500"
                        />
                        <span>Merge (Safe)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
                        <input
                          type="radio"
                          name="importMode"
                          value="overwrite"
                          checked={importMode === 'overwrite'}
                          onChange={() => setImportMode('overwrite')}
                          className="text-emerald-500"
                        />
                        <span className="text-amber-400">Overwrite</span>
                      </label>
                    </div>

                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      isLoading={isImporting}
                      onClick={handleConfirmRestore}
                      leftIcon={<Check className="w-4 h-4" />}
                      className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold"
                    >
                      Confirm &amp; Restore Data
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Reset Onboarding Setup */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-zinc-200">Re-run First-Time Onboarding</h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Reset the setup wizard to reconfigure your age, weight, and initial targets.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleResetOnboarding}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                className="shrink-0"
              >
                Reset Onboarding
              </Button>
            </div>
          </div>
        </Card>
      )}

      <PwaInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />
    </div>
  );
};
export default SettingsPage;
