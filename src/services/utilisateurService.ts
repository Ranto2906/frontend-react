import api from './api';
import type {
  UtilisateurDTO, CreateUtilisateurRequest, UpdateUtilisateurRequest,
  RoleDTO, PageResponse,
} from '../types';

// ══════════════════════════════════════════════════════════════
// Utilisateur Service — CRUD, rôles, activation/désactivation
// ══════════════════════════════════════════════════════════════

export const utilisateurService = {
  // ── Liste & Détail ──
  lister: (search?: string, page = 0, size = 20): Promise<PageResponse<UtilisateurDTO>> =>
    api.get<PageResponse<UtilisateurDTO>>('/utilisateurs', { params: { search, page, size } }).then((r) => r.data),

  trouverParId: (id: number): Promise<UtilisateurDTO> =>
    api.get<UtilisateurDTO>(`/utilisateurs/${id}`).then((r) => r.data),

  // ── CRUD ──
  creer: (request: CreateUtilisateurRequest): Promise<UtilisateurDTO> =>
    api.post<UtilisateurDTO>('/utilisateurs', request).then((r) => r.data),

  mettreAJour: (id: number, request: UpdateUtilisateurRequest): Promise<UtilisateurDTO> =>
    api.put<UtilisateurDTO>(`/utilisateurs/${id}`, request).then((r) => r.data),

  supprimer: (id: number) =>
    api.delete(`/utilisateurs/${id}`),

  // ── Activation / Désactivation ──
  activerDesactiver: (id: number, actif: boolean): Promise<UtilisateurDTO> =>
    api.patch<UtilisateurDTO>(`/utilisateurs/${id}/activer`, { actif }).then((r) => r.data),

  // ── Mot de passe ──
  reinitialiserMotDePasse: (id: number, motDePasse: string) =>
    api.post(`/utilisateurs/${id}/reinitialiser-mot-de-passe`, { motDePasse }),

  // ── Rôles ──
  listerRoles: (id: number): Promise<RoleDTO[]> =>
    api.get<RoleDTO[]>(`/utilisateurs/${id}/roles`).then((r) => r.data),

  attribuerRole: (id: number, idRole: number) =>
    api.post(`/utilisateurs/${id}/roles`, { idRole }),

  retirerRole: (id: number, roleId: number) =>
    api.delete(`/utilisateurs/${id}/roles/${roleId}`),
};
