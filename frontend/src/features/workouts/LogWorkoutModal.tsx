import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, Dumbbell, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Exercise, WorkoutTemplate } from '../../types';

export interface LogWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  selectedDate?: string;
  templateToLoad?: WorkoutTemplate | null;
}

interface StagedExercise {
  exercise_id?: string;
  exercise_name: string;
  sets: number;
  reps: number;
  weight_kg: number;
  notes?: string;
}

export const LogWorkoutModal: React.FC<LogWorkoutModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  selectedDate,
  templateToLoad,
}) => {
  const today = selectedDate || new Date().toISOString().split('T')[0];
  const [workoutName, setWorkoutName] = useState(templateToLoad?.name || 'Full Body Strength Session');
  const [date, setDate] = useState(today);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<StagedExercise[]>([]);
  const [selectedExId, setSelectedExId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch exercises
  const { data: exerciseLibrary = [] } = useQuery<Exercise[]>({
    queryKey: ['exercises-library'],
    queryFn: async () => {
      const resp = await api.get('/exercises');
      return resp.data;
    },
    enabled: isOpen,
  });

  // Pre-load from template if provided
  React.useEffect(() => {
    if (templateToLoad) {
      setWorkoutName(templateToLoad.name);
      setExercises(
        templateToLoad.items.map((item) => ({
          exercise_id: item.exercise_id,
          exercise_name: item.exercise_name || 'Exercise',
          sets: item.sets,
          reps: item.reps,
          weight_kg: item.target_weight_kg || 0,
        }))
      );
    }
  }, [templateToLoad]);

  const handleAddExercise = () => {
    if (!selectedExId) return;
    const found = exerciseLibrary.find((e) => e.id === selectedExId);
    if (!found) return;

    setExercises([
      ...exercises,
      {
        exercise_id: found.id,
        exercise_name: found.name,
        sets: 3,
        reps: 10,
        weight_kg: found.category === 'Bodyweight' ? 0 : 15,
      },
    ]);
    setSelectedExId('');
  };

  const handleExerciseChange = (index: number, field: keyof StagedExercise, value: any) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const handleRemoveExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workoutName || exercises.length === 0) return;

    setIsSubmitting(true);
    try {
      await api.post('/workouts', {
        name: workoutName,
        date,
        duration_minutes: durationMinutes,
        notes: notes || undefined,
        exercises,
      });
      onSaved();
      onClose();
    } catch (err) {
      console.error('Error logging workout session:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSets = exercises.reduce((acc, e) => acc + (Number(e.sets) || 0), 0);
  const totalVolume = exercises.reduce(
    (acc, e) => acc + (Number(e.sets) || 0) * (Number(e.reps) || 0) * (Number(e.weight_kg) || 0),
    0
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Workout Session"
      description="Record your strength, dumbbells, bands or bodyweight exercises"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              label="Session Title"
              placeholder="e.g. Upper Body Push & Core"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              required
            />
          </div>
          <div>
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Duration (Minutes)"
            type="number"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            min={1}
            required
          />
          <Input
            label="Workout Notes (Optional)"
            placeholder="Energy levels, RPE, warm-up notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Exercise Selector */}
        <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2.5">
          <label className="block text-xs font-semibold text-zinc-300">
            Add Exercise from Library
          </label>
          <div className="flex gap-2">
            <select
              value={selectedExId}
              onChange={(e) => setSelectedExId(e.target.value)}
              className="flex-1 bg-[#18181b] border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="">-- Choose an exercise --</option>
              {exerciseLibrary.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({ex.category} • {ex.target_muscle})
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddExercise}
              disabled={!selectedExId}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add
            </Button>
          </div>
        </div>

        {/* Exercises Sets Logger */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">
              Logged Exercises ({exercises.length})
            </span>
            <div className="text-xs font-mono text-zinc-400">
              Total Sets: <strong className="text-zinc-100">{totalSets}</strong> &nbsp;|&nbsp;{' '}
              Volume: <strong className="text-emerald-400">{totalVolume} kg</strong>
            </div>
          </div>

          {exercises.length > 0 ? (
            <div className="space-y-2.5 max-h-60 overflow-y-auto">
              {exercises.map((ex, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-[140px]">
                    <span className="font-semibold text-zinc-200 block truncate">{ex.exercise_name}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Sets</span>
                      <input
                        type="number"
                        min={1}
                        value={ex.sets}
                        onChange={(e) => handleExerciseChange(idx, 'sets', Number(e.target.value))}
                        className="w-16 bg-[#18181b] border border-zinc-700 rounded px-2 py-1 text-zinc-100 font-mono text-center"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Reps</span>
                      <input
                        type="number"
                        min={1}
                        value={ex.reps}
                        onChange={(e) => handleExerciseChange(idx, 'reps', Number(e.target.value))}
                        className="w-16 bg-[#18181b] border border-zinc-700 rounded px-2 py-1 text-zinc-100 font-mono text-center"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Weight (kg)</span>
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={ex.weight_kg}
                        onChange={(e) => handleExerciseChange(idx, 'weight_kg', Number(e.target.value))}
                        className="w-20 bg-[#18181b] border border-zinc-700 rounded px-2 py-1 text-emerald-400 font-mono text-center"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveExercise(idx)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 rounded transition-colors self-end sm:self-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic p-4 border border-dashed border-zinc-800 rounded-xl text-center">
              No exercises added yet. Select from the library above to build your session.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={exercises.length === 0}
            isLoading={isSubmitting}
          >
            Save Workout Session
          </Button>
        </div>
      </form>
    </Modal>
  );
};
