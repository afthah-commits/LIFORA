import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WaterPage } from '../features/water/WaterPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { DynamicCard } from '../components/dynamic/DynamicCard';
import { DynamicFilter } from '../components/dynamic/DynamicFilter';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../stores/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'test-user-id',
      email: 'user@fitpulse.ai',
      profile: {
        age: 19,
        height_cm: 167.0,
        current_weight_kg: 53.0,
        timezone: 'Asia/Kolkata',
        preferred_language: 'English',
      },
      goals: {
        target_weight_kg: 60.0,
        daily_protein_target_g: 85.0,
        running_target_km: 5.0,
        daily_calorie_target: null,
      },
    },
    setUser: vi.fn(),
    logout: vi.fn(),
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, gcTime: 0 },
  },
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Final UX & Water Tracker Enhancements', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/water/daily')) {
        return Promise.resolve({
          data: {
            date: '2026-10-31',
            total_consumed_ml: 1250,
            daily_target_ml: 2500,
            remaining_ml: 1250,
            progress_percentage: 50.0,
            entries_count: 3,
            entries: [
              { id: 'entry-1', amount_ml: 250, time: '08:30', notes: 'Morning glass', date: '2026-10-31' },
              { id: 'entry-2', amount_ml: 500, time: '11:00', notes: 'Bottle after run', date: '2026-10-31' },
              { id: 'entry-3', amount_ml: 500, time: '14:00', notes: 'Post lunch', date: '2026-10-31' },
            ],
          },
        });
      }
      if (url.includes('/water/goal')) {
        return Promise.resolve({
          data: {
            id: 'goal-1',
            daily_target_ml: 2500,
            reminder_enabled: true,
            reminder_interval_hours: 2,
          },
        });
      }
      if (url.includes('/water/weekly')) {
        return Promise.resolve({
          data: {
            start_date: '2026-10-25',
            end_date: '2026-10-31',
            daily_average_ml: 2200,
            total_consumed_ml: 15400,
            daily_target_ml: 2500,
            days_goal_met: 5,
            daily_breakdown: [],
          },
        });
      }
      if (url.includes('/water/monthly')) {
        return Promise.resolve({
          data: {
            month: 10,
            year: 2026,
            total_consumed_ml: 65000,
            daily_average_ml: 2166,
            daily_target_ml: 2500,
            goal_completion_rate: 80.0,
            days_recorded: 30,
          },
        });
      }
      if (url.includes('/custom-modules')) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes('/dashboard/overview')) {
        return Promise.resolve({
          data: {
            primary_cards: [],
            quick_actions: [],
            custom_widgets: [],
            recent_activities: [],
            layout_config: {
              visible_cards: ['fitness', 'screentime', 'money', 'planner', 'water'],
              card_order: ['fitness', 'screentime', 'money', 'planner', 'water'],
            },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('renders WaterPage with hydration header, quick logging buttons, and goal indicators', async () => {
    renderWithProviders(<WaterPage />);

    expect(screen.getByRole('heading', { level: 1, name: /Water Tracker/i })).toBeInTheDocument();
    expect(screen.getByText(/Personal Hydration/i)).toBeInTheDocument();

    // 1-Tap quick buttons
    expect(screen.getByRole('button', { name: /\+100 ml/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+250 ml/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+500 ml/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /custom/i })).toBeInTheDocument();

    // Consumed & target values
    expect(await screen.findByText('50% Hydrated')).toBeInTheDocument();
    expect(screen.getAllByText('1250 ml').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2500 ml/i).length).toBeGreaterThan(0);
  });

  it('renders DynamicCard with title, stats, progress bar, and badge', () => {
    render(
      <MemoryRouter>
        <DynamicCard
          id="hydration"
          title="Daily Hydration"
          subtitle="Water intake tracker"
          icon="Droplets"
          color="cyan"
          badge="Hydrated"
          link="/water"
          stats={[
            { label: 'Consumed', value: '1,500 ml', progress: 60 },
            { label: 'Remaining', value: '1,000 ml' },
          ]}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Daily Hydration')).toBeInTheDocument();
    expect(screen.getByText('Water intake tracker')).toBeInTheDocument();
    expect(screen.getByText('Hydrated')).toBeInTheDocument();
    expect(screen.getByText('1,500 ml')).toBeInTheDocument();
    expect(screen.getByText('1,000 ml')).toBeInTheDocument();
  });

  it('renders DynamicFilter and handles search and clear', () => {
    const handleSearch = vi.fn();
    const handleReset = vi.fn();

    render(
      <DynamicFilter
        searchQuery="water bottle"
        onSearchChange={handleSearch}
        onReset={handleReset}
      />
    );

    expect(screen.getByDisplayValue('water bottle')).toBeInTheDocument();
    const clearBtn = screen.getByRole('button', { name: 'Clear' });
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(handleReset).toHaveBeenCalledTimes(1);
  });

  it('renders SettingsPage with 6 essential sections and allows tab switching', async () => {
    renderWithProviders(<SettingsPage />);

    expect(screen.getByText(/Settings Center/i)).toBeInTheDocument();

    // 6 Essential Section Tabs
    expect(screen.getByRole('button', { name: /^profile$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^goals$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^reminders$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^appearance$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^security$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^backup$/i })).toBeInTheDocument();

    // Test tab switching to Goals
    const goalsTab = screen.getByRole('button', { name: /^goals$/i });
    fireEvent.click(goalsTab);
    expect(screen.getByText(/2\. Goals & Targets/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save goals/i })).toBeInTheDocument();

    // Test tab switching to Reminders
    const remindersTab = screen.getByRole('button', { name: /^reminders$/i });
    fireEvent.click(remindersTab);
    expect(screen.getByText(/Water Hydration Reminder/i)).toBeInTheDocument();
    expect(screen.getByText(/Daily Workout Reminder/i)).toBeInTheDocument();

    // Test tab switching to Backup
    const backupTab = screen.getByRole('button', { name: /^backup$/i });
    fireEvent.click(backupTab);
    expect(screen.getByText(/6\. Data Backup & Restore/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset onboarding/i })).toBeInTheDocument();
  });
});
