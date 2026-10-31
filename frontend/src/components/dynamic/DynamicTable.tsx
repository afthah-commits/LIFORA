import React from 'react';
import { Edit2, Trash2, Star, Search, ArrowUpDown } from 'lucide-react';
import { CustomModuleField, CustomModuleRecord } from '../../types';
import { Badge } from '../common/Badge';

interface DynamicTableProps {
  fields: CustomModuleField[];
  records: CustomModuleRecord[];
  onEdit: (record: CustomModuleRecord) => void;
  onDelete: (recordId: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
}

export const DynamicTable: React.FC<DynamicTableProps> = ({
  fields,
  records,
  onEdit,
  onDelete,
  search,
  onSearchChange,
}) => {
  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search entries..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-750 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <span className="text-xs text-zinc-400">{records.length} records</span>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400 uppercase tracking-wider">
              {fields.map((f) => (
                <th key={f.id} className="py-3 px-4 font-semibold">
                  {f.field_label}
                </th>
              ))}
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {records.map((rec) => (
              <tr key={rec.id} className="hover:bg-zinc-800/20 transition-colors">
                {fields.map((f) => (
                  <td key={f.id} className="py-3 px-4 text-zinc-200">
                    {renderDynamicCellValue(f, rec.data[f.field_key])}
                  </td>
                ))}
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEdit(rec)}
                      className="p-1.5 text-zinc-400 hover:text-emerald-400 rounded-lg hover:bg-emerald-500/10 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(rec.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile-First Card View (Avoids awkward horizontal scrolling) */}
      <div className="md:hidden space-y-2.5">
        {records.map((rec) => (
          <div
            key={rec.id}
            className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2 text-xs"
          >
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
              <span className="font-semibold text-zinc-200">
                {rec.data[fields[0]?.field_key] || 'Entry'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onEdit(rec)}
                  className="p-1 text-zinc-400 hover:text-emerald-400 rounded"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete(rec.id)}
                  className="p-1 text-zinc-400 hover:text-rose-400 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {fields.slice(1, 5).map((f) => (
                <div key={f.id} className="space-y-0.5">
                  <span className="text-zinc-500 block truncate">{f.field_label}</span>
                  <span className="text-zinc-200 block truncate">
                    {renderDynamicCellValue(f, rec.data[f.field_key])}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export function renderDynamicCellValue(field: CustomModuleField, value: any) {
  if (value === undefined || value === null || value === '') {
    return <span className="text-zinc-600">—</span>;
  }

  if (field.field_type === 'boolean') {
    return value ? (
      <Badge variant="emerald" size="sm">Yes</Badge>
    ) : (
      <Badge variant="zinc" size="sm">No</Badge>
    );
  }

  if (field.field_type === 'currency') {
    return <span className="font-semibold text-emerald-400">₹{value}</span>;
  }

  if (field.field_type === 'percentage') {
    return <span>{value}%</span>;
  }

  if (field.field_type === 'rating') {
    return (
      <span className="inline-flex items-center gap-1 text-amber-400">
        <Star className="w-3.5 h-3.5 fill-amber-400" /> {value}/5
      </span>
    );
  }

  if (field.field_type === 'url') {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-emerald-400 hover:underline truncate max-w-[150px] inline-block"
      >
        {value}
      </a>
    );
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  return String(value);
}
