import React, { useState } from 'react';
import { Scale } from 'lucide-react';
import { api } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

export interface LogWeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  currentWeight?: number;
}

export const LogWeightModal: React.FC<LogWeightModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  currentWeight = 53.0,
}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [weightKg, setWeightKg] = useState<number>(currentWeight);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightKg || weightKg < 20 || weightKg > 300) return;

    setIsSubmitting(true);
    try {
      await api.post('/weight', {
        date,
        weight_kg: Number(weightKg),
        notes: notes || undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      console.error('Error logging weight:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Body Weight"
      description="Record your weigh-in for accurate trend and weekly rolling average tracking"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Weigh-in Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />

        <Input
          label="Weight (kg)"
          type="number"
          step="0.1"
          min="20"
          max="300"
          value={weightKg}
          onChange={(e) => setWeightKg(Number(e.target.value))}
          required
        />

        <Input
          label="Notes (Optional)"
          placeholder="e.g. Fasted morning weight, after hydration"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            Save Weight
          </Button>
        </div>
      </form>
    </Modal>
  );
};
