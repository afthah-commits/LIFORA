import axios from 'axios';

/**
 * Dynamically resolves the API base URL.
 * When accessed from a mobile browser on LAN (e.g. http://192.168.31.161:5173),
 * relative URLs ('/api/v1') seamlessly route through Vite proxy.
 * If an absolute localhost URL was provided in env, it replaces localhost with the device's accessed hostname.
 */
export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (!envUrl || envUrl.startsWith('/')) {
    return envUrl || '/api/v1';
  }
  let base = envUrl.trim();
  try {
    const parsed = new URL(base);
    if (
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
      typeof window !== 'undefined' &&
      window.location.hostname &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      parsed.hostname = window.location.hostname;
      base = parsed.toString();
    }
  } catch {
    // Keep as is if URL constructor fails
  }

  // Ensure trailing path includes /api/v1
  base = base.replace(/\/$/, '');
  if (!base.endsWith('/api/v1')) {
    if (base.endsWith('/api')) {
      base = `${base}/v1`;
    } else if (!base.includes('/api/')) {
      base = `${base}/api/v1`;
    }
  }
  return base;
};

export const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('fitpulse_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle automatic token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt refresh on auth login/refresh endpoints
    if (
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('fitpulse_refresh_token');
      if (!refreshToken) {
        localStorage.removeItem('fitpulse_access_token');
        localStorage.removeItem('fitpulse_refresh_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: new_refresh_token } = response.data;
        localStorage.setItem('fitpulse_access_token', access_token);
        localStorage.setItem('fitpulse_refresh_token', new_refresh_token);

        api.defaults.headers.common.Authorization = `Bearer ${access_token}`;
        originalRequest.headers.Authorization = `Bearer ${access_token}`;

        processQueue(null, access_token);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('fitpulse_access_token');
        localStorage.removeItem('fitpulse_refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
