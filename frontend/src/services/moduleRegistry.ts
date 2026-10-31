import { api } from './api';
import { CustomModule, CustomModuleField } from '../types';

export interface SystemModuleDefinition {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  route: string;
  is_system: true;
  show_in_sidebar: boolean;
  show_in_dashboard: boolean;
}

export const SYSTEM_MODULES: SystemModuleDefinition[] = [
  {
    id: 'fitness',
    name: 'Fitness & Nutrition',
    slug: 'nutrition',
    description: 'Track daily food, calories, protein, and workouts',
    icon: 'Flame',
    color: 'emerald',
    route: '/nutrition',
    is_system: true,
    show_in_sidebar: true,
    show_in_dashboard: true,
  },
  {
    id: 'screentime',
    name: 'Screen Time',
    slug: 'screen-time',
    description: 'Monitor daily mobile usage and app limits',
    icon: 'Smartphone',
    color: 'purple',
    route: '/screen-time',
    is_system: true,
    show_in_sidebar: true,
    show_in_dashboard: true,
  },
  {
    id: 'money',
    name: 'Money & Salary',
    slug: 'finance',
    description: 'Personal finance, expenses, and salary in ₹',
    icon: 'IndianRupee',
    color: 'emerald',
    route: '/finance',
    is_system: true,
    show_in_sidebar: true,
    show_in_dashboard: true,
  },
  {
    id: 'planner',
    name: 'Daily Planner',
    slug: 'planner',
    description: 'Organize schedule, tasks, and weekly fitness plan',
    icon: 'CalendarCheck2',
    color: 'blue',
    route: '/planner',
    is_system: true,
    show_in_sidebar: true,
    show_in_dashboard: true,
  },
  {
    id: 'water',
    name: 'Water Tracker',
    slug: 'water',
    description: 'Quick hydration logging and daily water targets',
    icon: 'Droplets',
    color: 'cyan',
    route: '/water',
    is_system: true,
    show_in_sidebar: true,
    show_in_dashboard: true,
  },
];

class ModuleRegistry {
  private dynamicModules: CustomModule[] = [];
  private lastFetched: number = 0;
  private cacheTtlMs: number = 60 * 1000; // 1 minute

  async fetchCustomModules(force = false): Promise<CustomModule[]> {
    const now = Date.now();
    if (!force && this.dynamicModules.length > 0 && now - this.lastFetched < this.cacheTtlMs) {
      return this.dynamicModules;
    }
    try {
      const res = await api.get('/custom-modules');
      this.dynamicModules = res.data || [];
      this.lastFetched = now;
      return this.dynamicModules;
    } catch {
      return this.dynamicModules;
    }
  }

  getSystemModules(): SystemModuleDefinition[] {
    return SYSTEM_MODULES;
  }

  async getAllModules(): Promise<{ system: SystemModuleDefinition[]; dynamic: CustomModule[] }> {
    const dynamic = await this.fetchCustomModules();
    return {
      system: SYSTEM_MODULES,
      dynamic,
    };
  }

  async getSidebarNavigation() {
    const dynamic = await this.fetchCustomModules();
    const systemLinks = SYSTEM_MODULES.filter((m) => m.show_in_sidebar).map((m) => ({
      name: m.name,
      to: m.route,
      icon: m.icon,
      is_custom: false,
    }));

    const dynamicLinks = dynamic
      .filter((m) => m.show_in_sidebar && m.is_active)
      .map((m) => ({
        name: m.name,
        to: `/modules/${m.slug}`,
        icon: m.icon || 'Boxes',
        is_custom: true,
      }));

    return [...systemLinks, ...dynamicLinks];
  }

  validateFieldValue(field: CustomModuleField, value: any): { valid: boolean; error?: string } {
    if (field.is_required && (value === undefined || value === null || value === '')) {
      return { valid: false, error: `${field.field_label} is required.` };
    }

    if (value === undefined || value === null || value === '') {
      return { valid: true };
    }

    switch (field.field_type) {
      case 'number': {
        const n = Number(value);
        if (isNaN(n) || !Number.isInteger(n)) {
          return { valid: false, error: `${field.field_label} must be a whole number.` };
        }
        break;
      }
      case 'decimal':
      case 'currency':
      case 'percentage': {
        const n = Number(value);
        if (isNaN(n)) {
          return { valid: false, error: `${field.field_label} must be a valid number.` };
        }
        break;
      }
      case 'email': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(value))) {
          return { valid: false, error: `Invalid email address.` };
        }
        break;
      }
      case 'url': {
        try {
          new URL(String(value));
        } catch {
          return { valid: false, error: `Invalid website URL (e.g. https://example.com).` };
        }
        break;
      }
      case 'rating': {
        const r = Number(value);
        if (isNaN(r) || r < 1 || r > 5) {
          return { valid: false, error: `Rating must be between 1 and 5.` };
        }
        break;
      }
    }

    return { valid: true };
  }
}

export const moduleRegistry = new ModuleRegistry();
