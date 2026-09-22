import api from './api';
import type { EntiteCible, GeometrieCarte } from '../types';

// ══════════════════════════════════════════════════════════════
// Carte interactive (module 4.6.1) — géométries PostGIS
// ══════════════════════════════════════════════════════════════

export interface GeometrieCreateRequest {
  typeGeometrie: 'Point' | 'Polygon' | 'LineString';
  geojson: string;
  entiteType: 'parcelle' | 'propriete' | 'dossier_parcelle';
  entiteId: string;
  superficieCalculeeM2?: number;
  remplacer?: boolean;
  source?: string;
}

export interface CoordonneesPoint {
  x: number;
  y: number;
}

export interface CoordonneesRequest {
  typeGeometrie: 'Point' | 'Polygon' | 'LineString';
  points: CoordonneesPoint[];
  entiteType: 'parcelle' | 'propriete' | 'dossier_parcelle';
  entiteId: string;
  /** true : paires X Y Laborde (conversion PostGIS) ; false : WGS84. */
  laborde: boolean;
  /** WGS84 : true si les paires sont lon,lat (défaut lat,lon). */
  lonLat?: boolean;
  remplacer?: boolean;
  source?: string;
}

export interface EntitesCiblesParams {
  type: 'propriete' | 'parcelle';
  /** Filtre sur le nom / numéro / lieu / propriété rattachée. */
  recherche?: string;
  /** true : renvoie aussi les entités déjà localisées (drapeau `localisee`). */
  inclureLocalisees?: boolean;
  limite?: number;
}

export const geometrieService = {
  /** Toutes les géométries (points, polygones, lignes) + libellés d'entités. */
  lister: (): Promise<GeometrieCarte[]> =>
    api.get<GeometrieCarte[]>('/geometries').then((r) => r.data),

  /**
   * Entités à localiser sur la carte (propriétés / parcelles). Par défaut seules
   * celles sans géométrie remontent — celles déjà localisées sont signalées par
   * le drapeau `localisee` quand `inclureLocalisees` est vrai.
   */
  entitesCibles: (params: EntitesCiblesParams): Promise<EntiteCible[]> =>
    api.get<EntiteCible[]>('/geometries/entites-cibles', {
      params: {
        type: params.type,
        search: params.recherche ?? '',
        inclureLocalisees: params.inclureLocalisees ?? false,
        limite: params.limite ?? 40,
      },
    }).then((r) => r.data),

  /** Détail d'une géométrie. */
  trouverParId: (id: string): Promise<GeometrieCarte> =>
    api.get<GeometrieCarte>(`/geometries/${id}`).then((r) => r.data),

  /** Enregistre un tracé manuel (dessin sur la carte). */
  enregistrer: (request: GeometrieCreateRequest): Promise<GeometrieCarte> =>
    api.post<GeometrieCarte>('/geometries', request).then((r) => r.data),

  /** Enregistre une géométrie saisie en coordonnées (Laborde ou WGS84). */
  enregistrerCoordonnees: (request: CoordonneesRequest): Promise<GeometrieCarte> =>
    api.post<GeometrieCarte>('/geometries/coordonnees', request).then((r) => r.data),
};
