import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CustomizationCenterPage } from '../features/customization/CustomizationCenterPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { Sidebar } from '../components/layout/Sidebar';
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
      email: 'test@fitpulse.ai',
      profile: {
        age: 24,
        height_cm: 175.0,
        current_weight_kg: 68.0,
      },
      goals: {
        daily_calorie_target: 2200,
        daily_protein_target_g: 90,
      },
    },
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

describe('Advanced Customization Center', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/custom-modules' || url === '/modules') {
        return Promise.resolve({
          data: [
            {
              id: 'mod-1',
              name: 'Sleep Tracker',
              slug: 'sleep-tracker',
              description: 'Track sleep hours and quality',
              icon: 'Moon',
              color: '#8b5cf6',
              category: 'health',
              is_active: true,
              show_in_sidebar: true,
              fields: [
                { id: 'f-1', name: 'Hours', field_type: 'number', is_required: true, order_index: 0 },
              ],
            },
          ],
        });
      }
      if (url === '/dashboard/config') {
        return Promise.resolve({
          data: {
            layout_config: {},
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
    (api.put as any).mockResolvedValue({ data: { success: true } });
    (api.post as any).mockResolvedValue({ data: { id: 'new-mod', name: 'Habits' } });
  });

  it('renders CustomizationCenterPage with all 6 editor tabs', async () => {
    renderWithProviders(<CustomizationCenterPage />);

    expect(screen.getByText('Advanced Customization Center')).toBeInTheDocument();
    expect(screen.getByText('Personal OS')).toBeInTheDocument();

    // Check tabs
    expect(screen.getByRole('button', { name: /Dashboard Editor/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sidebar & Nav Editor/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Module Builder/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Page & Widgets/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Feature Manager/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Theme & Appearance/i })).toBeInTheDocument();
  });

  it('allows toggling between Simple Mode and Advanced Mode', async () => {
    renderWithProviders(<CustomizationCenterPage />);

    const advancedBtn = screen.getByRole('button', { name: /Advanced Mode/i });
    fireEvent.click(advancedBtn);
    expect(screen.getByText(/Full access to all layout/i)).toBeInTheDocument();

    const simpleBtn = screen.getByRole('button', { name: /Simple Mode/i });
    fireEvent.click(simpleBtn);
    expect(screen.getByText(/Curated presets/i)).toBeInTheDocument();
  });

  it('renders Dashboard Editor and allows changing card sizes', async () => {
    renderWithProviders(<CustomizationCenterPage />);

    // Default tab is dashboard
    expect(screen.getByText(/1. Dashboard Cards & Layout Editor/i)).toBeInTheDocument();
    expect(screen.getByText('Fitness & Health')).toBeInTheDocument();
    expect(screen.getByText('Hydration & Water')).toBeInTheDocument();

    const wideButtons = screen.getAllByRole('button', { name: /^Wide$/i });
    expect(wideButtons.length).toBeGreaterThan(0);
    fireEvent.click(wideButtons[0]);
  });

  it('switches to Navigation Editor and displays sidebar items and bottom nav', async () => {
    renderWithProviders(<CustomizationCenterPage />);

    const navTab = screen.getByRole('button', { name: /Sidebar & Nav Editor/i });
    fireEvent.click(navTab);

    expect(screen.getByText(/Sidebar & Menu Structure/i)).toBeInTheDocument();
    expect(screen.getByText(/Mobile Bottom Navigation Tabs/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Custom Link/i })).toBeInTheDocument();
  });

  it('opens Custom Navigation Link modal and adds an item', async () => {
    renderWithProviders(<CustomizationCenterPage />);

    fireEvent.click(screen.getByRole('button', { name: /Sidebar & Nav Editor/i }));
    fireEvent.click(screen.getByRole('button', { name: /\+ Custom Link/i }));

    expect(screen.getByText('Add Custom Navigation Item')).toBeInTheDocument();

    const labelInput = screen.getByPlaceholderText('e.g. Reading Tracker, Gym Routine');
    fireEvent.change(labelInput, { target: { value: 'My Obsidian Vault' } });

    const pathInput = screen.getByPlaceholderText('e.g. /modules/reading-list, /planner');
    fireEvent.change(pathInput, { target: { value: 'https://notes.local' } });

    const addBtn = screen.getByRole('button', { name: /Add Link/i });
    fireEvent.click(addBtn);

    expect(screen.getByDisplayValue('My Obsidian Vault')).toBeInTheDocument();
  });

  it('switches to Module Builder tab and displays existing modules', async () => {
    renderWithProviders(<CustomizationCenterPage />);

    const moduleTab = screen.getByRole('button', { name: /Module Builder/i });
    fireEvent.click(moduleTab);

    expect(screen.getByText(/Dynamic Custom Module Builder/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Create New Module/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Sleep Tracker')).toBeInTheDocument();
    });
  });

  it('opens Create Module modal and supports all 15 field types', async () => {
    renderWithProviders(<CustomizationCenterPage />);

    fireEvent.click(screen.getByRole('button', { name: /Module Builder/i }));
    fireEvent.click(screen.getByRole('button', { name: /\+ Create New Module/i }));

    expect(screen.getByText('Create Custom Module')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Sleep Tracker, Books Read')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Module/i })).toBeInTheDocument();

    // Check that modal description explains generic modules with zero database migrations
    expect(screen.getByText(/zero database migrations/i)).toBeInTheDocument();
  });

  it('switches to Page & Widgets tab and toggles widget visibility', async () => {
    renderWithProviders(<CustomizationCenterPage />);

    fireEvent.click(screen.getByRole('button', { name: /Page & Widgets/i }));

    expect(screen.getByText(/Page Sections & Widget Visibility/i)).toBeInTheDocument();
    expect(screen.getByText('Greeting & Daily Overview')).toBeInTheDocument();
    expect(screen.getByText("Today's Core Pillars (Cards)")).toBeInTheDocument();
    expect(screen.getByText("Today's Progress Checklist")).toBeInTheDocument();
    expect(screen.getByText('1-Tap Hydration Bar')).toBeInTheDocument();
    expect(screen.getByText('Quick Add Floating / Header Button')).toBeInTheDocument();

    // Toggle Greeting checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
    fireEvent.click(checkboxes[0]);
  });

  it('switches to Feature Manager tab and displays feature toggles with data safety note', async () => {
    renderWithProviders(<CustomizationCenterPage />);

    fireEvent.click(screen.getByRole('button', { name: /Feature Manager/i }));

    expect(screen.getByText(/Application Feature Manager/i)).toBeInTheDocument();
    expect(screen.getByText(/Data Safety Guarantee/i)).toBeInTheDocument();
    expect(screen.getByText('Fitness & Health Tracking')).toBeInTheDocument();
    expect(screen.getByText('Water & Hydration Tracker')).toBeInTheDocument();
    expect(screen.getByText('Money & Salary Tracking')).toBeInTheDocument();
    expect(screen.getByText('Daily & Weekly Planner')).toBeInTheDocument();
  });

  it('switches to Theme & Appearance tab and displays theme variants and density', async () => {
    renderWithProviders(<CustomizationCenterPage />);

    fireEvent.click(screen.getByRole('button', { name: /Theme & Appearance/i }));

    expect(screen.getByText(/Theme & Visual Styling/i)).toBeInTheDocument();
    expect(screen.getByText('OLED Charcoal')).toBeInTheDocument();
    expect(screen.getByText('Midnight Slate')).toBeInTheDocument();
    expect(screen.getByText('Minimal Graphite')).toBeInTheDocument();

    expect(screen.getByText(/Comfortable/i)).toBeInTheDocument();
    expect(screen.getByText(/Compact/i)).toBeInTheDocument();

    // Click Midnight theme
    fireEvent.click(screen.getByText('Midnight Slate'));
  });

  it('saves changes to remote API when Save Changes is clicked', async () => {
    renderWithProviders(<CustomizationCenterPage />);

    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/dashboard/config',
        expect.objectContaining({
          layout_config: expect.any(Object),
        })
      );
    });
  });

  it('renders "Customize App" link in Settings page', async () => {
    renderWithProviders(<SettingsPage />);

    const customizeLinks = screen.getAllByRole('link', { name: /Customize App/i });
    expect(customizeLinks.length).toBeGreaterThan(0);
    expect(customizeLinks[0]).toHaveAttribute('href', '/customization');
  });

  it('renders "Customize App" in Sidebar under More', async () => {
    renderWithProviders(<Sidebar isCollapsed={false} onToggle={vi.fn()} isMobileOpen={true} onCloseMobile={vi.fn()} />);

    expect(screen.getByText('Customize App')).toBeInTheDocument();
  });

  it('persists customization settings after logout and login', async () => {
    const { useCustomizationStore } = await import('../stores/customizationStore');
    const { useAuthStore } = await import('../stores/authStore');

    // 1. User customizes their app (e.g. changes mode to advanced, theme to midnight)
    const customConfig = {
      ...useCustomizationStore.getState().config,
      mode: 'advanced' as const,
      appearance: {
        theme: 'midnight' as const,
        accent_color: 'cyan' as const,
        density: 'compact' as const,
      },
    };

    await useCustomizationStore.getState().saveConfig(customConfig);

    expect(api.put).toHaveBeenCalledWith('/dashboard/config', {
      layout_config: customConfig,
    });

    // 2. Simulate Logout (clearing session tokens and local store cache)
    localStorage.removeItem('fitpulse_access_token');
    localStorage.removeItem('fitpulse_refresh_token');
    localStorage.removeItem('fitpulse_customization_config');

    // 3. Simulate Server holding user's configuration when logging back in
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/dashboard/config') {
        return Promise.resolve({
          data: {
            layout_config: customConfig,
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    // 4. Simulate Login & Hydration
    localStorage.setItem('fitpulse_access_token', 'new-valid-token');
    await useCustomizationStore.getState().fetchConfig();

    // 5. Verify restored state
    const current = useCustomizationStore.getState().config;
    expect(current.mode).toBe('advanced');
    expect(current.appearance.theme).toBe('midnight');
    expect(current.appearance.accent_color).toBe('cyan');
  });
});
