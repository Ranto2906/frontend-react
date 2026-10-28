import api from './api';
import type {
  DescenteTerrainDTO,
  DescenteTerrainRequest,
  DescenteStatutHistorique,
  DossierDescenteResult,
  StatistiquesDescente,
  PageResponse,
} from '../types';

/**
 * API des descentes terrain (`/api/descentes-terrain`).
 * Le backend filtre par un seul critère de recherche textuelle — les filtres
 * affinés (statut, validation, dates) sont appliqués côté client sur la page.
 */
export const descenteTerrainService = {
  lister: (page = 0, size = 20): Promise<PageResponse<DescenteTerrainDTO>> =>
    api.get<PageResponse<DescenteTerrainDTO>>('/descentes-terrain', { params: { page, size } })
      .then((r) => r.data),

  rechercher: (search: string, page = 0, size = 20): Promise<PageResponse<DescenteTerrainDTO>> =>
    api.get<PageResponse<DescenteTerrainDTO>>('/descentes-terrain/search', { params: { search, page, size } })
      .then((r) => r.data),

  trouverParId: (id: string): Promise<DescenteTerrainDTO> =>
    api.get<DescenteTerrainDTO>(`/descentes-terrain/${id}`).then((r) => r.data),

  creer: (request: DescenteTerrainRequest): Promise<DescenteTerrainDTO> =>
    api.post<DescenteTerrainDTO>('/descentes-terrain', request).then((r) => r.data),

  modifier: (id: string, request: DescenteTerrainRequest): Promise<DescenteTerrainDTO> =>
    api.put<DescenteTerrainDTO>(`/descentes-terrain/${id}`, request).then((r) => r.data),

  supprimer: (id: string) => api.delete(`/descentes-terrain/${id}`),

  statistiques: (): Promise<StatistiquesDescente> =>
    api.get<StatistiquesDescente>('/descentes-terrain/stats').then((r) => r.data),

  /** Historique des changements de statut (constat + validation), ordre chronologique. */
  historiqueStatuts: (id: string): Promise<DescenteStatutHistorique[]> =>
    api.get<DescenteStatutHistorique[]>(`/descentes-terrain/${id}/historique-statuts`)
      .then((r) => r.data),

  /** Recherche de dossiers pour rattacher une descente (autocomplete). */
  rechercherDossiers: (q: string): Promise<DossierDescenteResult[]> =>
    api.get<DossierDescenteResult[]>('/descentes-terrain/dossiers/search', { params: { q } })
      .then((r) => r.data),

  /** Fiche PDF de la descente (constat + photos, signature agent). */
  exporterPdf: (id: string): Promise<Blob> =>
    api.get(`/descentes-terrain/${id}/pdf`, { responseType: 'blob' }).then((r) => r.data),
};

export default descenteTerrainService;
