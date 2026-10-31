import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Boxes,
  Plus,
  Search,
  Trash2,
  Edit2,
  Calendar,
  Layers,
  ArrowLeft,
  Star,
  CheckCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { EmptyState } from '../../components/common/EmptyState';
import {
  CustomModule,
  CustomModuleField,
  CustomModuleRecord,
  PaginatedRecordsResponse,
} from '../../types';

export const CustomModuleViewPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CustomModuleRecord | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // 1. Fetch Module Details & Fields
  const { data: moduleData, isLoading: loadingModule } = useQuery<CustomModule>({
    queryKey: ['custom-module', slug],
    queryFn: async () => {
      const res = await api.get(`/custom-modules/${slug}`);
      return res.data;
    },
    enabled: !!slug,
  });

  // 2. Fetch Records
  const { data: recordsData, isLoading: loadingRecords } = useQuery<PaginatedRecordsResponse>({
    queryKey: ['custom-module-records', moduleData?.id, search, page],
    queryFn: async () => {
      if (!moduleData?.id) return { total: 0, page: 1, page_size: 20, total_pages: 1, records: [] };
      const res = await api.get(
        `/custom-modules/${moduleData.id}/records?search=${encodeURIComponent(search)}&page=${page}&page_size=20`
      );
      return res.data;
    },
    enabled: !!moduleData?.id,
  });

  // Mutations
  const createRecordMutation = useMutation({
    mutationFn: async (payload: { data: Record<string, any> }) => {
      return api.post(`/custom-modules/${moduleData?.id}/records`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-module-records', moduleData?.id] });
      queryClient.invalidateQueries({ queryKey: ['custom-modules'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      setIsRecordModalOpen(false);
      setFormData({});
    },
  });

  const updateRecordMutation = useMutation({
    mutationFn: async ({ recordId, data }: { recordId: string; data: Record<string, any> }) => {
      return api.put(`/custom-modules/records/${recordId}`, { data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-module-records', moduleData?.id] });
      queryClient.invalidateQueries({ queryKey: ['custom-modules'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      setIsRecordModalOpen(false);
      setEditingRecord(null);
      setFormData({});
    },
  });

  const deleteRecordMutation = useMutation({
    mutationFn: async (recordId: string) => {
      return api.delete(`/custom-modules/${moduleData?.id}/records/${recordId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-module-records', moduleData?.id] });
      queryClient.invalidateQueries({ queryKey: ['custom-modules'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    },
  });

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRecord) {
      updateRecordMutation.mutate({ recordId: editingRecord.id, data: formData });
    } else {
      createRecordMutation.mutate({ data: formData });
    }
  };

  if (loadingModule) {
    return (
      <div className="py-20 text-center text-xs text-zinc-400">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading custom module...
      </div>
    );
  }

  if (!moduleData) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-bold text-zinc-100">Module Not Found</h2>
        <p className="text-xs text-zinc-400 mt-2">The module "{slug}" could not be located.</p>
        <Link to="/modules/builder" className="mt-4 inline-block">
          <Button variant="primary" size="sm">Go to Module Builder</Button>
        </Link>
      </div>
    );
  }

  const fields = moduleData.fields || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#121215] to-[#16161c] border border-zinc-800">
        <div>
          <Link
            to="/modules/builder"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-emerald-400 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Builder
          </Link>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
              Custom Module
            </span>
            <Badge variant="emerald" size="sm">
              {recordsData?.total || 0} Records
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 flex items-center gap-2">
            <Boxes className="w-7 h-7 text-emerald-400" /> {moduleData.name}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            {moduleData.description || `Dynamic entries for ${moduleData.name}.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setEditingRecord(null);
              setFormData({});
              setIsRecordModalOpen(true);
            }}
          >
            Add New Entry
          </Button>
        </div>
      </div>

      {/* Records Table and Filter */}
      <Card className="bg-[#121215] border-zinc-800">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base text-zinc-100">
            Recorded Entries ({recordsData?.total || 0})
          </CardTitle>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search records..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </CardHeader>

        {loadingRecords ? (
          <div className="py-12 text-center text-xs text-zinc-500">Loading entries...</div>
        ) : recordsData && recordsData.records.length > 0 ? (
          <div className="overflow-x-auto">
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
                {recordsData.records.map((rec: CustomModuleRecord) => (
                  <tr key={rec.id} className="hover:bg-zinc-800/20 transition-colors">
                    {fields.map((f) => {
                      const val = rec.data[f.field_key];
                      return (
                        <td key={f.id} className="py-3 px-4 text-zinc-200">
                          {renderCellValue(f, val)}
                        </td>
                      );
                    })}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingRecord(rec);
                            setFormData({ ...rec.data });
                            setIsRecordModalOpen(true);
                          }}
                          className="p-1.5 text-zinc-500 hover:text-emerald-400 rounded-lg hover:bg-emerald-500/10 transition-colors"
                          title="Edit Record"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteRecordMutation.mutate(rec.id)}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                          title="Delete Record"
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
        ) : (
          <EmptyState
            icon={<Boxes className="w-6 h-6" />}
            title="No records found"
            description={
              search
                ? `No entries match "${search}". Try clearing your search.`
                : 'Start tracking by logging the first entry in this module.'
            }
            actionLabel="Add First Entry"
            onAction={() => {
              setEditingRecord(null);
              setFormData({});
              setIsRecordModalOpen(true);
            }}
          />
        )}
      </Card>

      {/* Dynamic Record Modal */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => {
          setIsRecordModalOpen(false);
          setEditingRecord(null);
        }}
        title={editingRecord ? `Edit Entry – ${moduleData.name}` : `New Entry – ${moduleData.name}`}
        description={
          editingRecord
            ? 'Modify values for this recorded entry.'
            : 'Fill in the custom fields for this record.'
        }
      >
        <form onSubmit={handleRecordSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.id}>{renderDynamicInputField(field, formData, handleFieldChange)}</div>
          ))}

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsRecordModalOpen(false);
                setEditingRecord(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createRecordMutation.isPending || updateRecordMutation.isPending}
            >
              {editingRecord ? 'Update Entry' : 'Save Entry'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// Helper to format table cells
function renderCellValue(field: CustomModuleField, value: any) {
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
      <span className="flex items-center gap-1 text-amber-400">
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

// Helper to render dynamic form inputs
function renderDynamicInputField(
  field: CustomModuleField,
  formData: Record<string, any>,
  onChange: (key: string, value: any) => void
) {
  const currentVal = formData[field.field_key] ?? '';

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
            onChange={(e) => onChange(field.field_key, e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
          />
        </div>
      );

    case 'boolean':
      return (
        <div className="pt-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={!!currentVal}
              onChange={(e) => onChange(field.field_key, e.target.checked)}
              className="rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500"
            />
            {field.field_label}
          </label>
        </div>
      );

    case 'dropdown':
      return (
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
            {field.field_label} {field.is_required && <span className="text-rose-400">*</span>}
          </label>
          <select
            value={currentVal}
            required={field.is_required}
            onChange={(e) => onChange(field.field_key, e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
          >
            <option value="">Select an option</option>
            {(field.options || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );

    case 'rating':
      return (
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
            {field.field_label} (1 to 5 Stars) {field.is_required && <span className="text-rose-400">*</span>}
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => onChange(field.field_key, star)}
                className={`p-2 rounded-lg border text-xs font-bold transition-all ${
                  currentVal === star
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:bg-zinc-800'
                }`}
              >
                ★ {star}
              </button>
            ))}
          </div>
        </div>
      );

    case 'number':
    case 'decimal':
    case 'currency':
    case 'percentage':
      return (
        <Input
          type="number"
          step={field.field_type === 'number' ? '1' : '0.01'}
          label={field.field_label}
          placeholder={field.placeholder || '0'}
          value={currentVal}
          required={field.is_required}
          onChange={(e) => onChange(field.field_key, e.target.value ? parseFloat(e.target.value) : '')}
        />
      );

    case 'date':
      return (
        <Input
          type="date"
          label={field.field_label}
          value={currentVal}
          required={field.is_required}
          onChange={(e) => onChange(field.field_key, e.target.value)}
        />
      );

    case 'datetime':
      return (
        <Input
          type="datetime-local"
          label={field.field_label}
          value={currentVal}
          required={field.is_required}
          onChange={(e) => onChange(field.field_key, e.target.value)}
        />
      );

    case 'time':
      return (
        <Input
          type="time"
          label={field.field_label}
          value={currentVal}
          required={field.is_required}
          onChange={(e) => onChange(field.field_key, e.target.value)}
        />
      );

    case 'email':
      return (
        <Input
          type="email"
          label={field.field_label}
          placeholder={field.placeholder || 'user@example.com'}
          value={currentVal}
          required={field.is_required}
          onChange={(e) => onChange(field.field_key, e.target.value)}
        />
      );

    case 'url':
      return (
        <Input
          type="url"
          label={field.field_label}
          placeholder={field.placeholder || 'https://...'}
          value={currentVal}
          required={field.is_required}
          onChange={(e) => onChange(field.field_key, e.target.value)}
        />
      );

    default: // text
      return (
        <Input
          label={field.field_label}
          placeholder={field.placeholder || ''}
          value={currentVal}
          required={field.is_required}
          onChange={(e) => onChange(field.field_key, e.target.value)}
        />
      );
  }
}
