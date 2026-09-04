import api from './api';
import type {
  Avertissement,
  AvertissementRequest,
  PageResponse,
  AuditDTO,
} from '../types';

// ══════════════════════════════════════════════════════════════
// Avertissement Service — CRUD, recherche, historique
// ══════════════════════════════════════════════════════════════

export const avertissementService = {
  // ── Liste paginée ──
  lister: (page = 0, size = 15): Promise<PageResponse<Avertissement>> =>
    api.get<PageResponse<Avertissement>>('/avertissements', { params: { page, size } }).then((r) => r.data),

  // ── Recherche globale ──
  rechercher: (search: string, page = 0, size = 15): Promise<PageResponse<Avertissement>> =>
    api.get<PageResponse<Avertissement>>('/avertissements/search', { params: { search, page, size } }).then((r) => r.data),

  // ── Lister par année ──
  listerParAnnee: (annee: number): Promise<Avertissement[]> =>
    api.get<Avertissement[]>('/avertissements/annee/' + annee).then((r) => r.data),

  // ── Lister par personne ──
  listerParPersonne: (idPersonne: number): Promise<Avertissement[]> =>
    api.get<Avertissement[]>('/avertissements/personne/' + idPersonne).then((r) => r.data),

  // ── Détail par ID ──
  trouverParId: (id: string): Promise<Avertissement> =>
    api.get<Avertissement>(`/avertissements/${id}`).then((r) => r.data),

  // ── Créer ──
  creer: (request: AvertissementRequest): Promise<Avertissement> =>
    api.post<Avertissement>('/avertissements', request).then((r) => r.data),

  // ── Modifier ──
  modifier: (id: string, request: AvertissementRequest): Promise<Avertissement> =>
    api.put<Avertissement>(`/avertissements/${id}`, request).then((r) => r.data),

  // ── Supprimer ──
  supprimer: (id: string) =>
    api.delete(`/avertissements/${id}`),

  // ── Historique des modifications ──
  historique: (id: string): Promise<AuditDTO[]> =>
    api.get<AuditDTO[]>(`/avertissements/${id}/historique`).then((r) => r.data),

  derniereModification: (id: string): Promise<AuditDTO | null> =>
    api.get<AuditDTO>(`/avertissements/${id}/derniere-modification`).then((r) => r.data).catch(() => null),
};
