import api from './api';
import type {
  Ville,
  Propriete,
  ProprieteType,
  ProprieteOccupation,
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
  numero?: string;
  zone?: string;
  localisation?: string;
  superficieTotale?: number;
  idLieu?: number;
  /** Type de propriété (référentiel /api/types-propriete) — obligatoire. */
  idTypePropriete: number;
}

export interface UpdateProprieteRequest {
  nom: string;
  numero?: string;
  zone?: string;
  localisation?: string;
  superficieTotale?: number;
  idLieu?: number;
  /** Type de propriété (référentiel /api/types-propriete) — obligatoire. */
  idTypePropriete: number;
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
  idPropriete: number;
}

export interface UpdateParcelleRequest {
  numeroLot?: string;
  superficieM2?: number;
  observation?: string;
  idPropriete: number;
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
    api.get<PageResponse<Propriete>>('/proprietes', { params: { page, size, sort: 'nom,asc' } }).then((r) => r.data),

  rechercher: (search: string, page = 0, size = 20): Promise<PageResponse<Propriete>> =>
    api.get<PageResponse<Propriete>>('/proprietes/search', { params: { search, page, size, sort: 'nom,asc' } }).then((r) => r.data),

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

  historique: (id: number): Promise<AuditDTO[]> =>
    api.get<AuditDTO[]>(`/proprietes/${id}/historique`).then((r) => r.data),

  /**
   * Dossiers rattachés à une propriété + superficie restante.
   * `exclureDossier` (édition) permet de ne pas compter le dossier en cours.
   */
  dossiers: (id: number, exclureDossier?: number): Promise<ProprieteOccupation> =>
    api.get<ProprieteOccupation>(`/proprietes/${id}/dossiers`, {
      params: exclureDossier != null ? { exclureDossier } : undefined,
    }).then((r) => r.data),
};

// ══════════════════════════════════════════════════════════════
// Types de propriété (référentiel type_propriete)
// ══════════════════════════════════════════════════════════════

export const typeProprieteService = {
  lister: (): Promise<ProprieteType[]> =>
    api.get<ProprieteType[]>('/types-propriete').then((r) => r.data),

  trouverParId: (id: number): Promise<ProprieteType> =>
    api.get<ProprieteType>(`/types-propriete/${id}`).then((r) => r.data),

  trouverParDefaut: (): Promise<ProprieteType> =>
    api.get<ProprieteType>('/types-propriete/par-defaut').then((r) => r.data),
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

  listerParPropriete: (idPropriete: number): Promise<Parcelle[]> =>
    api.get<Parcelle[]>(`/parcelles/propriete/${idPropriete}`).then((r) => r.data),

  trouverParId: (id: string): Promise<Parcelle> =>
    api.get<Parcelle>(`/parcelles/${id}`).then((r) => r.data),

  creer: (request: CreateParcelleRequest): Promise<Parcelle> =>
    api.post<Parcelle>('/parcelles', request).then((r) => r.data),

  modifier: (id: string, request: UpdateParcelleRequest): Promise<Parcelle> =>
    api.put<Parcelle>(`/parcelles/${id}`, request).then((r) => r.data),

  supprimer: (id: string) =>
    api.delete(`/parcelles/${id}`),
};
