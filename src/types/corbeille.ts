// ══════════════════════════════════════════════════════════════
// Corbeille — éléments supprimés (restauration / purge)
// ══════════════════════════════════════════════════════════════

/** Ligne conservée dans une entrée de corbeille. */
export interface CorbeilleElementDTO {
  entite: string;
  table: string;
  idEntite?: string | null;
  libelle?: string | null;
}

/** Une entrée = une opération de suppression (parent + lignes liées). */
export interface CorbeilleDTO {
  id: number;
  entite: string;
  entiteLibelle: string;
  libelle?: string | null;
  elements: number;
  supprimePar?: string | null;
  supprimeLe?: string | null;
  contenu?: CorbeilleElementDTO[];
}

/** Nombre d'entrées par type d'élément. */
export interface CorbeilleStatistique {
  entite: string;
  entiteLibelle: string;
  total: number;
}
