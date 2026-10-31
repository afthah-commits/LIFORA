import { create } from 'zustand';
import { api } from '../services/api';

export interface NavigationItemConfig {
  id: string;
  label: string;
  path: string;
  icon: string;
  visible: boolean;
  group: 'primary' | 'more' | 'custom';
  isCustom?: boolean;
}

export interface CustomWidgetConfig {
  id: string;
  title: string;
  type: 'module' | 'shortcut' | 'metric';
  target: string;
  icon: string;
  color: string;
}

export interface CustomizationConfig {
  mode: 'simple' | 'advanced';
  dashboard: {
    visible_cards: string[];
    card_order: string[];
    card_sizes: Record<string, 'normal' | 'wide' | 'full'>;
    card_metrics: Record<string, string[]>;
    custom_widgets: CustomWidgetConfig[];
  };
  navigation: {
    sidebar_items: NavigationItemConfig[];
    bottom_nav_tabs: string[]; // 4 item IDs before 'more'
  };
  features: {
    fitness: boolean;
    water: boolean;
    finance: boolean;
    planner: boolean;
    screentime: boolean;
    reports: boolean;
    ai_assistant: boolean;
    custom_modules: boolean;
  };
  widgets: {
    show_greeting: boolean;
    show_core_pillars: boolean;
    show_progress_checklist: boolean;
    show_hydration_bar: boolean;
    show_quick_add_button: boolean;
  };
  appearance: {
    theme: 'oled' | 'midnight' | 'charcoal';
    accent_color: 'emerald' | 'cyan' | 'purple' | 'amber' | 'rose' | 'blue';
    density: 'comfortable' | 'compact';
  };
}

export const DEFAULT_SIDEBAR_ITEMS: NavigationItemConfig[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: 'LayoutDashboard', visible: true, group: 'primary' },
  { id: 'fitness', label: 'Fitness & Health', path: '/fitness', icon: 'Flame', visible: true, group: 'primary' },
  { id: 'water', label: 'Water Tracker', path: '/water', icon: 'Droplets', visible: true, group: 'primary' },
  { id: 'finance', label: 'Money & Salary', path: '/finance', icon: 'IndianRupee', visible: true, group: 'primary' },
  { id: 'planner', label: 'Daily Planner', path: '/planner', icon: 'CalendarCheck2', visible: true, group: 'primary' },
  { id: 'screentime', label: 'Screen Time', path: '/screen-time', icon: 'Smartphone', visible: true, group: 'more' },
  { id: 'reports', label: 'Reports & Export', path: '/reports', icon: 'FileSpreadsheet', visible: true, group: 'more' },
  { id: 'ai_assistant', label: 'AI Assistant', path: '/ai-assistant', icon: 'BotMessageSquare', visible: true, group: 'more' },
  { id: 'customization', label: 'Customize App', path: '/customization', icon: 'Sliders', visible: true, group: 'more' },
  { id: 'settings', label: 'Settings & Profile', path: '/settings', icon: 'Settings', visible: true, group: 'more' },
];

export const DEFAULT_BOTTOM_NAV_TABS = ['dashboard', 'fitness', 'water', 'finance'];

export const DEFAULT_CUSTOMIZATION_CONFIG: CustomizationConfig = {
  mode: 'simple',
  dashboard: {
    visible_cards: ['fitness', 'water', 'money', 'planner'],
    card_order: ['fitness', 'water', 'money', 'planner'],
    card_sizes: {
      fitness: 'normal',
      water: 'normal',
      money: 'normal',
      planner: 'normal',
      screentime: 'normal',
    },
    card_metrics: {
      fitness: ['calories', 'protein'],
      water: ['consumed', 'remaining'],
      money: ['savings', 'spent'],
      planner: ['tasks_ratio', 'status'],
      screentime: ['duration', 'top_app'],
    },
    custom_widgets: [],
  },
  navigation: {
    sidebar_items: DEFAULT_SIDEBAR_ITEMS,
    bottom_nav_tabs: DEFAULT_BOTTOM_NAV_TABS,
  },
  features: {
    fitness: true,
    water: true,
    finance: true,
    planner: true,
    screentime: true,
    reports: true,
    ai_assistant: true,
    custom_modules: true,
  },
  widgets: {
    show_greeting: true,
    show_core_pillars: true,
    show_progress_checklist: true,
    show_hydration_bar: true,
    show_quick_add_button: true,
  },
  appearance: {
    theme: 'oled',
    accent_color: 'emerald',
    density: 'comfortable',
  },
};

const STORAGE_KEY = 'fitpulse_customization_config';

const loadInitialConfig = (): CustomizationConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_CUSTOMIZATION_CONFIG,
        ...parsed,
        dashboard: { ...DEFAULT_CUSTOMIZATION_CONFIG.dashboard, ...parsed.dashboard },
        navigation: {
          sidebar_items: parsed.navigation?.sidebar_items || DEFAULT_SIDEBAR_ITEMS,
          bottom_nav_tabs: parsed.navigation?.bottom_nav_tabs || DEFAULT_BOTTOM_NAV_TABS,
        },
        features: { ...DEFAULT_CUSTOMIZATION_CONFIG.features, ...parsed.features },
        widgets: { ...DEFAULT_CUSTOMIZATION_CONFIG.widgets, ...parsed.widgets },
        appearance: { ...DEFAULT_CUSTOMIZATION_CONFIG.appearance, ...parsed.appearance },
      };
    }
  } catch (err) {
    console.error('Failed to parse cached customization config:', err);
  }
  return DEFAULT_CUSTOMIZATION_CONFIG;
};

interface CustomizationState {
  config: CustomizationConfig;
  isLoading: boolean;
  isSaving: boolean;
  fetchConfig: () => Promise<void>;
  saveConfig: (newConfig: CustomizationConfig) => Promise<boolean>;
  resetToDefaults: () => Promise<boolean>;
  setMode: (mode: 'simple' | 'advanced') => void;
  isFeatureEnabled: (feature: keyof CustomizationConfig['features']) => boolean;
}

export const useCustomizationStore = create<CustomizationState>((set, get) => ({
  config: loadInitialConfig(),
  isLoading: false,
  isSaving: false,

  fetchConfig: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/dashboard/config');
      if (res.data?.layout_config && Object.keys(res.data.layout_config).length > 0) {
        const remote = res.data.layout_config;
        const merged: CustomizationConfig = {
          ...DEFAULT_CUSTOMIZATION_CONFIG,
          ...remote,
          dashboard: {
            ...DEFAULT_CUSTOMIZATION_CONFIG.dashboard,
            ...remote.dashboard,
            visible_cards: remote.dashboard?.visible_cards || remote.visible_cards || DEFAULT_CUSTOMIZATION_CONFIG.dashboard.visible_cards,
            card_order: remote.dashboard?.card_order || remote.card_order || DEFAULT_CUSTOMIZATION_CONFIG.dashboard.card_order,
          },
          navigation: {
            sidebar_items: remote.navigation?.sidebar_items || DEFAULT_SIDEBAR_ITEMS,
            bottom_nav_tabs: remote.navigation?.bottom_nav_tabs || DEFAULT_BOTTOM_NAV_TABS,
          },
          features: { ...DEFAULT_CUSTOMIZATION_CONFIG.features, ...remote.features },
          widgets: { ...DEFAULT_CUSTOMIZATION_CONFIG.widgets, ...remote.widgets },
          appearance: { ...DEFAULT_CUSTOMIZATION_CONFIG.appearance, ...remote.appearance },
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        set({ config: merged, isLoading: false });
        return;
      }
    } catch (err) {
      console.warn('Could not fetch server dashboard config, using local cache:', err);
    }
    set({ isLoading: false });
  },

  saveConfig: async (newConfig: CustomizationConfig) => {
    set({ isSaving: true });
    try {
      // 1. Optimistic local cache update
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
      set({ config: newConfig });

      // 2. Persist to PostgreSQL backend via /dashboard/config
      await api.put('/dashboard/config', {
        layout_config: newConfig,
      });

      set({ isSaving: false });
      return true;
    } catch (err) {
      console.error('Failed to persist customization config to server:', err);
      set({ isSaving: false });
      return false;
    }
  },

  resetToDefaults: async () => {
    set({ isSaving: true });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CUSTOMIZATION_CONFIG));
      set({ config: DEFAULT_CUSTOMIZATION_CONFIG });

      await api.put('/dashboard/config', {
        layout_config: DEFAULT_CUSTOMIZATION_CONFIG,
      });

      set({ isSaving: false });
      return true;
    } catch (err) {
      console.error('Failed to reset customization config on server:', err);
      set({ isSaving: false });
      return false;
    }
  },

  setMode: (mode: 'simple' | 'advanced') => {
    const updated: CustomizationConfig = { ...get().config, mode };
    get().saveConfig(updated);
  },

  isFeatureEnabled: (feature: keyof CustomizationConfig['features']) => {
    const features = get().config?.features;
    if (!features) return true;
    return features[feature] !== false;
  },
}));
