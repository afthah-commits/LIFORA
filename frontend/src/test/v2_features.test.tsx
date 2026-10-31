import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FIELD_TYPES, ModuleBuilderPage } from '../features/custom-modules/ModuleBuilderPage';
import { ScreenTimePage } from '../features/screentime/ScreenTimePage';
import { FinancePage } from '../features/finance/FinancePage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { FitnessPage } from '../features/fitness/FitnessPage';
import { OnboardingModal } from '../features/onboarding/OnboardingModal';

// Mock API
vi.mock('../services/api', () => ({
  api: {
    get: vi.fn((url: string) => {
      if (url.includes('/screen-time/imports')) {
        return Promise.resolve({
          data: [
            {
              id: 'imp-1',
              import_date: '2026-10-31',
              target_date: '2026-10-31',
              image_url: '/api/v1/screen-time/images/test.jpg',
              status: 'confirmed',
              app_count: 3,
              total_duration_minutes: 180,
              created_at: '2026-10-31T10:00:00Z',
            },
          ],
        });
      }
      if (url.includes('/screen-time/goal')) {
        return Promise.resolve({ data: { daily_target_minutes: 240 } });
      }
      if (url.includes('/screen-time/daily')) {
        return Promise.resolve({
          data: {
            date: '2026-10-31',
            total_duration_minutes: 90,
            daily_target_minutes: 240,
            remaining_allowed_minutes: 150,
            is_over_limit: false,
            most_used_app: {
              app_name: 'YouTube',
              category: 'Entertainment',
              duration_minutes: 60,
              percentage_of_total: 66.7,
            },
            category_breakdown: { Entertainment: 60, Communication: 30 },
            sessions: [],
          },
        });
      }
      if (url.includes('/screen-time/weekly')) {
        return Promise.resolve({
          data: {
            start_date: '2026-10-25',
            end_date: '2026-10-31',
            daily_average_minutes: 110,
            total_minutes: 770,
            daily_target_minutes: 240,
            top_apps: [
              { app_name: 'YouTube', category: 'Entertainment', duration_minutes: 300, percentage_of_total: 39 },
              { app_name: 'WhatsApp', category: 'Communication', duration_minutes: 200, percentage_of_total: 26 },
            ],
            category_breakdown: { Entertainment: 300, Communication: 200 },
          },
        });
      }
      if (url.includes('/finance/overview')) {
        return Promise.resolve({
          data: {
            month: 10,
            year: 2026,
            currency: '₹',
            total_income: 85000,
            total_expenses: 25000,
            net_savings: 60000,
            latest_salary: {
              employer: 'Tech Corp',
              net_salary: 85000,
              salary_date: '2026-10-01',
            },
            savings_goals: [],
            category_breakdown: [],
            recent_transactions: [],
            budget_overview: [],
          },
        });
      }
      if (url.includes('/finance/categories')) {
        return Promise.resolve({
          data: [
            { id: '1', name: 'Food', is_default: true },
            { id: '2', name: 'Travel', is_default: true },
          ],
        });
      }
      if (url.includes('/custom-modules')) {
        return Promise.resolve({
          data: [
            {
              id: 'mod-1',
              name: 'Reading List',
              slug: 'reading-list',
              description: 'Books tracker',
              icon: 'Book',
              color: 'emerald',
              show_in_sidebar: true,
              show_in_dashboard: true,
              is_active: true,
              records_count: 5,
            },
          ],
        });
      }
      if (url.includes('/nutrition/daily-summary')) {
        return Promise.resolve({
          data: {
            date: '2026-10-31',
            total_calories: 1250,
            total_protein_g: 45,
            total_carbs_g: 150,
            total_fat_g: 40,
            entries: [],
          },
        });
      }
      if (url.includes('/water/daily')) {
        return Promise.resolve({
          data: {
            date: '2026-10-31',
            total_consumed_ml: 1250,
            daily_target_ml: 2500,
            remaining_ml: 1250,
            progress_percentage: 50.0,
            entries_count: 2,
            entries: [],
          },
        });
      }
      if (url.includes('/planner')) {
        return Promise.resolve({
          data: {
            id: 'plan-1',
            week_start_date: '2026-10-26',
            items: [
              {
                id: 'item-1',
                scheduled_date: new Date().toISOString().split('T')[0],
                activity_type: 'custom',
                custom_title: 'Morning Yoga',
                is_completed: true,
              },
            ],
          },
        });
      }
      if (url.includes('/weight/summary')) {
        return Promise.resolve({
          data: {
            current_weight_kg: 53.0,
            initial_weight_kg: 53.0,
            target_weight_kg: 60.0,
            weight_change_kg: 0.0,
            history_count: 5,
          },
        });
      }
      if (url.includes('/activities/running/summary')) {
        return Promise.resolve({ data: { total_runs: 4, total_distance_km: 20 } });
      }
      if (url.includes('/activities/football/summary')) {
        return Promise.resolve({ data: { total_matches: 2, total_goals: 3 } });
      }
      if (url.includes('/workouts')) {
        return Promise.resolve({
          data: [
            {
              id: 'w-1',
              name: 'Upper Body Strength',
              type: 'Strength',
              date: '2026-10-31',
              duration_minutes: 45,
              exercises: [],
            },
          ],
        });
      }
      return Promise.resolve({ data: {} });
    }),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('V2 Life Management Features', () => {
  it('verifies 15 supported dynamic field types in Module Builder', () => {
    expect(FIELD_TYPES.length).toBe(15);
    const fieldValues = FIELD_TYPES.map((f) => f.value);
    expect(fieldValues).toContain('text');
    expect(fieldValues).toContain('long_text');
    expect(fieldValues).toContain('number');
    expect(fieldValues).toContain('decimal');
    expect(fieldValues).toContain('currency');
    expect(fieldValues).toContain('date');
    expect(fieldValues).toContain('datetime');
    expect(fieldValues).toContain('time');
    expect(fieldValues).toContain('boolean');
    expect(fieldValues).toContain('dropdown');
    expect(fieldValues).toContain('multi_select');
    expect(fieldValues).toContain('email');
    expect(fieldValues).toContain('url');
    expect(fieldValues).toContain('rating');
    expect(fieldValues).toContain('percentage');
  });

  it('renders ModuleBuilderPage with header and action buttons', async () => {
    renderWithProviders(<ModuleBuilderPage />);
    expect(screen.getByText(/Dynamic Module Builder/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create custom module/i })
    ).toBeInTheDocument();
  });

  it('renders ScreenTimePage with overview stats, daily limit button, and screenshot import', async () => {
    renderWithProviders(<ScreenTimePage />);
    expect(screen.getByText(/Screen Time Tracker/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Digital Wellbeing/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /manual entry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /import screenshot/i })).toBeInTheDocument();
    expect(await screen.findByText(/Screenshot Import History/i)).toBeInTheDocument();
  });

  it('renders FinancePage with INR (₹) badge and financial tabs', async () => {
    renderWithProviders(<FinancePage />);
    expect(screen.getByText(/Money & Salary Tracker/i)).toBeInTheDocument();
    expect(screen.getByText(/INR \(₹\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Monthly Income/i)).toBeInTheDocument();
    expect(screen.getByText(/Monthly Expenses/i)).toBeInTheDocument();
  });

  it('renders DashboardPage with greeting, the 4 primary pillar cards, progress, and quick add', async () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText(/LIFORA Operating System/i)).toBeInTheDocument();
    expect(screen.getByText(/Today's Core Pillars/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /quick add/i })).toBeInTheDocument();
    expect(screen.getByText(/Today's Progress/i)).toBeInTheDocument();
    expect(screen.getByText(/Fitness & Health/i)).toBeInTheDocument();
    expect(screen.getByText(/Hydration & Water/i)).toBeInTheDocument();
    expect(screen.getByText(/Money & Salary/i)).toBeInTheDocument();
    expect(screen.getByText(/Daily Planner/i)).toBeInTheDocument();
  });

  it('renders FitnessPage with simplified nutrition, workouts, activities, and weight summaries', async () => {
    renderWithProviders(<FitnessPage />);
    expect(screen.getByRole('heading', { level: 1, name: /fitness & health/i })).toBeInTheDocument();
    expect(screen.getByText(/Food & Nutrition/i)).toBeInTheDocument();
    expect(screen.getByText(/Workouts & Gym/i)).toBeInTheDocument();
    expect(screen.getByText(/Running & Football/i)).toBeInTheDocument();
    expect(screen.getByText(/Body Weight/i)).toBeInTheDocument();
  });

  it('renders OnboardingModal with welcome branding and get started button', async () => {
    const handleClose = vi.fn();
    renderWithProviders(<OnboardingModal isOpen={true} onClose={handleClose} />);
    expect(screen.getByText(/Welcome to/i)).toBeInTheDocument();
    expect(screen.getAllByText(/LIFORA/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
  });
});
