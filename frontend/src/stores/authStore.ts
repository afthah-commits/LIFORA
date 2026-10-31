import { create } from 'zustand';
import { User, AuthTokens } from '../types';
import { api } from '../services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (data: AuthTokens) => void;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('fitpulse_access_token'),
  isLoading: true,

  setAuth: (data: AuthTokens) => {
    localStorage.setItem('fitpulse_access_token', data.access_token);
    localStorage.setItem('fitpulse_refresh_token', data.refresh_token);
    set({
      user: data.user,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  setUser: (user: User) => {
    set({ user });
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('fitpulse_refresh_token');
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      } catch (e) {
        // Ignore logout network errors
      }
    }
    localStorage.removeItem('fitpulse_access_token');
    localStorage.removeItem('fitpulse_refresh_token');
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('fitpulse_access_token');
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      set({ isLoading: true });
      const resp = await api.get<User>('/auth/me');
      set({ user: resp.data, isAuthenticated: true, isLoading: false });
    } catch (err) {
      localStorage.removeItem('fitpulse_access_token');
      localStorage.removeItem('fitpulse_refresh_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
