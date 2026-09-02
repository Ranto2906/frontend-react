import api from './api';
import type { LoginRequest, LoginResponse, UtilisateurDTO } from '../types';

// ══════════════════════════════════════════════════════════════
// Auth Service — Connexion, déconnexion, refresh, profil
// ══════════════════════════════════════════════════════════════

export const authService = {
  login: (request: LoginRequest): Promise<LoginResponse> =>
    api.post<LoginResponse>('/auth/login', request).then((r) => r.data),

  logout: (refreshToken: string | null) =>
    api.post('/auth/logout', refreshToken ? { refreshToken } : null),

  refreshToken: (refreshToken: string): Promise<LoginResponse> =>
    api.post<LoginResponse>('/auth/refresh', { refreshToken }).then((r) => r.data),

  getMe: (): Promise<UtilisateurDTO> =>
    api.get<UtilisateurDTO>('/auth/me').then((r) => r.data),

  changePassword: (request: { ancienMotDePasse: string; nouveauMotDePasse: string }) =>
    api.put('/auth/change-password', request),
};
