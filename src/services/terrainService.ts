import api from './api';
import type {
  Ville,
  Propriete,
  TitreFoncier,
  PrixM2,
  Parcelle,
  PageResponse,
  AuditDTO,
} from '../types';

// ══════════════════════════════════════════════════════════════
// Types de requête pour la création / modification
// ══════════════════════════════════════════════════════════════

export interface CreateVilleRequest {
  nomVille: string;
}

export interface UpdateVilleRequest {
  nomVille: string;
}

export interface CreateProprieteRequest {
  nom: string;
  idVille: number;
}

export interface UpdateProprieteRequest {
  nom: string;
  idVille: number;
}

export interface CreateTitreFoncierRequest {
  numero: string;
  typeTitre?: string;
  zone?: string;
  localisation?: string;
  superficieTotale?: number;
  idPropriete: number;
}

export interface UpdateTitreFoncierRequest {
  numero: string;
  typeTitre?: string;
  zone?: string;
  localisation?: string;
  superficieTotale?: number;
  idPropriete: number;
}

export interface CreatePrixM2Request {
  prixTtc: number;
  prixHt?: number;
  observation?: string;
  dateMaj?: string;
  idVille: number;
}

export interface UpdatePrixM2Request {
  prixTtc: number;
  prixHt?: number;
  observation?: string;
  dateMaj?: string;
  idVille: number;
}

export interface CreateParcelleRequest {
  numeroLot?: string;
  superficieM2?: number;
  observation?: string;
  idTitreFoncier: string;
}

export interface UpdateParcelleRequest {
  numeroLot?: string;
  superficieM2?: number;
  observation?: string;
  idTitreFoncier: string;
}

// ══════════════════════════════════════════════════════════════
// Villes
// ══════════════════════════════════════════════════════════════

export const villeService = {
  lister: (page = 0, size = 20): Promise<PageResponse<Ville>> =>
    api.get<PageResponse<Ville>>('/villes', { params: { page, size } }).then((r) => r.data),

  listerToutes: (): Promise<Ville[]> =>
    api.get<Ville[]>('/villes/all').then((r) => r.data),

  rechercher: (search: string, page = 0, size = 20): Promise<PageResponse<Ville>> =>
    api.get<PageResponse<Ville>>('/villes/search', { params: { search, page, size } }).then((r) => r.data),

  trouverParId: (id: number): Promise<Ville> =>
    api.get<Ville>(`/villes/${id}`).then((r) => r.data),

  creer: (request: CreateVilleRequest): Promise<Ville> =>
    api.post<Ville>('/villes', request).then((r) => r.data),

  modifier: (id: number, request: UpdateVilleRequest): Promise<Ville> =>
    api.put<Ville>(`/villes/${id}`, request).then((r) => r.data),

  supprimer: (id: number) =>
    api.delete(`/villes/${id}`),
};

// ══════════════════════════════════════════════════════════════
// Propriétés
// ══════════════════════════════════════════════════════════════

export const proprieteService = {
  lister: (page = 0, size = 20): Promise<PageResponse<Propriete>> =>
    api.get<PageResponse<Propriete>>('/proprietes', { params: { page, size } }).then((r) => r.data),

  rechercher: (search: string, page = 0, size = 20): Promise<PageResponse<Propriete>> =>
    api.get<PageResponse<Propriete>>('/proprietes/search', { params: { search, page, size } }).then((r) => r.data),

  listerParVille: (idVille: number): Promise<Propriete[]> =>
    api.get<Propriete[]>(`/proprietes/ville/${idVille}`).then((r) => r.data),

  trouverParId: (id: number): Promise<Propriete> =>
    api.get<Propriete>(`/proprietes/${id}`).then((r) => r.data),

  creer: (request: CreateProprieteRequest): Promise<Propriete> =>
    api.post<Propriete>('/proprietes', request).then((r) => r.data),

  modifier: (id: number, request: UpdateProprieteRequest): Promise<Propriete> =>
    api.put<Propriete>(`/proprietes/${id}`, request).then((r) => r.data),

  supprimer: (id: number) =>
    api.delete(`/proprietes/${id}`),
};

// ══════════════════════════════════════════════════════════════
// Titres Fonciers
// ══════════════════════════════════════════════════════════════

export const titreFoncierService = {
  lister: (page = 0, size = 20): Promise<PageResponse<TitreFoncier>> =>
    api.get<PageResponse<TitreFoncier>>('/titres-fonciers', { params: { page, size } }).then((r) => r.data),

  trouverParId: (id: string): Promise<TitreFoncier> =>
    api.get<TitreFoncier>(`/titres-fonciers/${id}`).then((r) => r.data),

  rechercherParNumero: (numero: string): Promise<TitreFoncier> =>
    api.get<TitreFoncier>(`/titres-fonciers/numero/${numero}`).then((r) => r.data),

  creer: (request: CreateTitreFoncierRequest): Promise<TitreFoncier> =>
    api.post<TitreFoncier>('/titres-fonciers', request).then((r) => r.data),

  modifier: (id: string, request: UpdateTitreFoncierRequest): Promise<TitreFoncier> =>
    api.put<TitreFoncier>(`/titres-fonciers/${id}`, request).then((r) => r.data),

  supprimer: (id: string) =>
    api.delete(`/titres-fonciers/${id}`),
};

// ══════════════════════════════════════════════════════════════
// Prix au m²
// ══════════════════════════════════════════════════════════════

export const prixM2Service = {
  lister: (page = 0, size = 20): Promise<PageResponse<PrixM2>> =>
    api.get<PageResponse<PrixM2>>('/prix-m2', { params: { page, size } }).then((r) => r.data),

  listerParVille: (idVille: number): Promise<PrixM2[]> =>
    api.get<PrixM2[]>(`/prix-m2/ville/${idVille}`).then((r) => r.data),

  trouverParId: (id: number): Promise<PrixM2> =>
    api.get<PrixM2>(`/prix-m2/${id}`).then((r) => r.data),

  creer: (request: CreatePrixM2Request): Promise<PrixM2> =>
    api.post<PrixM2>('/prix-m2', request).then((r) => r.data),

  modifier: (id: number, request: UpdatePrixM2Request): Promise<PrixM2> =>
    api.put<PrixM2>(`/prix-m2/${id}`, request).then((r) => r.data),

  supprimer: (id: number) =>
    api.delete(`/prix-m2/${id}`),

  historique: (id: number): Promise<AuditDTO[]> =>
    api.get<AuditDTO[]>(`/prix-m2/${id}/historique`).then((r) => r.data),

  derniereModification: (id: number): Promise<AuditDTO | null> =>
    api.get<AuditDTO>(`/prix-m2/${id}/derniere-modification`).then((r) => r.data).catch(() => null),
};

// ══════════════════════════════════════════════════════════════
// Parcelles
// ══════════════════════════════════════════════════════════════

export const parcelleService = {
  lister: (page = 0, size = 20): Promise<PageResponse<Parcelle>> =>
    api.get<PageResponse<Parcelle>>('/parcelles', { params: { page, size } }).then((r) => r.data),

  listerParTitreFoncier: (idTitreFoncier: string): Promise<Parcelle[]> =>
    api.get<Parcelle[]>(`/parcelles/titre-foncier/${idTitreFoncier}`).then((r) => r.data),

  trouverParId: (id: string): Promise<Parcelle> =>
    api.get<Parcelle>(`/parcelles/${id}`).then((r) => r.data),

  creer: (request: CreateParcelleRequest): Promise<Parcelle> =>
    api.post<Parcelle>('/parcelles', request).then((r) => r.data),

  modifier: (id: string, request: UpdateParcelleRequest): Promise<Parcelle> =>
    api.put<Parcelle>(`/parcelles/${id}`, request).then((r) => r.data),

  supprimer: (id: string) =>
    api.delete(`/parcelles/${id}`),
};
