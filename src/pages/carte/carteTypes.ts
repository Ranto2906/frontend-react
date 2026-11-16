import type L from 'leaflet';
import type { CoucheCarte, EntiteSelectionnee, GeometrieCarte } from '../../types';

export type ModeDessin = 'aucun' | 'point' | 'polygone';
export type FormatSaisi = 'auto' | 'laborde' | 'latlon' | 'lonlat';

export interface CoordPoint {
  x: number;
  y: number;
}

export interface SommetCoord {
  lat: number;
  lon: number;
}

export interface CoordonneesGeom {
  sommets: SommetCoord[];
  centre: SommetCoord | null;
}

export interface PanneauDessinProps {
  modeDessin: ModeDessin;
  pointsDessin: L.LatLng[];
  superficieDessin: number | null;
  entiteSelectionnee: EntiteSelectionnee | null;
  remplacer: boolean;
  onDemarrer: (mode: ModeDessin) => void;
  onAnnuler: () => void;
  onEntiteChange: (selection: EntiteSelectionnee | null) => void;
  onEntiteCreee: (selection: EntiteSelectionnee) => void;
  onRemplacerChange: (remplacer: boolean) => void;
  onEnregistrer: () => void;
}

export interface RechercheCarteProps {
  geometries: GeometrieCarte[];
  filtreType: string;
  recherche: string;
  rechercheOuverte: boolean;
  onFiltreTypeChange: (filtre: string) => void;
  onRechercheChange: (recherche: string) => void;
  onRechercheOuverteChange: (ouverte: boolean) => void;
  onChoisirResultat: (geometrie: GeometrieCarte) => void;
}

export interface GestionCouchesProps {
  couchesActives: Record<string, boolean>;
  totalParCouche: Record<string, number>;
  onActiver: (key: string) => void;
}

export const COUCHES: CoucheCarte[] = [
  { key: 'propriete', label: 'Propriétés', couleur: '#2563eb', forme: 'cercle' },
  { key: 'propriete_dossier', label: 'Propriétés liées à un dossier', couleur: '#f59e0b', forme: 'cercle' },
  { key: 'dossier_cloture', label: 'Dossiers clôturés', couleur: '#dc2626', forme: 'triangle' },
  { key: 'parcelle', label: 'Parcelles', couleur: '#16a34a', forme: 'carre' },
  { key: 'dossier_parcelle', label: 'Parcelles de dossier', couleur: '#f59e0b', forme: 'carre' },
  { key: 'signalement', label: 'Signalements', couleur: '#a13a2c', forme: 'cercle' },
  { key: 'descente_terrain', label: 'Descentes terrain', couleur: '#7c3aed', forme: 'cercle' },
];
