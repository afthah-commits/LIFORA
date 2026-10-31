import React, { useState, useRef } from 'react';
import { Camera, Upload, Sparkles, Check, Edit2, AlertCircle, Trash2, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { api } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { FoodAiAnalysisResponse, DetectedFoodItem } from '../../types';

export interface FoodAiScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  selectedDate: string;
}

export const FoodAiScannerModal: React.FC<FoodAiScannerModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  selectedDate,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FoodAiAnalysisResponse | null>(null);
  const [editableItems, setEditableItems] = useState<DetectedFoodItem[]>([]);
  const [mealType, setMealType] = useState('Lunch');
  const [isConfirming, setIsConfirming] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAnalysisResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const resp = await api.post<FoodAiAnalysisResponse>('/food-ai/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAnalysisResult(resp.data);
      setEditableItems(resp.data.detected_items || []);
    } catch (err) {
      console.error('Error analyzing food image:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleItemChange = (index: number, field: keyof DetectedFoodItem, value: any) => {
    const updated = [...editableItems];
    updated[index] = { ...updated[index], [field]: value };
    setEditableItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setEditableItems(editableItems.filter((_, i) => i !== index));
  };

  const handleConfirmAndSave = async () => {
    if (!analysisResult || editableItems.length === 0) return;

    setIsConfirming(true);
    try {
      await api.post('/food-ai/confirm', {
        analysis_id: analysisResult.id,
        date: selectedDate,
        meal_type: mealType,
        items: editableItems.map((item) => ({
          name: item.name,
          quantity: item.estimated_quantity,
          unit: item.unit,
          calories: item.calories,
          protein_g: item.protein_g,
          carbs_g: item.carbs_g,
          fat_g: item.fat_g,
          fiber_g: item.fiber_g,
        })),
      });
      onSaved();
      handleClose();
    } catch (err) {
      console.error('Error confirming food items:', err);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setEditableItems([]);
    onClose();
  };

  const totalCalories = Math.round(editableItems.reduce((acc, i) => acc + (Number(i.calories) || 0), 0));
  const totalProtein = Math.round(editableItems.reduce((acc, i) => acc + (Number(i.protein_g) || 0), 0) * 10) / 10;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Food Photograph AI Scanner"
      description="Upload a photo of your meal for computer vision item & nutrition detection"
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* Step 1: Upload or capture photograph */}
        {!analysisResult && (
          <div className="space-y-4">
            {/* Hidden Inputs for Camera and Gallery */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {!previewUrl ? (
              <div className="space-y-3">
                {/* Drag and Drop / Tap Card */}
                <div
                  onClick={() => galleryInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-700 hover:border-emerald-500/60 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-zinc-900/30"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2.5">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-200">
                    Snap or upload meal photo
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">Supports JPG, PNG, WEBP</p>
                </div>

                {/* Direct Action Buttons for Mobile/Desktop */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-xs font-semibold transition-all active:scale-95 shadow-sm"
                  >
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>Take Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-xs font-semibold transition-all active:scale-95 shadow-sm"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                    <span>Photo Gallery</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative w-full max-w-sm mx-auto h-56 rounded-2xl overflow-hidden border border-zinc-700 shadow-lg">
                  <img src={previewUrl} alt="Meal preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-xs text-zinc-200 font-mono truncate">
                    {selectedFile?.name}
                  </div>
                </div>

                {/* Retake / Replace Actions */}
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Retake Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Choose Different</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <Button variant="ghost" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAnalyze}
                disabled={!selectedFile}
                isLoading={isAnalyzing}
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                Scan with AI
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Review, Correct, and Confirm detected items */}
        {analysisResult && (
          <div className="space-y-4">
            {analysisResult.message && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>{analysisResult.message}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Assign to Meal:
                </label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                  className="bg-[#18181b] border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200"
                >
                  {['Breakfast', 'Morning Snack', 'Lunch', 'Evening Snack', 'Dinner', 'Other'].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-right">
                <span className="text-xs text-zinc-400 block">Meal Totals</span>
                <span className="text-sm font-bold text-zinc-100 font-mono">
                  {totalCalories} kcal &nbsp;|&nbsp;{' '}
                  <strong className="text-emerald-400">{totalProtein}g P</strong>
                </span>
              </div>
            </div>

            {/* Editable items list */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto">
              {editableItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                        className="bg-transparent font-semibold text-zinc-100 border-b border-zinc-700 focus:outline-none focus:border-emerald-500 pb-0.5"
                      />
                      <Badge variant="emerald" size="sm">
                        {Math.round(item.confidence * 100)}% match
                      </Badge>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-zinc-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Quantity</span>
                      <input
                        type="number"
                        value={item.estimated_quantity}
                        onChange={(e) =>
                          handleItemChange(idx, 'estimated_quantity', Number(e.target.value))
                        }
                        className="w-full bg-[#18181b] border border-zinc-800 rounded px-2 py-1 text-zinc-200 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Calories</span>
                      <input
                        type="number"
                        value={item.calories}
                        onChange={(e) => handleItemChange(idx, 'calories', Number(e.target.value))}
                        className="w-full bg-[#18181b] border border-zinc-800 rounded px-2 py-1 text-zinc-200 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Protein (g)</span>
                      <input
                        type="number"
                        value={item.protein_g}
                        onChange={(e) => handleItemChange(idx, 'protein_g', Number(e.target.value))}
                        className="w-full bg-[#18181b] border border-zinc-800 rounded px-2 py-1 text-emerald-400 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Carbs (g)</span>
                      <input
                        type="number"
                        value={item.carbs_g}
                        onChange={(e) => handleItemChange(idx, 'carbs_g', Number(e.target.value))}
                        className="w-full bg-[#18181b] border border-zinc-800 rounded px-2 py-1 text-zinc-200 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Fat (g)</span>
                      <input
                        type="number"
                        value={item.fat_g}
                        onChange={(e) => handleItemChange(idx, 'fat_g', Number(e.target.value))}
                        className="w-full bg-[#18181b] border border-zinc-800 rounded px-2 py-1 text-zinc-200 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAnalysisResult(null)}
              >
                Scan Another Photo
              </Button>

              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmAndSave}
                  isLoading={isConfirming}
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  Confirm & Save Meal
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
