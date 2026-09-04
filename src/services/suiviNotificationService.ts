import api from './api';
import type {
  SuiviNotification,
  SuiviNotificationRequest,
  PageResponse,
  AuditDTO,
} from '../types';

// ══════════════════════════════════════════════════════════════
// Suivi de Notification Service — CRUD, recherche, historique
// ══════════════════════════════════════════════════════════════

export const suiviNotificationService = {
  // ── Liste paginée (tous les suivis) ──
  lister: (page = 0, size = 15): Promise<PageResponse<SuiviNotification>> =>
    api.get<PageResponse<SuiviNotification>>('/suivis', { params: { page, size } }).then((r) => r.data),

  // ── Recherche (constats, actions, n° titre / lot) ──
  rechercher: (search: string, page = 0, size = 15): Promise<PageResponse<SuiviNotification>> =>
    api.get<PageResponse<SuiviNotification>>('/suivis/search', { params: { search, page, size } }).then((r) => r.data),

  // ── Suivis d'une notification ──
  listerParNotification: (idNotification: string): Promise<SuiviNotification[]> =>
    api.get<SuiviNotification[]>(`/suivis/by-notification/${idNotification}`).then((r) => r.data),

  // ── Détail par ID ──
  trouverParId: (id: string): Promise<SuiviNotification> =>
    api.get<SuiviNotification>(`/suivis/${id}`).then((r) => r.data),

  // ── Créer (idNotification requis) ──
  creer: (request: SuiviNotificationRequest): Promise<SuiviNotification> =>
    api.post<SuiviNotification>('/suivis', request).then((r) => r.data),

  // ── Modifier ──
  modifier: (id: string, request: SuiviNotificationRequest): Promise<SuiviNotification> =>
    api.put<SuiviNotification>(`/suivis/${id}`, request).then((r) => r.data),

  // ── Supprimer ──
  supprimer: (id: string) =>
    api.delete(`/suivis/${id}`),

  // ── Historique des modifications ──
  historique: (id: string): Promise<AuditDTO[]> =>
    api.get<AuditDTO[]>(`/suivis/${id}/historique`).then((r) => r.data),

  derniereModification: (id: string): Promise<AuditDTO | null> =>
    api.get<AuditDTO>(`/suivis/${id}/derniere-modification`).then((r) => r.data).catch(() => null),
};
