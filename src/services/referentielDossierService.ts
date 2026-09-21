import api from './api';
import type { Lieu, TypeDossier, DossierFournie } from '../types';

// ══════════════════════════════════════════════════════════════
// Lieu — référentiel (rattaché à une ville, utilisé par propriété)
// ══════════════════════════════════════════════════════════════

export interface CreateLieuRequest {
  libelle: string;
  idVille: number;
}

export interface UpdateLieuRequest {
  libelle: string;
  idVille: number;
}

export const lieuService = {
  lister: (): Promise<Lieu[]> =>
    api.get<Lieu[]>('/lieux').then((r) => r.data),

  listerParVille: (idVille: number): Promise<Lieu[]> =>
    api.get<Lieu[]>(`/lieux/ville/${idVille}`).then((r) => r.data),

  trouverParId: (id: number): Promise<Lieu> =>
    api.get<Lieu>(`/lieux/${id}`).then((r) => r.data),

  creer: (request: CreateLieuRequest): Promise<Lieu> =>
    api.post<Lieu>('/lieux', request).then((r) => r.data),

  modifier: (id: number, request: UpdateLieuRequest): Promise<Lieu> =>
    api.put<Lieu>(`/lieux/${id}`, request).then((r) => r.data),

  supprimer: (id: number) =>
    api.delete(`/lieux/${id}`),
};

// ══════════════════════════════════════════════════════════════
// TypeDossier — référentiel (sélectionné à la création de demande)
// ══════════════════════════════════════════════════════════════

export const typeDossierService = {
  lister: (): Promise<TypeDossier[]> =>
    api.get<TypeDossier[]>('/types-dossier').then((r) => r.data),

  trouverParId: (id: number): Promise<TypeDossier> =>
    api.get<TypeDossier>(`/types-dossier/${id}`).then((r) => r.data),

  creer: (code: string, libelle: string): Promise<TypeDossier> =>
    api.post<TypeDossier>('/types-dossier', { code, libelle }).then((r) => r.data),

  modifier: (id: number, code: string, libelle: string): Promise<TypeDossier> =>
    api.put<TypeDossier>(`/types-dossier/${id}`, { code, libelle }).then((r) => r.data),

  supprimer: (id: number) =>
    api.delete(`/types-dossier/${id}`),
};

// ══════════════════════════════════════════════════════════════
// DossierFournie — référentiel des pièces fournies (texte libre
// à la création de demande, find-or-create côté serveur)
// ══════════════════════════════════════════════════════════════

export const dossierFournieService = {
  lister: (): Promise<DossierFournie[]> =>
    api.get<DossierFournie[]>('/dossiers-fournis').then((r) => r.data),

  trouverParId: (id: number): Promise<DossierFournie> =>
    api.get<DossierFournie>(`/dossiers-fournis/${id}`).then((r) => r.data),

  creer: (libelle: string): Promise<DossierFournie> =>
    api.post<DossierFournie>('/dossiers-fournis', { libelle }).then((r) => r.data),

  modifier: (id: number, libelle: string): Promise<DossierFournie> =>
    api.put<DossierFournie>(`/dossiers-fournis/${id}`, { libelle }).then((r) => r.data),

  supprimer: (id: number) =>
    api.delete(`/dossiers-fournis/${id}`),
};
