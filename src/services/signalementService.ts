import api from './api';
import type {
  Signalement,
  SignalementRequest,
  SignalementTraitementRequest,
  SignalementAudit,
  TypeSignalement,
  StatutSignalement,
  StatistiquesSignalement,
  PhotoDTO,
  Parcelle,
  PageResponse,
} from '../types';

/** Géométrie PostGIS du constat (renvoyée par GET /signalements/{id}/geometrie). */
export interface GeometrieDTO {
  idGeometrie: string;
  entiteType: string;
  entiteId: string;
  typeGeometrie: string;
  geojson: string;
  precisionM?: number | null;
  superficieCalculeeM2?: number | null;
  source?: string;
  dateCreation?: string;
  dateModification?: string;
}

export const signalementService = {
  // ── Référentiels ──
  listerTypes: (): Promise<TypeSignalement[]> =>
    api.get<TypeSignalement[]>('/signalements/types').then((r) => r.data),

  listerStatuts: (): Promise<StatutSignalement[]> =>
    api.get<StatutSignalement[]>('/signalements/statuts').then((r) => r.data),

  // ── Liste / recherche / filtres ──
  lister: (page = 0, size = 20): Promise<PageResponse<Signalement>> =>
    api.get<PageResponse<Signalement>>('/signalements', { params: { page, size, sort: 'dateSignalement,desc' } })
      .then((r) => r.data),

  rechercher: (search: string, page = 0, size = 20): Promise<PageResponse<Signalement>> =>
    api.get<PageResponse<Signalement>>('/signalements/search', { params: { search, page, size } })
      .then((r) => r.data),

  /** Filtres mono-critère du backend (renvoient des listes non paginées). */
  listerParVille: (idVille: number): Promise<Signalement[]> =>
    api.get<Signalement[]>(`/signalements/ville/${idVille}`).then((r) => r.data),

  listerParStatut: (idStatut: number): Promise<Signalement[]> =>
    api.get<Signalement[]>(`/signalements/statut/${idStatut}`).then((r) => r.data),

  listerParType: (idType: number): Promise<Signalement[]> =>
    api.get<Signalement[]>(`/signalements/type/${idType}`).then((r) => r.data),

  trouverParId: (id: string): Promise<Signalement> =>
    api.get<Signalement>(`/signalements/${id}`).then((r) => r.data),

  /** Géométrie du constat (GeoJSON PostGIS) — liste (0 ou 1 élément). */
  geometrie: (id: string): Promise<GeometrieDTO[]> =>
    api.get<GeometrieDTO[]>(`/signalements/${id}/geometrie`).then((r) => r.data),

  /** Parcelle rattachée (détail enrichi : superficie, propriété, ville). */
  parcelle: (idParcelle: string): Promise<Parcelle> =>
    api.get<Parcelle>(`/parcelles/${idParcelle}`).then((r) => r.data),

  /** Photos du constat (entite_type='signalement'). */
  photos: (idSignalement: string): Promise<PhotoDTO[]> =>
    api.get<PhotoDTO[]>('/photos', { params: { entiteType: 'signalement', entiteId: idSignalement } })
      .then((r) => r.data),

  statistiques: (): Promise<StatistiquesSignalement> =>
    api.get<StatistiquesSignalement>('/signalements/stats').then((r) => r.data),

  // ── CRUD ──
  creer: (request: SignalementRequest): Promise<Signalement> =>
    api.post<Signalement>('/signalements', request).then((r) => r.data),

  modifier: (id: string, request: SignalementRequest): Promise<Signalement> =>
    api.put<Signalement>(`/signalements/${id}`, request).then((r) => r.data),

  /** Validation / changement de statut (POST /{id}/traitement côté backend). */
  traiter: (id: string, request: SignalementTraitementRequest): Promise<Signalement> =>
    api.post<Signalement>(`/signalements/${id}/traitement`, request).then((r) => r.data),

  supprimer: (id: string) =>
    api.delete(`/signalements/${id}`),

  // ── Historique (audit) ──
  historique: (id: string): Promise<SignalementAudit[]> =>
    api.get<SignalementAudit[]>(`/signalements/${id}/historique`).then((r) => r.data),
};

export default signalementService;
