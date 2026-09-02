import api from './api';
import type {
  JournalConnexionDTO, SessionDTO, AuditDTO, PageResponse,
} from '../types';

// ══════════════════════════════════════════════════════════════
// Admin Service — Journal, Sessions, Audit
// ══════════════════════════════════════════════════════════════

export const adminService = {
  // ── Journal des connexions ──
  journal: (page = 0, size = 20): Promise<PageResponse<JournalConnexionDTO>> =>
    api.get<PageResponse<JournalConnexionDTO>>('/admin/journal', { params: { page, size } }).then((r) => r.data),

  journalUtilisateur: (id: number): Promise<JournalConnexionDTO[]> =>
    api.get<JournalConnexionDTO[]>(`/admin/journal/${id}`).then((r) => r.data),

  // ── Sessions ──
  listerSessions: (page = 0, size = 20): Promise<PageResponse<SessionDTO>> =>
    api.get<PageResponse<SessionDTO>>('/admin/sessions', { params: { page, size } }).then((r) => r.data),

  sessionsUtilisateur: (id: number): Promise<SessionDTO[]> =>
    api.get<SessionDTO[]>(`/admin/sessions/${id}`).then((r) => r.data),

  revoquerSessions: (id: number) =>
    api.post(`/admin/sessions/${id}/revoquer`),

  nettoyerSessionsExpirees: () =>
    api.delete('/admin/sessions/expirees'),

  // ── Audit ──
  audit: (page = 0, size = 20): Promise<PageResponse<AuditDTO>> =>
    api.get<PageResponse<AuditDTO>>('/admin/audit', { params: { page, size } }).then((r) => r.data),

  auditRechercher: (entiteType?: string, action?: string, search?: string, page = 0, size = 20): Promise<PageResponse<AuditDTO>> =>
    api.get<PageResponse<AuditDTO>>('/admin/audit', {
      params: { entiteType, action, search, page, size },
    }).then((r) => r.data),

  auditStats: (): Promise<Record<string, number>> =>
    api.get<Record<string, number>>('/admin/audit/stats').then((r) => r.data),
};
