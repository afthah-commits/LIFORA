import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Sliders,
  LayoutDashboard,
  Menu,
  Boxes,
  Layers,
  Palette,
  ToggleLeft,
  ToggleRight,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Edit2,
  Save,
  RotateCcw,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Sparkles,
  Smartphone,
  Shield,
  HelpCircle,
  AlertCircle,
  FileSpreadsheet,
  CalendarCheck2,
  IndianRupee,
  Droplets,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  useCustomizationStore,
  CustomizationConfig,
  DEFAULT_CUSTOMIZATION_CONFIG,
} from '../../stores/customizationStore';
import { Card, CardHeader, CardTitle } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { CustomModule, CustomModuleField } from '../../types';
import { FIELD_TYPES } from '../custom-modules/ModuleBuilderPage';
import { AVAILABLE_ICONS, getIconComponent } from '../../utils/iconMap';
import { ModuleTemplateLibrary } from './ModuleTemplateLibrary';

export const CustomizationCenterPage: React.FC = () => {
  const queryClient = useQueryClient();
  const {
    config: storedConfig,
    saveConfig,
    resetToDefaults,
    fetchConfig,
    isSaving,
  } = useCustomizationStore();

  // Local working copy for editing before saving
  const [localConfig, setLocalConfig] = useState<CustomizationConfig>(storedConfig);
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'navigation' | 'modules' | 'templates' | 'widgets' | 'features' | 'appearance'
  >('dashboard');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync on store fetch
  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    setLocalConfig(storedConfig);
  }, [storedConfig]);

  // Query custom modules
  const { data: rawModules } = useQuery<CustomModule[]>({
    queryKey: ['custom-modules'],
    queryFn: async () => {
      try {
        const res = await api.get('/custom-modules');
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });
  const modules = Array.isArray(rawModules) ? rawModules : [];

  // Modal states for Navigation & Custom Links
  const [isAddNavLinkOpen, setIsAddNavLinkOpen] = useState(false);
  const [newNavLabel, setNewNavLabel] = useState('');
  const [newNavPath, setNewNavPath] = useState('');
  const [newNavIcon, setNewNavIcon] = useState('Sparkles');

  // Modal states for Module Builder
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<CustomModule | null>(null);

  const [modName, setModName] = useState('');
  const [modDescription, setModDescription] = useState('');
  const [modIcon, setModIcon] = useState('Boxes');
  const [modColor, setModColor] = useState('emerald');
  const [modShowInSidebar, setModShowInSidebar] = useState(true);
  const [modShowInDashboard, setModShowInDashboard] = useState(true);

  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [fieldPlaceholder, setFieldPlaceholder] = useState('');
  const [fieldIsRequired, setFieldIsRequired] = useState(false);
  const [fieldOptions, setFieldOptions] = useState('');

  // Handle Save
  const handleSaveAll = async () => {
    setSaveError(null);
    const success = await saveConfig(localConfig);
    if (success) {
      setSaveSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-config'] });
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setSaveError('Failed to save customization preferences to server.');
    }
  };

  // Handle Reset Defaults
  const handleReset = async () => {
    if (window.confirm('Reset all customization settings back to default assistant layout?')) {
      await resetToDefaults();
      setLocalConfig(DEFAULT_CUSTOMIZATION_CONFIG);
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-config'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  // 1. DASHBOARD CARD REORDER & TOGGLES
  const moveCard = (index: number, direction: 'up' | 'down') => {
    const order = [...localConfig.dashboard.card_order];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= order.length) return;
    const temp = order[index];
    order[index] = order[targetIdx];
    order[targetIdx] = temp;
    setLocalConfig({
      ...localConfig,
      dashboard: { ...localConfig.dashboard, card_order: order },
    });
  };

  const toggleCardVisibility = (cardId: string) => {
    const visible = localConfig.dashboard.visible_cards.includes(cardId)
      ? localConfig.dashboard.visible_cards.filter((id) => id !== cardId)
      : [...localConfig.dashboard.visible_cards, cardId];
    setLocalConfig({
      ...localConfig,
      dashboard: { ...localConfig.dashboard, visible_cards: visible },
    });
  };

  const setCardSize = (cardId: string, size: 'normal' | 'wide' | 'full') => {
    setLocalConfig({
      ...localConfig,
      dashboard: {
        ...localConfig.dashboard,
        card_sizes: { ...localConfig.dashboard.card_sizes, [cardId]: size },
      },
    });
  };

  // 2. NAVIGATION REORDER & EDIT
  const moveNavItem = (index: number, direction: 'up' | 'down') => {
    const items = [...localConfig.navigation.sidebar_items];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const temp = items[index];
    items[index] = items[targetIdx];
    items[targetIdx] = temp;
    setLocalConfig({
      ...localConfig,
      navigation: { ...localConfig.navigation, sidebar_items: items },
    });
  };

  const toggleNavItem = (id: string) => {
    const items = localConfig.navigation.sidebar_items.map((item) =>
      item.id === id ? { ...item, visible: !item.visible } : item
    );
    setLocalConfig({
      ...localConfig,
      navigation: { ...localConfig.navigation, sidebar_items: items },
    });
  };

  const updateNavLabel = (id: string, label: string) => {
    const items = localConfig.navigation.sidebar_items.map((item) =>
      item.id === id ? { ...item, label } : item
    );
    setLocalConfig({
      ...localConfig,
      navigation: { ...localConfig.navigation, sidebar_items: items },
    });
  };

  const updateNavIcon = (id: string, icon: string) => {
    const items = localConfig.navigation.sidebar_items.map((item) =>
      item.id === id ? { ...item, icon } : item
    );
    setLocalConfig({
      ...localConfig,
      navigation: { ...localConfig.navigation, sidebar_items: items },
    });
  };

  const handleAddCustomLink = () => {
    if (!newNavLabel.trim() || !newNavPath.trim()) return;
    const newItem = {
      id: `custom-${Date.now()}`,
      label: newNavLabel.trim(),
      path: newNavPath.trim(),
      icon: newNavIcon,
      visible: true,
      group: 'more' as const,
      isCustom: true,
    };
    setLocalConfig({
      ...localConfig,
      navigation: {
        ...localConfig.navigation,
        sidebar_items: [...localConfig.navigation.sidebar_items, newItem],
      },
    });
    setNewNavLabel('');
    setNewNavPath('');
    setIsAddNavLinkOpen(false);
  };

  const removeCustomLink = (id: string) => {
    const items = localConfig.navigation.sidebar_items.filter((item) => item.id !== id);
    setLocalConfig({
      ...localConfig,
      navigation: { ...localConfig.navigation, sidebar_items: items },
    });
  };

  // 3. MODULE BUILDER MUTATIONS
  const createModuleMutation = useMutation({
    mutationFn: async () => {
      return api.post('/custom-modules', {
        name: modName,
        description: modDescription || undefined,
        icon: modIcon,
        color: modColor,
        show_in_sidebar: modShowInSidebar,
        show_in_dashboard: modShowInDashboard,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-modules'] });
      setIsModuleModalOpen(false);
      setModName('');
      setModDescription('');
    },
  });

  const addFieldMutation = useMutation({
    mutationFn: async () => {
      if (!selectedModule) return;
      const opts = fieldOptions ? fieldOptions.split(',').map((s) => s.trim()) : undefined;
      return api.post(`/custom-modules/${selectedModule.id}/fields`, {
        field_label: fieldLabel,
        field_type: fieldType,
        placeholder: fieldPlaceholder || undefined,
        is_required: fieldIsRequired,
        options: opts,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-modules'] });
      setIsFieldModalOpen(false);
      setFieldLabel('');
      setFieldPlaceholder('');
      setFieldOptions('');
    },
  });

  const deleteFieldMutation = useMutation({
    mutationFn: async (fieldId: string) => {
      return api.delete(`/custom-modules/fields/${fieldId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-modules'] });
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      return api.delete(`/custom-modules/${moduleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-modules'] });
      setSelectedModule(null);
    },
  });

  // Available dashboard cards
  const allCardIds = [
    { id: 'fitness', title: 'Fitness & Health', icon: 'Flame', color: 'emerald' },
    { id: 'water', title: 'Hydration & Water', icon: 'Droplets', color: 'cyan' },
    { id: 'money', title: 'Money & Salary', icon: 'IndianRupee', color: 'emerald' },
    { id: 'planner', title: 'Daily Planner', icon: 'CalendarCheck2', color: 'blue' },
    { id: 'screentime', title: 'Screen Time', icon: 'Smartphone', color: 'purple' },
    ...modules.map((m) => ({ id: `mod-${m.id}`, title: m.name, icon: m.icon, color: m.color })),
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header & Global Actions */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#121215] to-[#16161c] border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-400">
              Personal OS
            </span>
            <Badge variant="emerald" size="sm">Advanced Customization</Badge>
            <div className="flex items-center gap-1 p-0.5 bg-zinc-900 border border-zinc-800 rounded-lg">
              <button
                type="button"
                onClick={() => setLocalConfig({ ...localConfig, mode: 'simple' })}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                  localConfig.mode === 'simple'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Simple Mode
              </button>
              <button
                type="button"
                onClick={() => setLocalConfig({ ...localConfig, mode: 'advanced' })}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                  localConfig.mode === 'advanced'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Advanced Mode
              </button>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 flex items-center gap-2.5">
            <Sliders className="w-7 h-7 text-emerald-400" />
            Advanced Customization Center
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
            {localConfig.mode === 'simple'
              ? 'Curated presets and clean mobile-first defaults.'
              : 'Full access to all layout, navigation, widget, and module controls.'}
          </p>
        </div>

        {/* Global Save / Reset / Cancel Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Reset Defaults
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setLocalConfig(storedConfig)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            isLoading={isSaving}
            onClick={handleSaveAll}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4" />
          <span>Customization preferences successfully saved and persisted!</span>
        </div>
      )}
      {saveError && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Navigation Tabs (Horizontal scroll on mobile) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-zinc-800/80">
        {[
          { id: 'dashboard', label: 'Dashboard Editor', icon: LayoutDashboard },
          { id: 'navigation', label: 'Sidebar & Nav Editor', icon: Menu },
          { id: 'modules', label: 'Module Builder', icon: Boxes },
          { id: 'templates', label: 'Template Library', icon: Sparkles },
          { id: 'widgets', label: 'Page & Widgets', icon: Layers },
          { id: 'features', label: 'Feature Manager', icon: ToggleRight },
          { id: 'appearance', label: 'Theme & Appearance', icon: Palette },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================
          1. DASHBOARD EDITOR
      ======================================================== */}
      {activeTab === 'dashboard' && (
        <Card className="bg-[#121215] border-zinc-800">
          <CardHeader>
            <CardTitle>
              <LayoutDashboard className="w-4 h-4 text-emerald-400" />
              1. Dashboard Cards & Layout Editor
            </CardTitle>
            <span className="text-xs text-zinc-500">Configure cards, sizes, and metric visibility</span>
          </CardHeader>

          <div className="space-y-4">
            <p className="text-xs text-zinc-400">
              Customize which core pillar cards appear on your dashboard, adjust their display order, and configure card dimensions.
            </p>

            {/* Card Items List */}
            <div className="space-y-3">
              {localConfig.dashboard.card_order.map((cardKey, index) => {
                const cardMeta = allCardIds.find((c) => c.id === cardKey) || {
                  id: cardKey,
                  title: cardKey,
                  icon: 'Boxes',
                  color: 'zinc',
                };
                const isVisible = localConfig.dashboard.visible_cards.includes(cardKey);
                const currentSize = localConfig.dashboard.card_sizes?.[cardKey] || 'normal';
                const IconComponent = getIconComponent(cardMeta.icon);

                return (
                  <div
                    key={cardKey}
                    className={`p-4 rounded-2xl border transition-all ${
                      isVisible
                        ? 'bg-zinc-900/80 border-zinc-700/80'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-500 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isVisible}
                            onChange={() => toggleCardVisibility(cardKey)}
                            className="rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500 w-4 h-4"
                          />
                          <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-emerald-400">
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-sm font-bold text-zinc-100 block">
                              {cardMeta.title}
                            </span>
                            <span className="text-[10px] text-zinc-500">Card ID: {cardKey}</span>
                          </div>
                        </label>
                      </div>

                      {/* Controls: Size & Order */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                          <button
                            type="button"
                            onClick={() => setCardSize(cardKey, 'normal')}
                            className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                              currentSize === 'normal'
                                ? 'bg-zinc-800 text-zinc-100'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            Normal
                          </button>
                          <button
                            type="button"
                            onClick={() => setCardSize(cardKey, 'wide')}
                            className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                              currentSize === 'wide'
                                ? 'bg-zinc-800 text-zinc-100'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            Wide
                          </button>
                          <button
                            type="button"
                            onClick={() => setCardSize(cardKey, 'full')}
                            className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                              currentSize === 'full'
                                ? 'bg-zinc-800 text-zinc-100'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            Full
                          </button>
                        </div>

                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveCard(index, 'up')}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-20"
                          title="Move Up"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={index === localConfig.dashboard.card_order.length - 1}
                          onClick={() => moveCard(index, 'down')}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-20"
                          title="Move Down"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Actions / Shortcuts Manager */}
            <div className="pt-4 border-t border-zinc-800">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                Available Card Pillars
              </h4>
              <div className="flex flex-wrap gap-2">
                {allCardIds
                  .filter((c) => !localConfig.dashboard.card_order.includes(c.id))
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setLocalConfig({
                          ...localConfig,
                          dashboard: {
                            ...localConfig.dashboard,
                            card_order: [...localConfig.dashboard.card_order, c.id],
                            visible_cards: [...localConfig.dashboard.visible_cards, c.id],
                          },
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-emerald-400 flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add {c.title}</span>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ========================================================
          2. SIDEBAR & NAVIGATION EDITOR
      ======================================================== */}
      {activeTab === 'navigation' && (
        <div className="space-y-6">
          <Card className="bg-[#121215] border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>
                  <Menu className="w-4 h-4 text-emerald-400" />
                  2. Sidebar & Navigation Editor
                </CardTitle>
                <p className="text-xs text-zinc-400 mt-1">
                  Rename menu labels, choose icons, reorder items, and configure mobile navigation tabs.
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setIsAddNavLinkOpen(true)}
              >
                + Custom Link
              </Button>
            </CardHeader>

            <div className="space-y-4">
              {/* Bottom Nav Tabs Selector */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider block">
                  Mobile Bottom Navigation Tabs (4 Core Tabs + More)
                </span>
                <p className="text-[11px] text-zinc-400">
                  Select which 4 tabs appear at the bottom on mobile devices:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {localConfig.navigation.sidebar_items.slice(0, 8).map((item) => {
                    const isSelected = localConfig.navigation.bottom_nav_tabs.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          const current = [...localConfig.navigation.bottom_nav_tabs];
                          let nextTabs: string[];
                          if (current.includes(item.id)) {
                            if (current.length <= 2) return;
                            nextTabs = current.filter((id) => id !== item.id);
                          } else {
                            if (current.length >= 4) {
                              nextTabs = [...current.slice(1), item.id];
                            } else {
                              nextTabs = [...current, item.id];
                            }
                          }
                          setLocalConfig({
                            ...localConfig,
                            navigation: {
                              ...localConfig.navigation,
                              bottom_nav_tabs: nextTabs,
                            },
                          });
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sidebar Items Reorder & Renaming */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Sidebar & Menu Structure
                </h4>
                {localConfig.navigation.sidebar_items.map((item, index) => {
                  const IconComp = getIconComponent(item.icon);
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        item.visible
                          ? 'bg-zinc-900/80 border-zinc-800'
                          : 'bg-zinc-950/60 border-zinc-800/80 opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleNavItem(item.id)}
                          className="text-zinc-400 hover:text-emerald-400"
                          title={item.visible ? 'Hide from navigation' : 'Show in navigation'}
                        >
                          {item.visible ? (
                            <Eye className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-zinc-600" />
                          )}
                        </button>

                        <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-emerald-400 shrink-0">
                          <IconComp className="w-4 h-4" />
                        </div>

                        {/* Editable label */}
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => updateNavLabel(item.id, e.target.value)}
                          className="bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1 text-xs text-zinc-100 font-semibold focus:outline-none focus:border-emerald-500 w-44 sm:w-56"
                        />

                        <span className="text-[10px] text-zinc-500 font-mono truncate hidden md:inline">
                          {item.path}
                        </span>
                      </div>

                      {/* Icon selector & Move controls */}
                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <select
                          value={item.icon}
                          onChange={(e) => updateNavIcon(item.id, e.target.value)}
                          className="px-2 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-300"
                        >
                          {AVAILABLE_ICONS.map((iconKey) => (
                            <option key={iconKey} value={iconKey}>
                              {iconKey}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveNavItem(index, 'up')}
                          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-20"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === localConfig.navigation.sidebar_items.length - 1}
                          onClick={() => moveNavItem(index, 'down')}
                          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-20"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        {item.isCustom && (
                          <button
                            type="button"
                            onClick={() => removeCustomLink(item.id)}
                            className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"
                            title="Remove link"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Live Preview Box */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-2 mt-4">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">
                  Live Bottom Navigation Preview (Mobile View)
                </span>
                <div className="flex items-center justify-around h-12 bg-[#0e0e11] border border-zinc-800 rounded-2xl px-2">
                  {localConfig.navigation.bottom_nav_tabs.map((tabId) => {
                    const item = localConfig.navigation.sidebar_items.find((i) => i.id === tabId);
                    if (!item) return null;
                    const IconComp = getIconComponent(item.icon);
                    return (
                      <div key={item.id} className="flex flex-col items-center text-[10px] text-emerald-400">
                        <IconComp className="w-4 h-4 mb-0.5" />
                        <span className="truncate max-w-[60px]">{item.label}</span>
                      </div>
                    );
                  })}
                  <div className="flex flex-col items-center text-[10px] text-zinc-400">
                    <Menu className="w-4 h-4 mb-0.5" />
                    <span>More</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================
          3. MODULE BUILDER
      ======================================================== */}
      {activeTab === 'modules' && (
        <div className="space-y-6">
          <Card className="bg-[#121215] border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>
                  <Boxes className="w-4 h-4 text-emerald-400" />
                  3. Dynamic Custom Module Builder
                </CardTitle>
                <p className="text-xs text-zinc-400 mt-1">
                  Create unlimited custom tracking modules with 15 dynamic field types and zero migrations.
                </p>
              </div>
              <Button
                size="sm"
                variant="primary"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setIsModuleModalOpen(true)}
              >
                + Create New Module
              </Button>
            </CardHeader>

            <div className="space-y-4">
              {modules.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {modules.map((mod) => (
                    <div
                      key={mod.id}
                      className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-zinc-100">{mod.name}</h4>
                            <p className="text-[11px] text-zinc-500">
                              {mod.records_count} records logged • {mod.fields?.length || 0} fields
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Link to={`/modules/${mod.slug}`}>
                            <Button size="sm" variant="ghost" className="text-emerald-400 text-xs px-2">
                              View Data <ExternalLink className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete custom module "${mod.name}"?`)) {
                                deleteModuleMutation.mutate(mod.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400"
                            title="Delete module"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Fields preview & Add Field trigger */}
                      <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] text-zinc-400">
                          Fields: {mod.fields?.map((f) => f.field_label).join(', ') || 'No fields yet'}
                        </span>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs py-1 h-7"
                          leftIcon={<Plus className="w-3 h-3" />}
                          onClick={() => {
                            setSelectedModule(mod);
                            setIsFieldModalOpen(true);
                          }}
                        >
                          Add Field
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800/80 space-y-3">
                  <Boxes className="w-10 h-10 text-zinc-600 mx-auto" />
                  <p className="text-xs text-zinc-400">No custom modules created yet.</p>
                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setIsModuleModalOpen(true)}
                  >
                    Create Your First Module
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================
          TEMPLATE LIBRARY
      ======================================================== */}
      {activeTab === 'templates' && (
        <div className="space-y-6 animate-fadeIn">
          <ModuleTemplateLibrary
            onModuleCreated={() => {
              setActiveTab('modules');
              queryClient.invalidateQueries({ queryKey: ['custom-modules'] });
            }}
          />
        </div>
      )}

      {/* ========================================================
          4. PAGE & WIDGET EDITOR
      ======================================================== */}
      {activeTab === 'widgets' && (
        <Card className="bg-[#121215] border-zinc-800">
          <CardHeader>
            <CardTitle>
              <Layers className="w-4 h-4 text-emerald-400" />
              4. Page & Widget Editor
            </CardTitle>
            <span className="text-xs text-zinc-500">Page Sections & Widget Visibility</span>
          </CardHeader>

          <div className="space-y-4">
            <p className="text-xs text-zinc-400">
              Toggle specific assistant components on your home screen to adjust density and focus:
            </p>

            <div className="space-y-3">
              {[
                {
                  key: 'show_greeting',
                  label: 'Greeting & Daily Overview',
                  desc: 'Displays the time-of-day greeting (Good Morning / Afternoon / Evening) and user name.',
                },
                {
                  key: 'show_core_pillars',
                  label: "Today's Core Pillars (Cards)",
                  desc: 'Displays the 2×2 rectangular cards for Fitness, Water, Money, and Planner.',
                },
                {
                  key: 'show_progress_checklist',
                  label: "Today's Progress Checklist",
                  desc: 'Displays daily progress indicators for hydration, protein, and scheduled tasks.',
                },
                {
                  key: 'show_hydration_bar',
                  label: '1-Tap Hydration Bar',
                  desc: 'Enables one-tap buttons (+100ml, +250ml, +500ml) right on the home screen.',
                },
                {
                  key: 'show_quick_add_button',
                  label: 'Quick Add Floating / Header Button',
                  desc: 'Provides fast access to the 1-click logging modal from anywhere on home.',
                },
              ].map((w) => {
                const isEnabled = (localConfig.widgets as any)?.[w.key] ?? true;
                return (
                  <div
                    key={w.key}
                    className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-zinc-100">{w.label}</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{w.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => {
                          setLocalConfig({
                            ...localConfig,
                            widgets: { ...localConfig.widgets, [w.key]: e.target.checked },
                          });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* ========================================================
          5. FEATURE MANAGER
      ======================================================== */}
      {activeTab === 'features' && (
        <Card className="bg-[#121215] border-zinc-800">
          <CardHeader>
            <CardTitle>
              <ToggleRight className="w-4 h-4 text-emerald-400" />
              5. Feature Manager
            </CardTitle>
            <span className="text-xs text-zinc-500">Application Feature Manager</span>
          </CardHeader>

          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5">
              <Shield className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                <strong>Data Safety Guarantee:</strong> Disabling a feature hides it from daily views and navigation. All existing database records, transactions, workouts, and logs are permanently preserved.
              </span>
            </div>

            <div className="space-y-3">
              {[
                { key: 'fitness', label: 'Fitness & Health Tracking', icon: Flame, desc: 'Food logging, workouts, body weight, and running/football.' },
                { key: 'water', label: 'Water & Hydration Tracker', icon: Droplets, desc: 'Daily target, quick hydration buttons, and intake analytics.' },
                { key: 'finance', label: 'Money & Salary Tracking', icon: IndianRupee, desc: 'Income, expenses, budgets, savings goals, and INR (₹) analytics.' },
                { key: 'planner', label: 'Daily & Weekly Planner', icon: CalendarCheck2, desc: 'Daily to-do tasks and schedule management.' },
                { key: 'screentime', label: 'Mobile Screen Time Tracker', icon: Smartphone, desc: 'Digital wellbeing, daily limit alerts, and screenshot imports.' },
                { key: 'reports', label: 'Reports & Data Export', icon: FileSpreadsheet, desc: 'PDF, CSV, and Excel export reports.' },
                { key: 'ai_assistant', label: 'AI Personal Assistant', icon: Sparkles, desc: 'Natural language fitness and lifestyle query assistant.' },
                { key: 'custom_modules', label: 'Dynamic Custom Modules', icon: Boxes, desc: 'Metadata-driven custom tracking modules and tables.' },
              ].map((feat) => {
                const Icon = feat.icon;
                const isEnabled = (localConfig.features as any)?.[feat.key] ?? true;
                return (
                  <div
                    key={feat.key}
                    className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-emerald-400 shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-zinc-100">{feat.label}</h4>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{feat.desc}</p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => {
                          setLocalConfig({
                            ...localConfig,
                            features: { ...localConfig.features, [feat.key]: e.target.checked },
                          });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* ========================================================
          6. THEME & APPEARANCE EDITOR
      ======================================================== */}
      {activeTab === 'appearance' && (
        <Card className="bg-[#121215] border-zinc-800">
          <CardHeader>
            <CardTitle>
              <Palette className="w-4 h-4 text-emerald-400" />
              6. Theme & Visual Appearance Editor
            </CardTitle>
            <span className="text-xs text-zinc-500">Theme & Visual Styling</span>
          </CardHeader>

          <div className="space-y-6">
            {/* Theme Variant */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                Dark Theme Variant
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'oled', label: 'OLED Charcoal', desc: 'True dark #09090b with maximum OLED battery savings' },
                  { id: 'midnight', label: 'Midnight Slate', desc: 'Subtle slate and deep navy hues' },
                  { id: 'charcoal', label: 'Minimal Graphite', desc: 'Monochrome neutral dark tones' },
                ].map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() =>
                      setLocalConfig({
                        ...localConfig,
                        appearance: { ...localConfig.appearance, theme: th.id as any },
                      })
                    }
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      localConfig.appearance.theme === th.id
                        ? 'bg-zinc-900 border-emerald-500 text-emerald-400 ring-1 ring-emerald-500'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-900'
                    }`}
                  >
                    <span className="text-xs font-bold block">{th.label}</span>
                    <span className="text-[10px] text-zinc-500 block mt-1">{th.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Color */}
            <div className="pt-3 border-t border-zinc-800/80">
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                Primary Accent Color
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {[
                  { id: 'emerald', label: 'Emerald', hex: '#10b981' },
                  { id: 'cyan', label: 'Cyan', hex: '#06b6d4' },
                  { id: 'purple', label: 'Violet', hex: '#8b5cf6' },
                  { id: 'amber', label: 'Amber', hex: '#f59e0b' },
                  { id: 'rose', label: 'Rose', hex: '#f43f5e' },
                  { id: 'blue', label: 'Blue', hex: '#3b82f6' },
                ].map((col) => (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() =>
                      setLocalConfig({
                        ...localConfig,
                        appearance: { ...localConfig.appearance, accent_color: col.id as any },
                      })
                    }
                    className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all ${
                      localConfig.appearance.accent_color === col.id
                        ? 'bg-zinc-900 border-white text-zinc-100'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:bg-zinc-900'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: col.hex }}
                    />
                    <span className="text-xs font-bold truncate">{col.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* UI Density */}
            <div className="pt-3 border-t border-zinc-800/80">
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                UI Density & Touch Targets
              </label>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() =>
                    setLocalConfig({
                      ...localConfig,
                      appearance: { ...localConfig.appearance, density: 'comfortable' },
                    })
                  }
                  className={`p-3 rounded-2xl border text-center text-xs font-bold transition-all ${
                    localConfig.appearance.density === 'comfortable'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                  }`}
                >
                  Comfortable (Touch-friendly ≥ 44px)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setLocalConfig({
                      ...localConfig,
                      appearance: { ...localConfig.appearance, density: 'compact' },
                    })
                  }
                  className={`p-3 rounded-2xl border text-center text-xs font-bold transition-all ${
                    localConfig.appearance.density === 'compact'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                  }`}
                >
                  Compact
                </button>
              </div>
            </div>

            {/* Live Interactive Preview Card */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-3">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">
                Live Theme Preview
              </span>
              <div className="p-4 rounded-2xl bg-[#121215] border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-zinc-100">FITPULSE AI Assistant</h5>
                    <p className="text-xs text-zinc-400">
                      Theme: {localConfig.appearance.theme} • Accent: {localConfig.appearance.accent_color}
                    </p>
                  </div>
                </div>
                <Badge variant="emerald" size="sm">Active Preview</Badge>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ========================================================
          MODALS
      ======================================================== */}
      {/* 1. Add Custom Nav Link Modal */}
      <Modal
        isOpen={isAddNavLinkOpen}
        onClose={() => setIsAddNavLinkOpen(false)}
        title="Add Custom Navigation Item"
        description="Add a new page or shortcut link to your navigation"
      >
        <div className="space-y-4">
          <Input
            label="Menu Label"
            placeholder="e.g. Reading Tracker, Gym Routine"
            value={newNavLabel}
            onChange={(e) => setNewNavLabel(e.target.value)}
            required
          />
          <Input
            label="Destination Path / URL"
            placeholder="e.g. /modules/reading-list, /planner"
            value={newNavPath}
            onChange={(e) => setNewNavPath(e.target.value)}
            required
          />
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Icon</label>
            <select
              value={newNavIcon}
              onChange={(e) => setNewNavIcon(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-100"
            >
              {AVAILABLE_ICONS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddNavLinkOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleAddCustomLink}>
              Add Link
            </Button>
          </div>
        </div>
      </Modal>

      {/* 2. Create Module Modal */}
      <Modal
        isOpen={isModuleModalOpen}
        onClose={() => setIsModuleModalOpen(false)}
        title="Create Custom Module"
        description="Add a brand-new generic tracking module with zero database migrations"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createModuleMutation.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="Module Name"
            placeholder="e.g. Sleep Tracker, Books Read"
            value={modName}
            onChange={(e) => setModName(e.target.value)}
            required
          />
          <Input
            label="Description"
            placeholder="e.g. Personal log for daily sleep quality"
            value={modDescription}
            onChange={(e) => setModDescription(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Icon</label>
              <select
                value={modIcon}
                onChange={(e) => setModIcon(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-100"
              >
                {AVAILABLE_ICONS.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Color</label>
              <select
                value={modColor}
                onChange={(e) => setModColor(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-100"
              >
                <option value="emerald">Emerald</option>
                <option value="cyan">Cyan</option>
                <option value="blue">Blue</option>
                <option value="purple">Purple</option>
                <option value="amber">Amber</option>
                <option value="rose">Rose</option>
              </select>
            </div>
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

      {/* 3. Add Field Modal */}
      <Modal
        isOpen={isFieldModalOpen}
        onClose={() => setIsFieldModalOpen(false)}
        title={`Add Field to ${selectedModule?.name || 'Module'}`}
        description="Choose from 15 supported dynamic field types"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addFieldMutation.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="Field Label"
            placeholder="e.g. Sleep Hours, Book Author"
            value={fieldLabel}
            onChange={(e) => setFieldLabel(e.target.value)}
            required
          />
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Field Type</label>
            <select
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-100"
            >
              {FIELD_TYPES.map((ft) => (
                <option key={ft.value} value={ft.value}>
                  {ft.label} ({ft.value})
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Placeholder (Optional)"
            placeholder="e.g. Enter duration..."
            value={fieldPlaceholder}
            onChange={(e) => setFieldPlaceholder(e.target.value)}
          />
          {(fieldType === 'dropdown' || fieldType === 'multi_select') && (
            <Input
              label="Options (Comma-separated)"
              placeholder="e.g. Good, Average, Poor"
              value={fieldOptions}
              onChange={(e) => setFieldOptions(e.target.value)}
              required
            />
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={fieldIsRequired}
              onChange={(e) => setFieldIsRequired(e.target.checked)}
              className="rounded border-zinc-700 text-emerald-500"
            />
            <span className="text-xs text-zinc-300">Required field</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsFieldModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={addFieldMutation.isPending}>
              Add Field
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default CustomizationCenterPage;
