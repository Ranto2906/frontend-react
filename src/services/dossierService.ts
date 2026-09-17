import api from './api';
import type {
  DemandeDossier,
  DemandeDossierRequest,
  DemandeDossierDemandeurRequest,
  SuiviEtape,
  SuiviEtapeRequest,
  Etape,
  EtapeRequest,
  StatutDossier,
  StatutCouleur,
  StatistiquesDossier,
  PageResponse,
  Propriete,
  Parcelle,
} from '../types';

// ════════════════════════════════════════════════════════════
// Dossier Service — suivi de dossier (demandes, demandeurs,
// changements d'étape)
// ════════════════════════════════════════════════════════════

export interface DossierFilters {
  search?: string;
  idStatut?: number;
  idVille?: number;
  annee?: number;
  du?: string; // ISO yyyy-mm-dd
  au?: string;
}

export const dossierService = {
  // ── Référentiels ──
  listerEtapes: (): Promise<Etape[]> =>
    api.get<Etape[]>('/dossiers/etapes').then((r) => r.data),

  creerEtape: (request: EtapeRequest): Promise<Etape> =>
    api.post<Etape>('/dossiers/etapes', request).then((r) => r.data),

  modifierEtape: (id: number, request: EtapeRequest): Promise<Etape> =>
    api.put<Etape>(`/dossiers/etapes/${id}`, request).then((r) => r.data),

  supprimerEtapeReferentiel: (id: number) =>
    api.delete(`/dossiers/etapes/${id}`),

  listerStatuts: (): Promise<StatutDossier[]> =>
    api.get<StatutDossier[]>('/dossiers/statuts').then((r) => r.data),

  listerStatutsCouleur: (): Promise<StatutCouleur[]> =>
    api.get<StatutCouleur[]>('/dossiers/statuts-couleur').then((r) => r.data),

  // ── Référentiels du formulaire (propriétés / parcelles / prix) ──
  listerProprietes: (idVille?: number, search?: string): Promise<Propriete[]> => {
    if (search) {
      // Recherche serveur puis filtre ville côté client
      return api.get<Propriete[]>('/proprietes/search', { params: { search } })
        .then((r) => r.data)
        .then((list) => (idVille ? list.filter((p) => p.idVille === idVille) : list));
    }
    if (idVille) {
      return api.get<Propriete[]>(`/proprietes/ville/${idVille}`).then((r) => r.data);
    }
    return api.get<PageResponse<Propriete>>('/proprietes', { params: { page: 0, size: 200, sort: 'nom,asc' } })
      .then((r) => r.data.content);
  },

  listerParcellesPropriete: (idPropriete: number): Promise<Parcelle[]> =>
    api.get<Parcelle[]>(`/parcelles/propriete/${idPropriete}`).then((r) => r.data),

  dernierPrixVille: (idVille: number): Promise<{
    idPrix: number;
    prixTtc: number;
    prixHt?: number | null;
    dateMaj?: string;
  }> =>
    api.get(`/dossiers/prix-ville/${idVille}`).then((r) => r.data),

  // ── Liste / recherche ──
  lister: (page = 0, size = 20): Promise<PageResponse<DemandeDossier>> =>
    api.get<PageResponse<DemandeDossier>>('/dossiers', { params: { page, size } })
      .then((r) => r.data),

  rechercher: (filters: DossierFilters, page = 0, size = 20): Promise<PageResponse<DemandeDossier>> =>
    api.get<PageResponse<DemandeDossier>>('/dossiers/search', {
      params: {
        search: filters.search || undefined,
        idStatut: filters.idStatut || undefined,
        idVille: filters.idVille || undefined,
        annee: filters.annee || undefined,
        du: filters.du || undefined,
        au: filters.au || undefined,
        page,
        size,
      },
    }).then((r) => r.data),

  trouverParId: (id: number): Promise<DemandeDossier> =>
    api.get<DemandeDossier>(`/dossiers/${id}`).then((r) => r.data),

  // ── CRUD ──
  creer: (request: DemandeDossierRequest): Promise<DemandeDossier> =>
    api.post<DemandeDossier>('/dossiers', request).then((r) => r.data),

  modifier: (id: number, request: DemandeDossierRequest): Promise<DemandeDossier> =>
    api.put<DemandeDossier>(`/dossiers/${id}`, request).then((r) => r.data),

  supprimer: (id: number) =>
    api.delete(`/dossiers/${id}`),

  // ── Suivi : changement d'étape ──
  enregistrerEtape: (idDossier: number, request: SuiviEtapeRequest): Promise<SuiviEtape> =>
    api.post<SuiviEtape>(`/dossiers/${idDossier}/suivi`, request).then((r) => r.data),

  supprimerEtape: (idDossier: number, idSuivi: number) =>
    api.delete(`/dossiers/${idDossier}/suivi/${idSuivi}`),

  // ── Historique du suivi ──
  historique: (idDossier: number): Promise<SuiviEtape[]> =>
    api.get<SuiviEtape[]>(`/dossiers/${idDossier}/historique`).then((r) => r.data),

  // ── Statistiques ──
  statistiques: (): Promise<StatistiquesDossier> =>
    api.get<StatistiquesDossier>('/dossiers/stats').then((r) => r.data),

  // ── Demandeurs (personnes type DEMANDEUR) ──
  rechercherDemandeurs: (nom: string): Promise<Array<{
    idPersonne: number;
    nom: string;
    contact?: string | null;
    email?: string | null;
  }>> =>
    api.get('/personnes/search/nom', { params: { nom } }).then((r) => r.data),
};

export type { DemandeDossierDemandeurRequest };
export default dossierService;
