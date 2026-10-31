import React, { useState } from 'react';
import { Footprints } from 'lucide-react';
import { api } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

export interface LogActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialType?: 'running' | 'football';
  selectedDate?: string;
}

export const LogActivityModal: React.FC<LogActivityModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialType = 'running',
  selectedDate,
}) => {
  const today = selectedDate || new Date().toISOString().split('T')[0];
  const [activityType, setActivityType] = useState<'running' | 'football'>(initialType);
  const [date, setDate] = useState(today);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [distanceKm, setDistanceKm] = useState<number>(5.0);
  const [effortLevel, setEffortLevel] = useState('Moderate');
  const [intensity, setIntensity] = useState('High');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live calculated pace for running
  const livePace = React.useMemo(() => {
    if (activityType !== 'running' || !distanceKm || distanceKm <= 0 || !durationMinutes || durationMinutes <= 0) {
      return null;
    }
    const paceDec = durationMinutes / distanceKm;
    const mins = Math.floor(paceDec);
    const secs = Math.round((paceDec - mins) * 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs} /km`;
  }, [activityType, distanceKm, durationMinutes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await api.post('/activities', {
        activity_type: activityType,
        date,
        duration_minutes: durationMinutes,
        distance_km: activityType === 'running' ? distanceKm : undefined,
        effort_level: activityType === 'running' ? effortLevel : undefined,
        intensity: activityType === 'football' ? intensity : undefined,
        notes: notes || undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      console.error('Error logging activity:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Cardio or Football Session"
      description="Record running distance & auto-computed pace, or football match session"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Activity Type Toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-[#18181b] border border-zinc-800 rounded-xl">
          <button
            type="button"
            onClick={() => setActivityType('running')}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${
              activityType === 'running'
                ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Footprints className="w-4 h-4" />
            Running
          </button>
          <button
            type="button"
            onClick={() => setActivityType('football')}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${
              activityType === 'football'
                ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="text-sm">⚽</span>
            Football
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Input
            label="Duration (Minutes)"
            type="number"
            min={1}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            required
          />
        </div>

        {/* Running specific fields */}
        {activityType === 'running' && (
          <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
            <div className="grid grid-cols-2 gap-3 items-center">
              <Input
                label="Distance (Kilometres)"
                type="number"
                step="0.01"
                min="0.1"
                value={distanceKm}
                onChange={(e) => setDistanceKm(Number(e.target.value))}
                required
              />
              <div className="pt-4">
                <span className="block text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                  Auto Calculated Pace
                </span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {livePace || '--:--'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Effort Level</label>
              <div className="grid grid-cols-4 gap-2">
                {['Easy', 'Moderate', 'Hard', 'Max'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setEffortLevel(level)}
                    className={`text-xs py-1.5 rounded-lg border font-medium text-center transition-colors ${
                      effortLevel === level
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                        : 'bg-[#18181b] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Football specific fields */}
        {activityType === 'football' && (
          <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Match / Training Intensity</label>
              <div className="grid grid-cols-3 gap-2">
                {['Low', 'Medium', 'High'].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setIntensity(lvl)}
                    className={`text-xs py-1.5 rounded-lg border font-medium text-center transition-colors ${
                      intensity === lvl
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                        : 'bg-[#18181b] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <Input
          label="Session Notes (Optional)"
          placeholder="Weather, turf condition, match score, drills..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            Save Activity
          </Button>
        </div>
      </form>
    </Modal>
  );
};
