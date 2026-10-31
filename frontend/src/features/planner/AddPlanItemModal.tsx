import React, { useState } from 'react';
import { api } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

export interface AddPlanItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  planId: string;
  defaultDate: string;
}

export const AddPlanItemModal: React.FC<AddPlanItemModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  planId,
  defaultDate,
}) => {
  const [plannedDate, setPlannedDate] = useState(defaultDate);
  const [activityType, setActivityType] = useState<'running' | 'strength' | 'football' | 'rest'>('running');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    setPlannedDate(defaultDate);
  }, [defaultDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planId) return;

    setIsSubmitting(true);
    try {
      await api.post(`/planner/${planId}/items`, {
        planned_date: plannedDate,
        activity_type: activityType,
        duration_minutes: activityType === 'rest' ? undefined : durationMinutes,
        notes: notes || undefined,
        is_completed: false,
        replaced_by_football: false,
      });
      onSaved();
      onClose();
    } catch (err) {
      console.error('Error adding plan item:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule Planned Activity"
      description="Plan strength training, running, football or dedicated rest days"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Planned Date"
          type="date"
          value={plannedDate}
          onChange={(e) => setPlannedDate(e.target.value)}
          required
        />

        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">Activity Type</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { type: 'running', label: '🏃 Running' },
              { type: 'strength', label: '🏋️ Strength' },
              { type: 'football', label: '⚽ Football' },
              { type: 'rest', label: '🛌 Rest Day' },
            ].map((item) => (
              <button
                type="button"
                key={item.type}
                onClick={() => setActivityType(item.type as any)}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-colors text-center ${
                  activityType === item.type
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                    : 'bg-[#18181b] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {activityType !== 'rest' && (
          <Input
            label="Planned Duration (Minutes)"
            type="number"
            min={1}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            required
          />
        )}

        <Input
          label="Routine Notes (Optional)"
          placeholder="e.g. 5 km tempo run, legs & abs, tournament match"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            Schedule Item
          </Button>
        </div>
      </form>
    </Modal>
  );
};
