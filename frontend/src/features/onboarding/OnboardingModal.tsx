import React, { useState } from 'react';
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { Input } from '../../components/common/Input';

export interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const { user, setUser } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states initialized with LIFORA defaults
  const defaultDisplayName =
    user?.profile?.display_name || user?.email?.split('@')[0] || 'Member';
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [age, setAge] = useState(String(user?.profile?.age || 19));
  const [heightCm, setHeightCm] = useState(String(user?.profile?.height_cm || 167.0));
  const [currentWeightKg, setCurrentWeightKg] = useState(
    String(user?.profile?.current_weight_kg || 53.0)
  );
  const [targetWeightKg, setTargetWeightKg] = useState(
    String(user?.goals?.target_weight_kg || 60.0)
  );
  const [waterGoalMl, setWaterGoalMl] = useState('2500');
  const [timezone, setTimezone] = useState(user?.profile?.timezone || 'Asia/Kolkata');

  if (!isOpen) return null;

  const handleGetStarted = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Save profile
      const profResp = await api.put('/profile', {
        display_name: displayName.trim() || defaultDisplayName,
        age: parseInt(age, 10) || 19,
        height_cm: parseFloat(heightCm) || 167.0,
        current_weight_kg: parseFloat(currentWeightKg) || 53.0,
        timezone: timezone || 'Asia/Kolkata',
        preferred_language: user?.profile?.preferred_language || 'English',
      });

      // 2. Save goals
      const goalsResp = await api.put('/goals', {
        target_weight_kg: parseFloat(targetWeightKg) || 60.0,
        daily_protein_target_g: user?.goals?.daily_protein_target_g || 85.0,
        running_target_km: user?.goals?.running_target_km || 5.0,
        daily_calorie_target: user?.goals?.daily_calorie_target || null,
      });

      // 3. Save water goal
      try {
        await api.put('/water/goal', {
          daily_target_ml: parseInt(waterGoalMl, 10) || 2500,
        });
      } catch (err) {
        // Non-blocking water goal save
        console.warn('Could not save water goal during onboarding:', err);
      }

      // Update auth store
      if (user) {
        setUser({
          ...user,
          profile: profResp.data,
          goals: goalsResp.data,
        });
      }

      // Mark onboarding as completed in localStorage
      localStorage.setItem('lifora_onboarding_completed', 'true');
      localStorage.setItem('fitpulse_onboarding_completed', 'true');

      if (onComplete) onComplete();
      onClose();
    } catch (err: any) {
      console.error('Failed to complete onboarding setup:', err);
      setError('Could not save your preferences. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to LIFORA"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-[#031c19] border border-emerald-900/60 shadow-2xl overflow-hidden p-6 sm:p-8">
        {/* Decorative Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />

        {/* Branding & Header */}
        <div className="text-center space-y-3 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 overflow-hidden">
            <img src="/logo.png" alt="LIFORA Logo" className="w-14 h-14 object-contain" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold tracking-wide uppercase mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Personal Life Operating System</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
              Welcome to <span className="text-emerald-400">LIFORA</span>
            </h2>
            <p className="text-xs sm:text-sm text-emerald-200/70 font-medium mt-0.5">
              Your Life. Your Space. Your Rules.
            </p>
            <p className="text-xs text-zinc-400 mt-1.5 max-w-sm mx-auto">
              Your life, organized your way. Set your optional profile details to personalize your workspace.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Setup Form */}
        <form onSubmit={handleGetStarted} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Input
              type="text"
              label="Display Name"
              placeholder="e.g. Alex"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <Input
              type="text"
              label="Timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Input
              type="number"
              label="Your Age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              required
            />
            <Input
              type="number"
              step="any"
              label="Height (cm)"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Input
              type="number"
              step="any"
              label="Current Weight (kg)"
              value={currentWeightKg}
              onChange={(e) => setCurrentWeightKg(e.target.value)}
              required
            />
            <Input
              type="number"
              step="any"
              label="Target Weight (kg)"
              value={targetWeightKg}
              onChange={(e) => setTargetWeightKg(e.target.value)}
              required
            />
          </div>

          <div>
            <Input
              type="number"
              step="50"
              label="Daily Water Goal (ml)"
              value={waterGoalMl}
              onChange={(e) => setWaterGoalMl(e.target.value)}
              required
            />
          </div>

          {/* Let's Get Started Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/25 active:scale-[0.98] disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Configuring Space...' : "Let's Get Started"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[11px] text-zinc-500 text-center mt-2">
              Everything in LIFORA can be edited and customized at any time.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
export default OnboardingModal;
