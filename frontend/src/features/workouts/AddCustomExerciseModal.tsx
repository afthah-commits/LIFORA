import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

const exerciseSchema = z.object({
  name: z.string().min(1, 'Exercise name is required'),
  category: z.string().min(1, 'Category is required'),
  target_muscle: z.string().min(1, 'Target muscle is required'),
  description: z.string().optional(),
});

type ExerciseFormData = z.infer<typeof exerciseSchema>;

export interface AddCustomExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const AddCustomExerciseModal: React.FC<AddCustomExerciseModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExerciseFormData>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      category: 'Dumbbells',
    },
  });

  const onSubmit = async (data: ExerciseFormData) => {
    setIsSubmitting(true);
    try {
      await api.post('/exercises', data);
      reset();
      onSaved();
      onClose();
    } catch (err) {
      console.error('Error creating custom exercise:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Custom Exercise"
      description="Create a new exercise in your personal fitness movement library"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Exercise Name"
          placeholder="e.g. Incline Dumbbell Hammer Curl"
          error={errors.name?.message}
          {...register('name')}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Category</label>
            <select
              className="w-full bg-[#18181b] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
              {...register('category')}
            >
              {['Dumbbells', 'Resistance bands', 'Bodyweight', 'General strength'].map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Target Muscle"
            placeholder="e.g. Biceps, Chest, Quads, Delts"
            error={errors.target_muscle?.message}
            {...register('target_muscle')}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
            Technique Notes / Description (Optional)
          </label>
          <textarea
            rows={2}
            className="w-full bg-[#18181b] border border-zinc-800 rounded-lg p-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            placeholder="Key cues: Elbows pinned, controlled eccentric phase..."
            {...register('description')}
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            Save Exercise
          </Button>
        </div>
      </form>
    </Modal>
  );
};
