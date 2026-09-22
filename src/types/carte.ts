// ══════════════════════════════════════════════════════════════
// Carte interactive (module 4.6.1)
// ══════════════════════════════════════════════════════════════

/**
 * Géométrie affichable sur la carte — miroir de GeometrieCarteDTO backend.
 * Le champ `geojson` est régénéré depuis PostGIS (ST_AsGeoJSON).
 */
export interface GeometrieCarte {
  idGeometrie: string;
  entiteType: 'parcelle' | 'propriete' | 'dossier_parcelle' | 'signalement' | 'descente_terrain';
  entiteId: string;
  typeGeometrie: 'Point' | 'Polygon' | 'LineString';
  geojson: string;
  precisionM?: number;
  superficieCalculeeM2?: number;
  source?: string;
  dateCreation?: string;
  dateModification?: string;
  utilisateur?: string;
  libelleEntite?: string;
  /** Parcelle de dossier : le dossier porteur est-il clôturé (statut final) ? */
  dossierCloture?: boolean | null;
  /** Propriété liée à un dossier via dossier_parcelle (couche orange). */
  lieeADossier?: boolean | null;
}

/**
 * Entité ciblable depuis la carte pour lui définir un emplacement :
 * une propriété (id entier) ou une parcelle (UUID). `localisee` indique si une
 * géométrie lui est déjà rattachée — les entités sans géométrie sont celles à
 * placer sur la carte.
 */
export interface EntiteCible {
  id: string;
  libelle: string;
  details?: string;
  type: 'propriete' | 'parcelle';
  localisee?: boolean;
}

/** Entité sélectionnée comme cible d'un tracé ou d'une saisie de coordonnées. */
export interface EntiteSelectionnee {
  type: 'propriete' | 'parcelle' | 'dossier_parcelle';
  id: string;
  label: string;
}

/** Couche de la carte : catégorie d'entités activable/désactivable. */
export interface CoucheCarte {
  /** Clé de couche (entiteType, 'dossier_cloture' ou 'propriete_dossier'). */
  key: 'propriete' | 'propriete_dossier' | 'dossier_cloture' | 'parcelle' | 'dossier_parcelle' | 'signalement' | 'descente_terrain';
  /** Libellé affiché dans la légende. */
  label: string;
  /** Couleur de la couche (trait + remplissage). */
  couleur: string;
  /** Élément HTML de la légende (point, carré, triangle). */
  forme: 'cercle' | 'carre' | 'triangle';
}
