// ══════════════════════════════════════════════════════════════
// Descente terrain — miroir des DTO Spring Boot
// (com.seimad.patrimoine.dto.descente.*)
// ══════════════════════════════════════════════════════════════

/** Statuts de constat relevés sur le terrain (valeurs du mobile). */
export type StatutConstatDescente =
  | 'Conforme'
  | 'Non conforme'
  | 'En attente'
  | 'Occupation illicite'
  | 'Construction illegale';

/** États de validation de la descente par l'administration. */
export type StatutValidationDescente =
  | 'Bon pour la suite'
  | 'En instance';

export const STATUTS_CONSTAT: StatutConstatDescente[] = [
  'Conforme',
  'Non conforme',
  'En attente',
  'Occupation illicite',
  'Construction illegale',
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

/** GET /api/descentes-terrain/stats. */
export interface StatistiquesDescente {
  total: number;
}
