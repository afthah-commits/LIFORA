import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../stores/authStore';

describe('Auth Store', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
  });

  it('sets authentication tokens and user state correctly', () => {
    const mockUser = {
      id: '123',
      email: 'user@fitpulse.ai',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    useAuthStore.getState().setAuth({
      access_token: 'fake-access-token',
      refresh_token: 'fake-refresh-token',
      token_type: 'bearer',
      user: mockUser,
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.email).toBe('user@fitpulse.ai');
    expect(localStorage.getItem('fitpulse_access_token')).toBe('fake-access-token');
    expect(localStorage.getItem('fitpulse_refresh_token')).toBe('fake-refresh-token');
  });

  it('clears state on logout', async () => {
    localStorage.setItem('fitpulse_access_token', 'token');
    useAuthStore.setState({ isAuthenticated: true, user: { id: '1', email: 'a@b.com', is_active: true, created_at: '' } });

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(localStorage.getItem('fitpulse_access_token')).toBeNull();
  });
});
