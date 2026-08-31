import axios from 'axios';
import type {
  LoginRequest, LoginResponse, TokenRefreshRequest,
  UtilisateurDTO, CreateUtilisateurRequest, UpdateUtilisateurRequest,
  RoleDTO, CreateRoleRequest, RoleWithPermissionsDTO, PermissionDTO,
  JournalConnexionDTO, SessionDTO, AuditDTO, PageResponse,
  ModuleRBAC, EntiteRBAC, ActionRBAC,
} from '../types';

const API_BASE = '/api';

// ── Axios instance ──
const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// ── Token helpers ──
function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}

function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken');
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
}

function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

// ── Request interceptor: attach JWT ──
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: auto-refresh on 401 ──
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(undefined);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
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

// ── Auth API ──
export const authApi = {
  login: (request: LoginRequest) =>
    api.post<LoginResponse>('/auth/login', request).then((r) => r.data),

  logout: (refreshToken: string | null) =>
    api.post('/auth/logout', refreshToken ? { refreshToken } : null),

  refreshToken: (refreshToken: string) =>
    api.post<LoginResponse>('/auth/refresh', { refreshToken }).then((r) => r.data),

  getMe: () =>
    api.get<UtilisateurDTO>('/auth/me').then((r) => r.data),

  changePassword: (request: { ancienMotDePasse: string; nouveauMotDePasse: string }) =>
    api.put('/auth/change-password', request),
};

// ── Utilisateurs API ──
export const utilisateurApi = {
  lister: (search?: string, page = 0, size = 20) =>
    api.get<PageResponse<UtilisateurDTO>>('/utilisateurs', { params: { search, page, size } }).then((r) => r.data),

  trouverParId: (id: number) =>
    api.get<UtilisateurDTO>(`/utilisateurs/${id}`).then((r) => r.data),

  creer: (request: CreateUtilisateurRequest) =>
    api.post<UtilisateurDTO>('/utilisateurs', request).then((r) => r.data),

  mettreAJour: (id: number, request: UpdateUtilisateurRequest) =>
    api.put<UtilisateurDTO>(`/utilisateurs/${id}`, request).then((r) => r.data),

  activerDesactiver: (id: number, actif: boolean) =>
    api.patch<UtilisateurDTO>(`/utilisateurs/${id}/activer`, { actif }).then((r) => r.data),

  reinitialiserMotDePasse: (id: number, motDePasse: string) =>
    api.post(`/utilisateurs/${id}/reinitialiser-mot-de-passe`, { motDePasse }),

  supprimer: (id: number) =>
    api.delete(`/utilisateurs/${id}`),

  listerRoles: (id: number) =>
    api.get<RoleDTO[]>(`/utilisateurs/${id}/roles`).then((r) => r.data),

  attribuerRole: (id: number, idRole: number) =>
    api.post(`/utilisateurs/${id}/roles`, { idRole }),

  retirerRole: (id: number, roleId: number) =>
    api.delete(`/utilisateurs/${id}/roles/${roleId}`),
};

// ── Rôles API ──
export const roleApi = {
  lister: () =>
    api.get<RoleDTO[]>('/roles').then((r) => r.data),

  trouverParId: (id: number) =>
    api.get<RoleDTO>(`/roles/${id}`).then((r) => r.data),

  creer: (request: CreateRoleRequest) =>
    api.post<RoleDTO>('/roles', request).then((r) => r.data),

  mettreAJour: (id: number, request: CreateRoleRequest) =>
    api.put<RoleDTO>(`/roles/${id}`, request).then((r) => r.data),

  supprimer: (id: number) =>
    api.delete(`/roles/${id}`),

  listerPermissions: () =>
    api.get<PermissionDTO[]>('/roles/permissions').then((r) => r.data),

  trouverAvecPermissions: (id: number) =>
    api.get<RoleWithPermissionsDTO>(`/roles/${id}/permissions`).then((r) => r.data),

  attribuerPermission: (idRole: number, idPermission: number) =>
    api.post(`/roles/${idRole}/permissions`, { idPermission }),

  retirerPermission: (idRole: number, idPermission: number) =>
    api.delete(`/roles/${idRole}/permissions/${idPermission}`),

  listerModules: () =>
    api.get<ModuleRBAC[]>('/roles/modules').then((r) => r.data),

  listerEntites: () =>
    api.get<EntiteRBAC[]>('/roles/entites').then((r) => r.data),

  listerActions: () =>
    api.get<ActionRBAC[]>('/roles/actions').then((r) => r.data),
};

// ── Admin API ──
export const adminApi = {
  journal: (page = 0, size = 20) =>
    api.get<PageResponse<JournalConnexionDTO>>('/admin/journal', { params: { page, size } }).then((r) => r.data),

  journalUtilisateur: (id: number) =>
    api.get<JournalConnexionDTO[]>(`/admin/journal/${id}`).then((r) => r.data),

  revoquerSessions: (id: number) =>
    api.post(`/admin/sessions/${id}/revoquer`),

  listerSessions: (page = 0, size = 20) =>
    api.get<PageResponse<SessionDTO>>('/admin/sessions', { params: { page, size } }).then((r) => r.data),

  sessionsUtilisateur: (id: number) =>
    api.get<SessionDTO[]>(`/admin/sessions/${id}`).then((r) => r.data),

  nettoyerSessionsExpirees: () =>
    api.delete('/admin/sessions/expirees'),
};

// ── Audit API ──
export const auditApi = {
  lister: (page = 0, size = 20) =>
    api.get<PageResponse<AuditDTO>>('/admin/audit', { params: { page, size } }).then((r) => r.data),

  rechercher: (entiteType?: string, action?: string, search?: string, page = 0, size = 20) =>
    api.get<PageResponse<AuditDTO>>('/admin/audit', {
      params: { entiteType, action, search, page, size },
    }).then((r) => r.data),

  stats: () =>
    api.get<Record<string, number>>('/admin/audit/stats').then((r) => r.data),
};

export { api, setTokens, clearTokens, getAccessToken, getRefreshToken };
export default api;
