// ── Signalements — miroir des DTO Spring Boot ──
export interface Signalement {
  idSignalement: string;
  reference?: string;
  description?: string;
  dateSignalement?: string;
  dateModification?: string;

  // Type
  idTypeSignalement?: number;
  codeType?: string;
  libelleType?: string;
  couleurType?: string;

  // Statut
  idStatutSignalement?: number;
  codeStatut?: string;
  libelleStatut?: string;
  couleurStatutHex?: string;
  statutFinal?: boolean;

  // Localisation
  idVille?: number;
  nomVille?: string;

  // Rattachements
  idPropriete?: number;
  numeroPropriete?: string;
  idParcelle?: string;
  numeroLot?: string;

  // Traitement
  commentaireTraitement?: string;
  dateTraitement?: string;
  idUtilisateurTraitement?: number;
  nomUtilisateurTraitement?: string;

  // Dossier
  idDossier?: number;
  numeroDossier?: string;

  idUtilisateurCreation?: number;
  nomUtilisateurCreation?: string;
}

export interface TypeSignalement {
  idTypeSignalement: number;
  code?: string;
  libelle: string;
  couleur?: string;
}

export interface StatutSignalement {
  idStatutSignalement: number;
  code?: string;
  libelle: string;
  couleurHex?: string;
  estFinal?: boolean;
  ordre?: number;
}

// ── Requests ──
export interface SignalementRequest {
  reference?: string;
  description?: string;
  dateSignalement?: string;
  idTypeSignalement: number;
  idStatutSignalement?: number;
  idVille?: number;
  idPropriete?: number;
  idParcelle?: string;
  idDossier?: number;
}

export interface SignalementTraitementRequest {
  idStatutSignalement: number;
  commentaireTraitement?: string;
  idUtilisateurTraitement?: number;
}

// ── Historique (audit — mêmes valeurs que le backend trace) ──
export interface SignalementAudit {
  idAudit?: number;
  entiteType?: string;
  entiteId?: string;
  action?: string;
  anciennesValeurs?: string;
  nouvellesValeurs?: string;
  dateAction?: string;
  ipAdresse?: string;
  idUtilisateur?: number;
  nomUtilisateur?: string;
}

export interface StatistiquesSignalement {
  total?: number;
  parStatut?: Record<string, number>;
  parType?: Record<string, number>;
}
