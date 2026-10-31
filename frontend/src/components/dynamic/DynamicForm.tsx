import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { CustomModuleField } from '../../types';
import { Input } from '../common/Input';
import { moduleRegistry } from '../../services/moduleRegistry';

interface DynamicFormProps {
  fields: CustomModuleField[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  errors?: Record<string, string>;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({
  fields,
  values,
  onChange,
  errors = {},
}) => {
  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.id} className="space-y-1">
          {renderFieldInput(field, values[field.field_key], (val) => onChange(field.field_key, val))}
          {errors[field.field_key] && (
            <p className="text-[11px] text-rose-400 mt-0.5">{errors[field.field_key]}</p>
          )}
        </div>
      ))}
    </div>
  );
};

function renderFieldInput(
  field: CustomModuleField,
  value: any,
  onChange: (val: any) => void
) {
  const currentVal = value ?? '';

  switch (field.field_type) {
    case 'long_text':
      return (
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
            {field.field_label} {field.is_required && <span className="text-rose-400">*</span>}
          </label>
          <textarea
            rows={3}
            value={currentVal}
            placeholder={field.placeholder || ''}
            required={field.is_required}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
          />
        </div>
      );

    case 'boolean':
      return (
        <div className="pt-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 select-none">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              className="rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500 w-4 h-4"
            />
            <span>{field.field_label}</span>
          </label>
        </div>
      );

    case 'dropdown': {
      const opts = field.options || [];
      return (
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
            {field.field_label} {field.is_required && <span className="text-rose-400">*</span>}
          </label>
          <select
            value={currentVal}
            required={field.is_required}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
          >
            <option value="">Select an option...</option>
            {opts.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    }

    case 'multi_select': {
      const opts = field.options || [];
      const selectedList: string[] = Array.isArray(value) ? value : [];
      const toggle = (opt: string) => {
        if (selectedList.includes(opt)) {
          onChange(selectedList.filter((x) => x !== opt));
        } else {
          onChange([...selectedList, opt]);
        }
      };

      return (
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
            {field.field_label} {field.is_required && <span className="text-rose-400">*</span>}
          </label>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {opts.map((opt) => {
              const active = selectedList.includes(opt);
              return (
                <button
                  type="button"
                  key={opt}
                  onClick={() => toggle(opt)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    active
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-750 hover:bg-zinc-750'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case 'rating': {
      const ratingVal = Number(currentVal) || 0;
      return (
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
            {field.field_label} {field.is_required && <span className="text-rose-400">*</span>}
          </label>
          <div className="flex items-center gap-1.5 pt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                onClick={() => onChange(star)}
                className="p-1 hover:scale-110 transition-transform"
              >
                <Star
                  className={`w-5 h-5 ${
                    star <= ratingVal
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-zinc-600 hover:text-zinc-500'
                  }`}
                />
              </button>
            ))}
            <span className="text-xs text-zinc-400 ml-2">{ratingVal > 0 ? `${ratingVal}/5` : 'Rate'}</span>
          </div>
        </div>
      );
    }

    case 'currency':
      return (
        <Input
          type="number"
          label={`${field.field_label} (₹)`}
          placeholder={field.placeholder || '0.00'}
          value={currentVal}
          required={field.is_required}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'percentage':
      return (
        <Input
          type="number"
          label={`${field.field_label} (%)`}
          placeholder={field.placeholder || '0 - 100'}
          value={currentVal}
          required={field.is_required}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'date':
      return (
        <Input
          type="date"
          label={field.field_label}
          value={currentVal}
          required={field.is_required}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'datetime':
      return (
        <Input
          type="datetime-local"
          label={field.field_label}
          value={currentVal}
          required={field.is_required}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'time':
      return (
        <Input
          type="time"
          label={field.field_label}
          value={currentVal}
          required={field.is_required}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'number':
    case 'decimal':
      return (
        <Input
          type="number"
          label={field.field_label}
          placeholder={field.placeholder || ''}
          value={currentVal}
          required={field.is_required}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    default:
      return (
        <Input
          type="text"
          label={field.field_label}
          placeholder={field.placeholder || ''}
          value={currentVal}
          required={field.is_required}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}
