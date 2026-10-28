// ══════════════════════════════════════════════════════════════
// Descente terrain — miroir des DTO Spring Boot
// (com.seimad.patrimoine.dto.descente.*)
// ══════════════════════════════════════════════════════════════

/**
 * Statuts de constat relevés sur le terrain (valeurs du mobile).
 * Référentiel V38 : les anciens constats (Conforme / Non conforme /
 * En attente / Occupation illicite / Construction illegale) sont retirés.
 */
export type StatutConstatDescente =
  | 'Faisable'
  | 'Non faisable'
  | 'Sous réserve';

/** États de validation de la descente par l'administration. */
export type StatutValidationDescente =
  | 'Bon pour la suite'
  | 'En instance';

export const STATUTS_CONSTAT: StatutConstatDescente[] = [
  'Faisable',
  'Non faisable',
  'Sous réserve',
];

export const STATUTS_VALIDATION: StatutValidationDescente[] = [
  'Bon pour la suite',
  'En instance',
];

import type { DemandeDossier } from './dossier';

/** Miroir de DescenteTerrainDTO (GET/POST/PUT /api/descentes-terrain). */
export interface DescenteTerrainDTO {
  idDescente: string;
  reference?: string;
  dateDescente?: string;
  statutConstat: string;
  observation?: string;
  mode: string;
  validation: string;
  dateValidation?: string;
  synchronise?: boolean;
  createdAt?: string;
  dateModification?: string;

  // Utilisateur création
  idUtilisateurCreation?: number;
  nomUtilisateurCreation?: string;

  // Utilisateur validation
  idUtilisateurValidation?: number;
  nomUtilisateurValidation?: string;

  // Personne (demandeur)
  idPersonne?: number;
  nomPersonne?: string;
  contactPersonne?: string;

  // DossierParcelle → Dossier
  idDossierParcelle?: string;
  idDossier?: number;
  numeroDossier?: string;

  // DossierParcelle → Propriete
  idPropriete?: number;
  numeroPropriete?: string;

  // DossierParcelle → Parcelle
  idParcelle?: string;
  numeroLot?: string;

  // Superficie
  superficieM2?: number;

  // Ville (depuis le dossier)
  idVille?: number;
  nomVille?: string;

  /** Dossier complet (statut, type, dates, montant, demandeurs, parcelles, suivi) —
   *  peuplé uniquement par GET /api/descentes-terrain/{id}. */
  dossier?: DemandeDossier;
}

/** Corps d'écriture (POST/PUT /api/descentes-terrain). */
export interface DescenteTerrainRequest {
  reference?: string;
  /** ISO yyyy-MM-dd — obligatoire. */
  dateDescente: string;
  /** Obligatoire. */
  statutConstat: string;
  observation?: string;
  /** 'online' | 'offline'. */
  mode?: string;
  validation?: string;
  idUtilisateurCreation?: number;
  idPersonne?: number;
  idDossierParcelle?: string;
}

/** Une ligne dossier_parcelle retournée par /dossiers/search. */
export interface DossierDescenteResult {
  idDossierParcelle: string;
  numeroDossier?: string;
  /** Date de demande du dossier (ISO yyyy-MM-dd). */
  dateDemande?: string;
  superficie?: number;
  parcelle?: string;
  ville?: string;
  propriete?: string;
  demandeurId?: number;
  demandeurNom?: string;
  demandeurContact?: string;
}

/**
 * Un changement de statut — GET /api/descentes-terrain/{id}/historique-statuts.
 * `ancienStatut` est absent sur l'état initial (création de la descente).
 */
export interface DescenteStatutHistorique {
  /** 'statutConstat' (constat sur le terrain) ou 'validation' (administrative). */
  champ: 'statutConstat' | 'validation' | string;
  /** Libellé français : « Statut du constat » / « Validation ». */
  libelleChamp: string;
  ancienStatut?: string | null;
  nouveauStatut: string;
  /** Date de modification (ISO). */
  dateModification?: string;
  action?: string;
  nomUtilisateur?: string;
}

/** GET /api/descentes-terrain/stats. */
export interface StatistiquesDescente {
  total: number;
}
