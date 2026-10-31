import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

const foodSchema = z.object({
  name: z.string().min(1, 'Food name is required'),
  brand: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  serving_size: z.number().gt(0, 'Serving size must be greater than 0'),
  serving_unit: z.string().min(1, 'Unit is required'),
  calories: z.number().min(0, 'Calories cannot be negative'),
  protein_g: z.number().min(0, 'Protein cannot be negative'),
  carbs_g: z.number().min(0, 'Carbs cannot be negative'),
  fat_g: z.number().min(0, 'Fat cannot be negative'),
  fiber_g: z.number().min(0).optional(),
});

type FoodFormData = z.infer<typeof foodSchema>;

export interface AddCustomFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const AddCustomFoodModal: React.FC<AddCustomFoodModalProps> = ({
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
  } = useForm<FoodFormData>({
    resolver: zodResolver(foodSchema),
    defaultValues: {
      category: 'Protein',
      serving_size: 100,
      serving_unit: 'g',
      calories: 150,
      protein_g: 20,
      carbs_g: 0,
      fat_g: 5,
      fiber_g: 0,
    },
  });

  const onSubmit = async (data: FoodFormData) => {
    setIsSubmitting(true);
    try {
      await api.post('/foods', data);
      reset();
      onSaved();
      onClose();
    } catch (err) {
      console.error('Error creating custom food:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Custom Food"
      description="Add a custom whole food or packaged item to your personal food database"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Food Name"
          placeholder="e.g. Homemade High-Protein Paneer Curry"
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
              {['Protein', 'Carbs', 'Fats', 'Vegetables', 'Fruits', 'Dairy', 'Snacks', 'Beverages', 'Meals', 'Other'].map(
                (c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                )
              )}
            </select>
          </div>

          <Input
            label="Brand / Source (Optional)"
            placeholder="e.g. Homemade, Amul, Optimum Nutrition"
            {...register('brand')}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Serving Size"
            type="number"
            step="any"
            error={errors.serving_size?.message}
            {...register('serving_size', { valueAsNumber: true })}
          />
          <Input
            label="Unit"
            placeholder="g, ml, scoop, piece"
            error={errors.serving_unit?.message}
            {...register('serving_unit')}
          />
        </div>

        <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
          <span className="block text-xs font-semibold text-zinc-300">
            Nutritional Values (Per Serving Size)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Input
              label="Calories (kcal)"
              type="number"
              step="any"
              error={errors.calories?.message}
              {...register('calories', { valueAsNumber: true })}
            />
            <Input
              label="Protein (g)"
              type="number"
              step="any"
              error={errors.protein_g?.message}
              {...register('protein_g', { valueAsNumber: true })}
            />
            <Input
              label="Carbs (g)"
              type="number"
              step="any"
              error={errors.carbs_g?.message}
              {...register('carbs_g', { valueAsNumber: true })}
            />
            <Input
              label="Fat (g)"
              type="number"
              step="any"
              error={errors.fat_g?.message}
              {...register('fat_g', { valueAsNumber: true })}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            Save Custom Food
          </Button>
        </div>
      </form>
    </Modal>
  );
};
