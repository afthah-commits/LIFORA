import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, Trash2, Check } from 'lucide-react';
import { api } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Food, FoodEntryItem } from '../../types';

export interface AddFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialMealType?: string;
  selectedDate: string;
}

interface StagedItem {
  food_id?: string;
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export const AddFoodModal: React.FC<AddFoodModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialMealType = 'Breakfast',
  selectedDate,
}) => {
  const [mealType, setMealType] = useState(initialMealType);
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState<number>(100);
  const [stagedItems, setStagedItems] = useState<StagedItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMealType(initialMealType);
  }, [initialMealType]);

  // Fetch foods catalog
  const { data: foods = [] } = useQuery<Food[]>({
    queryKey: ['foods-search', search],
    queryFn: async () => {
      const resp = await api.get(`/foods?search=${encodeURIComponent(search)}`);
      return resp.data;
    },
    enabled: isOpen,
  });

  const handleSelectFood = (food: Food) => {
    setSelectedFood(food);
    setQuantity(food.serving_size || 100);
  };

  const handleAddStagedItem = () => {
    if (!selectedFood || quantity <= 0) return;

    const ratio = quantity / (selectedFood.serving_size || 100);
    const item: StagedItem = {
      food_id: selectedFood.id,
      food_name: selectedFood.name,
      quantity: Number(quantity),
      unit: selectedFood.serving_unit || 'g',
      calories: Math.round(selectedFood.calories * ratio * 10) / 10,
      protein_g: Math.round(selectedFood.protein_g * ratio * 10) / 10,
      carbs_g: Math.round(selectedFood.carbs_g * ratio * 10) / 10,
      fat_g: Math.round(selectedFood.fat_g * ratio * 10) / 10,
      fiber_g: Math.round((selectedFood.fiber_g || 0) * ratio * 10) / 10,
    };

    setStagedItems([...stagedItems, item]);
    setSelectedFood(null);
    setSearch('');
  };

  const handleRemoveStagedItem = (index: number) => {
    setStagedItems(stagedItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stagedItems.length === 0) return;

    setIsSubmitting(true);
    try {
      await api.post('/food-entries', {
        date: selectedDate,
        meal_type: mealType,
        notes: notes || undefined,
        items: stagedItems,
      });
      setStagedItems([]);
      setSelectedFood(null);
      setNotes('');
      onSaved();
      onClose();
    } catch (err) {
      console.error('Error logging food entry:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalMealCalories = Math.round(stagedItems.reduce((acc, i) => acc + i.calories, 0));
  const totalMealProtein = Math.round(stagedItems.reduce((acc, i) => acc + i.protein_g, 0) * 10) / 10;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Food & Nutrition"
      description={`Record meal entries for ${selectedDate}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Meal Category Selection */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">Meal Category</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {['Breakfast', 'Morning Snack', 'Lunch', 'Evening Snack', 'Dinner', 'Other'].map((type) => (
              <button
                type="button"
                key={type}
                onClick={() => setMealType(type)}
                className={`text-xs py-2 px-2.5 rounded-lg border font-medium transition-all text-center ${
                  mealType === type
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                    : 'bg-[#18181b] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Food Search & Item Selection */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search whole foods, proteins, meals..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#18181b] border border-zinc-700/80 rounded-lg pl-9 pr-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Search results dropdown / list */}
          {search && (
            <div className="max-h-44 overflow-y-auto rounded-lg border border-zinc-800 bg-[#141417] divide-y divide-zinc-800/60">
              {foods.length > 0 ? (
                foods.map((food) => (
                  <button
                    type="button"
                    key={food.id}
                    onClick={() => handleSelectFood(food)}
                    className="w-full text-left p-2.5 hover:bg-zinc-800/50 flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <span className="font-medium text-zinc-200">{food.name}</span>
                      <span className="text-zinc-500 ml-2">({food.category})</span>
                    </div>
                    <div className="text-zinc-400 font-mono">
                      {food.calories} kcal • {food.protein_g}g P / {food.serving_size}{food.serving_unit}
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-zinc-500">
                  No foods found. You can add a custom food item anytime.
                </div>
              )}
            </div>
          )}

          {/* Selected Food Quantity & Add to Meal */}
          {selectedFood && (
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-emerald-400">{selectedFood.name}</span>
                <span className="text-xs text-zinc-400">
                  Base: {selectedFood.calories} kcal ({selectedFood.protein_g}g P) per {selectedFood.serving_size} {selectedFood.serving_unit}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-32">
                  <Input
                    label={`Quantity (${selectedFood.serving_unit})`}
                    type="number"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </div>
                <div className="flex-1 pt-5">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleAddStagedItem}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add to Meal
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Staged Items List */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Meal Items ({stagedItems.length})
          </label>
          {stagedItems.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {stagedItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800 text-xs"
                >
                  <div>
                    <span className="font-semibold text-zinc-200">{item.food_name}</span>
                    <span className="text-zinc-500 ml-2">
                      ({item.quantity} {item.unit})
                    </span>
                    <p className="text-zinc-400 text-[11px] mt-0.5">
                      {item.calories} kcal • {item.protein_g}g P • {item.carbs_g}g C • {item.fat_g}g F
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveStagedItem(idx)}
                    className="p-1 text-zinc-500 hover:text-rose-400 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic p-3 border border-dashed border-zinc-800 rounded-lg text-center">
              No items added to this meal yet. Search above to add foods.
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <Input
            label="Meal Notes (Optional)"
            placeholder="e.g. Post-workout snack, restaurant, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Meal Totals & Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          <div className="text-xs text-zinc-400">
            Total: <strong className="text-zinc-100">{totalMealCalories} kcal</strong> &nbsp;|&nbsp;{' '}
            <strong className="text-emerald-400">{totalMealProtein}g Protein</strong>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={stagedItems.length === 0}
              isLoading={isSubmitting}
            >
              Save Meal
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
