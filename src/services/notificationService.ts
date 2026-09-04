import api from './api';
import type {
  NotificationOccupation,
  NotificationOccupationRequest,
  PageResponse,
  AuditDTO,
} from '../types';

// ══════════════════════════════════════════════════════════════
// Notification d'Occupation Service — CRUD, recherche, historique
// ══════════════════════════════════════════════════════════════

export const notificationOccupationService = {
  // ── Liste paginée ──
  lister: (page = 0, size = 15): Promise<PageResponse<NotificationOccupation>> =>
    api.get<PageResponse<NotificationOccupation>>('/notifications', { params: { page, size } }).then((r) => r.data),

  // ── Recherche globale (contenu, constats, doléances…) ──
  rechercher: (search: string, page = 0, size = 15): Promise<PageResponse<NotificationOccupation>> =>
    api.get<PageResponse<NotificationOccupation>>('/notifications/search', { params: { search, page, size } }).then((r) => r.data),

  // ── Lister par statut ──
  listerParStatut: (statut: string): Promise<NotificationOccupation[]> =>
    api.get<NotificationOccupation[]>('/notifications/statut/' + encodeURIComponent(statut)).then((r) => r.data),

  // ── Détail par ID ──
  trouverParId: (id: string): Promise<NotificationOccupation> =>
    api.get<NotificationOccupation>(`/notifications/${id}`).then((r) => r.data),

  // ── Créer ──
  creer: (request: NotificationOccupationRequest): Promise<NotificationOccupation> =>
    api.post<NotificationOccupation>('/notifications', request).then((r) => r.data),

  // ── Modifier ──
  modifier: (id: string, request: NotificationOccupationRequest): Promise<NotificationOccupation> =>
    api.put<NotificationOccupation>(`/notifications/${id}`, request).then((r) => r.data),

  // ── Supprimer ──
  supprimer: (id: string) =>
    api.delete(`/notifications/${id}`),

  // ── Historique des modifications ──
  historique: (id: string): Promise<AuditDTO[]> =>
    api.get<AuditDTO[]>(`/notifications/${id}/historique`).then((r) => r.data),

  derniereModification: (id: string): Promise<AuditDTO | null> =>
    api.get<AuditDTO>(`/notifications/${id}/derniere-modification`).then((r) => r.data).catch(() => null),
};
