import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Boxes,
  Plus,
  Settings,
  Eye,
  Trash2,
  Edit2,
  ExternalLink,
  Layers,
  Check,
  LayoutGrid,
} from 'lucide-react';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { EmptyState } from '../../components/common/EmptyState';
import { CustomModule, CustomModuleField } from '../../types';

export const FIELD_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'long_text', label: 'Long Text / Notes' },
  { value: 'number', label: 'Integer Number' },
  { value: 'decimal', label: 'Decimal Number' },
  { value: 'currency', label: 'Currency (₹)' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date & Time' },
  { value: 'time', label: 'Time' },
  { value: 'boolean', label: 'Checkbox / Boolean' },
  { value: 'dropdown', label: 'Dropdown Select' },
  { value: 'multi_select', label: 'Multi-Select' },
  { value: 'email', label: 'Email Address' },
  { value: 'url', label: 'Website / URL' },
  { value: 'rating', label: 'Rating (1-5)' },
  { value: 'percentage', label: 'Percentage (%)' },
];

export const ModuleBuilderPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<CustomModule | null>(null);

  // New Module Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Box');
  const [color, setColor] = useState('emerald');
  const [showInSidebar, setShowInSidebar] = useState(true);
  const [showInDashboard, setShowInDashboard] = useState(true);

  // New Field Form State
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [placeholder, setPlaceholder] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [optionsStr, setOptionsStr] = useState('');

  // Edit Field State
  const [editingField, setEditingField] = useState<CustomModuleField | null>(null);
  const [isEditFieldModalOpen, setIsEditFieldModalOpen] = useState(false);
  const [editFieldLabel, setEditFieldLabel] = useState('');
  const [editPlaceholder, setEditPlaceholder] = useState('');
  const [editIsRequired, setEditIsRequired] = useState(false);

  // Queries
  const { data: modules = [], isLoading } = useQuery<CustomModule[]>({
    queryKey: ['custom-modules'],
    queryFn: async () => {
      const res = await api.get('/custom-modules');
      return res.data;
    },
  });

  // Fetch full details of selected module (including fields)
  const { data: moduleDetail } = useQuery<CustomModule>({
    queryKey: ['custom-module-detail', selectedModule?.id],
    queryFn: async () => {
      if (!selectedModule?.id) return null as any;
      const res = await api.get(`/custom-modules/${selectedModule.id}`);
      return res.data;
    },
    enabled: !!selectedModule?.id,
  });

  // Mutations
  const createModuleMutation = useMutation({
    mutationFn: async (payload: any) => api.post('/custom-modules', payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['custom-modules'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      setIsModuleModalOpen(false);
      setName('');
      setDescription('');
      setSelectedModule(res.data);
    },
  });

  const addFieldMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post(`/custom-modules/${selectedModule?.id}/fields`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-module-detail', selectedModule?.id] });
      queryClient.invalidateQueries({ queryKey: ['custom-modules'] });
      setIsFieldModalOpen(false);
      setFieldLabel('');
      setPlaceholder('');
      setOptionsStr('');
      setIsRequired(false);
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/custom-modules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-modules'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      setSelectedModule(null);
    },
  });

  const deleteFieldMutation = useMutation({
    mutationFn: async (fieldId: string) => {
      return api.delete(`/custom-modules/${selectedModule?.id}/fields/${fieldId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-module-detail', selectedModule?.id] });
      queryClient.invalidateQueries({ queryKey: ['custom-modules'] });
    },
  });

  const updateFieldMutation = useMutation({
    mutationFn: async ({ fieldId, payload }: { fieldId: string; payload: any }) => {
      return api.put(`/custom-modules/fields/${fieldId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-module-detail', selectedModule?.id] });
      queryClient.invalidateQueries({ queryKey: ['custom-modules'] });
      setIsEditFieldModalOpen(false);
      setEditingField(null);
    },
  });

  const updateModuleMutation = useMutation({
    mutationFn: async ({ moduleId, payload }: { moduleId: string; payload: any }) => {
      return api.put(`/custom-modules/${moduleId}`, payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['custom-modules'] });
      queryClient.invalidateQueries({ queryKey: ['custom-module-detail', selectedModule?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      setSelectedModule((prev) => (prev ? { ...prev, ...res.data } : res.data));
    },
  });

  const handleCreateModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createModuleMutation.mutate({
      name: name.trim(),
      description: description.trim() || null,
      icon,
      color,
      show_in_sidebar: showInSidebar,
      show_in_dashboard: showInDashboard,
    });
  };

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldLabel.trim() || !selectedModule) return;

    let opts: string[] | null = null;
    if (['dropdown', 'multi_select'].includes(fieldType) && optionsStr.trim()) {
      opts = optionsStr.split(',').map((o) => o.trim()).filter(Boolean);
    }

    addFieldMutation.mutate({
      field_label: fieldLabel.trim(),
      field_type: fieldType,
      placeholder: placeholder.trim() || null,
      is_required: isRequired,
      options: opts,
      display_order: (moduleDetail?.fields?.length || 0) + 1,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#121215] to-[#16161c] border border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
              Settings & Customization
            </span>
            <Badge variant="emerald" size="sm">No Code Required</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 flex items-center gap-2">
            <Boxes className="w-7 h-7 text-emerald-400" /> Dynamic Module Builder
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Create tailored life management modules with 15 dynamic field types without writing backend code.
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModuleModalOpen(true)}
        >
          Create Custom Module
        </Button>
      </div>

      {/* Main Grid: Modules List & Active Module Fields Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Modules list */}
        <div className="space-y-4">
          <Card className="bg-[#121215] border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base text-zinc-100">
                Your Modules ({modules.length})
              </CardTitle>
            </CardHeader>
            {isLoading ? (
              <div className="py-8 text-center text-xs text-zinc-500">Loading modules...</div>
            ) : modules.length > 0 ? (
              <div className="divide-y divide-zinc-800/60">
                {modules.map((mod) => (
                  <div
                    key={mod.id}
                    onClick={() => setSelectedModule(mod)}
                    className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                      selectedModule?.id === mod.id
                        ? 'bg-emerald-500/10 border border-emerald-500/30'
                        : 'hover:bg-zinc-800/30 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-zinc-800 text-emerald-400 flex items-center justify-center font-bold">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-100">{mod.name}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                          <span>{mod.records_count} records</span>
                          {mod.show_in_sidebar && <span>• In Sidebar</span>}
                          {mod.show_in_dashboard && <span>• In Dashboard</span>}
                        </div>
                      </div>
                    </div>

                    <Link
                      to={`/modules/${mod.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 text-zinc-400 hover:text-emerald-400 rounded-lg hover:bg-zinc-800 transition-colors"
                      title="Open Module View"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Boxes className="w-6 h-6" />}
                title="No custom modules yet"
                description="Build custom trackers for reading, books, habit streaks, vehicles, or courses."
                actionLabel="Create First Module"
                onAction={() => setIsModuleModalOpen(true)}
              />
            )}
          </Card>
        </div>

        {/* Right 2 columns: Selected Module Fields Manager */}
        <div className="lg:col-span-2 space-y-4">
          {selectedModule ? (
            <Card className="bg-[#121215] border-zinc-800">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg text-zinc-100">{selectedModule.name}</CardTitle>
                    <Badge variant="emerald" size="sm">/{selectedModule.slug}</Badge>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    {selectedModule.description || 'No description provided.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<ExternalLink className="w-4 h-4" />}
                    onClick={() => navigate(`/modules/${selectedModule.slug}`)}
                  >
                    Open View
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setIsFieldModalOpen(true)}
                  >
                    Add Field
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete "${selectedModule.name}"?`)) {
                        deleteModuleMutation.mutate(selectedModule.id);
                      }
                    }}
                    className="text-rose-400 hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>

              {/* Module Visibility Controls */}
              <div className="mt-3 flex flex-wrap items-center gap-4 sm:gap-6 py-2.5 px-3 bg-zinc-900/60 rounded-xl border border-zinc-800 text-xs text-zinc-300">
                <span className="font-semibold text-zinc-400">Module Visibility:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedModule.show_in_sidebar}
                    onChange={(e) =>
                      updateModuleMutation.mutate({
                        moduleId: selectedModule.id,
                        payload: { show_in_sidebar: e.target.checked },
                      })
                    }
                    className="rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Show in Sidebar Navigation</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedModule.show_in_dashboard}
                    onChange={(e) =>
                      updateModuleMutation.mutate({
                        moduleId: selectedModule.id,
                        payload: { show_in_dashboard: e.target.checked },
                      })
                    }
                    className="rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Show on Dashboard</span>
                </label>
              </div>

              {/* Fields List */}
              <div className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Configured Fields ({moduleDetail?.fields?.length || 0})
                  </span>
                  <span className="text-[11px] text-zinc-500">15 Field Types Supported</span>
                </div>

                {moduleDetail?.fields && moduleDetail.fields.length > 0 ? (
                  <div className="divide-y divide-zinc-800/60">
                    {moduleDetail.fields.map((field) => (
                      <div
                        key={field.id}
                        className="py-3 px-2 flex items-center justify-between hover:bg-zinc-800/20 rounded-lg"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-zinc-200">
                              {field.field_label}
                            </span>
                            <Badge variant="zinc" size="sm">
                              {FIELD_TYPES.find((t) => t.value === field.field_type)?.label || field.field_type}
                            </Badge>
                            {field.is_required && (
                              <Badge variant="rose" size="sm">Required</Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-0.5">
                            Key: <code className="text-emerald-400">{field.field_key}</code>
                            {field.options && field.options.length > 0 && (
                              <span> • Options: {field.options.join(', ')}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingField(field);
                              setEditFieldLabel(field.field_label);
                              setEditPlaceholder(field.placeholder || '');
                              setEditIsRequired(field.is_required);
                              setIsEditFieldModalOpen(true);
                            }}
                            className="p-1.5 text-zinc-500 hover:text-emerald-400 rounded-lg hover:bg-emerald-500/10 transition-colors"
                            title="Edit Field"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteFieldMutation.mutate(field.id)}
                            className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                            title="Delete Field"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Layers className="w-6 h-6" />}
                    title="No fields added yet"
                    description="Define fields like Title, Rating, Date, or Price to begin logging entries."
                    actionLabel="Add First Field"
                    onAction={() => setIsFieldModalOpen(true)}
                  />
                )}

              </div>
            </Card>
          ) : (
            <Card className="bg-[#121215] border-zinc-800 py-16 text-center">
              <Layers className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-zinc-300">Select a Module</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                Choose a module from the left or create a new custom module to customize its dynamic fields.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Create Module Modal */}
      <Modal
        isOpen={isModuleModalOpen}
        onClose={() => setIsModuleModalOpen(false)}
        title="Create Custom Module"
        description="Add a new custom tracker to your FITPULSE AI workspace."
      >
        <form onSubmit={handleCreateModule} className="space-y-4">
          <Input
            label="Module Name"
            placeholder="e.g. Book Reading, Car Maintenance, Habit Tracker"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Description (Optional)"
            placeholder="Brief purpose of this module"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={showInSidebar}
                onChange={(e) => setShowInSidebar(e.target.checked)}
                className="rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500"
              />
              Show in Sidebar Navigation
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={showInDashboard}
                onChange={(e) => setShowInDashboard(e.target.checked)}
                className="rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500"
              />
              Show on Dashboard Widget
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsModuleModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={createModuleMutation.isPending}>
              Create Module
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Field Modal */}
      <Modal
        isOpen={isFieldModalOpen}
        onClose={() => setIsFieldModalOpen(false)}
        title={`Add Field to ${selectedModule?.name}`}
        description="Choose from 15 field types with metadata-driven validation."
      >
        <form onSubmit={handleAddField} className="space-y-4">
          <Input
            label="Field Label"
            placeholder="e.g. Book Title, Rating, Due Date, Cost"
            value={fieldLabel}
            onChange={(e) => setFieldLabel(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Field Type</label>
            <select
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Placeholder (Optional)"
            placeholder="e.g. Enter title..."
            value={placeholder}
            onChange={(e) => setPlaceholder(e.target.value)}
          />

          {['dropdown', 'multi_select'].includes(fieldType) && (
            <Input
              label="Options (Comma-separated)"
              placeholder="e.g. Fiction, Non-Fiction, Sci-Fi, Biography"
              value={optionsStr}
              onChange={(e) => setOptionsStr(e.target.value)}
              required
            />
          )}

          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500"
              />
              Required Field
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsFieldModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={addFieldMutation.isPending}>
              Save Field
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Field Modal */}
      <Modal
        isOpen={isEditFieldModalOpen}
        onClose={() => {
          setIsEditFieldModalOpen(false);
          setEditingField(null);
        }}
        title={`Edit Field – ${editingField?.field_label || ''}`}
        description="Update the field configuration and display properties."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!editingField || !editFieldLabel.trim()) return;
            updateFieldMutation.mutate({
              fieldId: editingField.id,
              payload: {
                field_label: editFieldLabel.trim(),
                placeholder: editPlaceholder.trim() || null,
                is_required: editIsRequired,
              },
            });
          }}
          className="space-y-4"
        >
          <Input
            label="Field Label"
            value={editFieldLabel}
            onChange={(e) => setEditFieldLabel(e.target.value)}
            required
          />

          <Input
            label="Placeholder (Optional)"
            placeholder="e.g. Enter value..."
            value={editPlaceholder}
            onChange={(e) => setEditPlaceholder(e.target.value)}
          />

          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={editIsRequired}
                onChange={(e) => setEditIsRequired(e.target.checked)}
                className="rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500"
              />
              Required Field
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsEditFieldModalOpen(false);
                setEditingField(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={updateFieldMutation.isPending}>
              Update Field
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
