import axios from 'axios';
import type { LoginResponse, TokenRefreshRequest } from '../types';

const API_BASE = '/api';

// ══════════════════════════════════════════════════════════════
// Instance Axios — point d'entrée unique pour les appels HTTP
// ══════════════════════════════════════════════════════════════

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// ── Token helpers ──
export function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken');
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
}

export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

// ── Request interceptor : attacher le JWT ──
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor : auto-refresh sur 401 ──
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown) {
  failedQueue.forEach((prom) => {
    error ? prom.reject(error) : prom.resolve(undefined);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Un 401 sur /auth/login (mauvais mot de passe) ou /auth/refresh (refresh
    // invalide) ne doit PAS déclencher un nouveau refresh : on rejette tel quel.
    const urlAuth = originalRequest?.url ?? '';
    const estAppelAuth = /\/auth\/(login|refresh|logout)/.test(urlAuth);

    if (error.response?.status === 401 && !originalRequest._retry && !estAppelAuth) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post<LoginResponse>(`${API_BASE}/auth/refresh`, {
          refreshToken,
        } as TokenRefreshRequest);
        setTokens(data.accessToken, data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.utilisateur));
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        clearTokens();
        window.location.href = '/login';
        processQueue(refreshError);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
