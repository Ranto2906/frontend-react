import api from './api';
import type {
  Personne,
  TypePersonne,
  CreatePersonneRequest,
  UpdatePersonneRequest,
  PageResponse,
  AuditDTO,
} from '../types';

// ══════════════════════════════════════════════════════════════
// Personne Service — CRUD, recherche, filtrage par rôle
// ══════════════════════════════════════════════════════════════

export const personService = {
  // ── Types de personne (référentiel) ──
  listerTypes: (): Promise<TypePersonne[]> =>
    api.get<TypePersonne[]>('/personnes/types').then((r) => r.data),

  // ── Liste paginée ──
  lister: (page = 0, size = 20): Promise<PageResponse<Personne>> =>
    api.get<PageResponse<Personne>>('/personnes', { params: { page, size } }).then((r) => r.data),

  // ── Recherche globale ──
  rechercher: (search: string, page = 0, size = 20): Promise<PageResponse<Personne>> =>
    api.get<PageResponse<Personne>>('/personnes/search', { params: { search, page, size } }).then((r) => r.data),

  // ── Recherche par nom ──
  rechercherParNom: (nom: string, page = 0, size = 20): Promise<PageResponse<Personne>> =>
    api.get<PageResponse<Personne>>('/personnes/search/nom', { params: { nom, page, size } }).then((r) => r.data),

  // ── Détail par ID ──
  trouverParId: (id: number): Promise<Personne> =>
    api.get<Personne>(`/personnes/${id}`).then((r) => r.data),

  // ── Lister par rôle ──
  listerParRole: (role: string, page = 0, size = 20): Promise<PageResponse<Personne>> =>
    api.get<PageResponse<Personne>>('/personnes/role/' + encodeURIComponent(role), { params: { page, size } }).then((r) => r.data),

  // ── Créer ──
  creer: (request: CreatePersonneRequest): Promise<Personne> =>
    api.post<Personne>('/personnes', request).then((r) => r.data),

  // ── Modifier (POST pour traçabilité) ──
  modifier: (id: number, request: UpdatePersonneRequest): Promise<Personne> =>
    api.put<Personne>(`/personnes/${id}`, request).then((r) => r.data),

  // ── Supprimer ──
  supprimer: (id: number) =>
    api.delete(`/personnes/${id}`),

  // ── Historique des modifications ──
  historique: (id: number): Promise<AuditDTO[]> =>
    api.get<AuditDTO[]>(`/personnes/${id}/historique`).then((r) => r.data),

  derniereModification: (id: number): Promise<AuditDTO | null> =>
    api.get<AuditDTO>(`/personnes/${id}/derniere-modification`).then((r) => r.data).catch(() => null),
};
