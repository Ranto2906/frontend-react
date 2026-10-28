import type { Personne } from './suivi';

// ════════════════════════════════════════════════════════════
// Types du module Suivi de Dossier
// ════════════════════════════════════════════════════════════

// ── Types hérités (conservés pour compatibilité) ──

export interface Dossier {
  idDossier: number;
  numeroDossier: string;
  dateDemande?: string;
  annee?: number;
  transmission?: string;
  resultatEtude?: string;
  observation?: string;
  dateCreation: string;
  dateModification: string;
  dateValidation?: string;
  montantTotal: number;
  idStatutDossier?: number;
  statutCode?: string;
  statutLibelle?: string;
  statutCouleur?: string;
  idVille: number;
  nomVille?: string;
  demandeurs?: DossierDemandeurDTO[];
  parcelles?: DossierParcelleDTO[];
  suivis?: SuiviDossierDTO[];
}

export interface DossierDemandeurDTO {
  idDossier: number;
  idPersonne: number;
  role: string;
  dateAjout?: string;
  personne?: Personne;
}

export interface DossierParcelleDTO {
  idDossierParcelle: string;
  idDossier: number;
  idTitreFoncier: string;
  idParcelle?: string;
  superficieM2?: number;
  observation?: string;
  coordonneeX?: number;
  coordonneeY?: number;
  dateAjout?: string;
  numeroLot?: string;
  numeroTitre?: string;
}

export interface Etape {
  idEtape: number;
  codeEtape: string;
  libelle: string;
  ordre: number;
  dureePrevisionnelle?: number;
}

export interface EtapeRequest {
  codeEtape?: string;
  libelle: string;
  ordre: number;
  dureePrevisionnelle?: number;
}

export interface StatutDossier {
  idStatutDossier: number;
  code: string;
  libelle: string;
  couleurHex: string;
  estFinal: boolean;
  ordre?: number;
}

export interface StatutCouleur {
  idStatutCouleur: number;
  code: string;
  libelle: string;
  couleurHex: string;
}

export interface SuiviDossierDTO {
  idSuivi: number;
  dateRealisation?: string;
  idStatutCouleur?: number;
  codeCouleur?: string;
  couleurHex?: string;
  commentaire?: string;
  dateCreation?: string;
  idUtilisateur?: number;
  nomUtilisateur?: string;
  idDossier: number;
  idEtape: number;
  codeEtape?: string;
  libelleEtape?: string;
}

// ── Types du module (DTO backend /api/dossiers) ──

export interface DemandeDossier {
  idDossier: number;
  numeroDossier: string;
  dateDemande?: string | null;
  annee?: number | null;
  transmission?: string | null;
  resultatEtude?: string | null;
  observation?: string | null;
  lieu?: string | null;
  dateCreation?: string;
  dateModification?: string;
  dateValidation?: string | null;
  montantTotal?: string | number | null;
  // Prix au m² figé à l'enregistrement du dossier (snapshot)
  prixM2Ttc?: number | string | null;
  prixM2Ht?: number | string | null;
  // Statut
  idStatutDossier?: number | null;
  codeStatut?: string | null;
  libelleStatut?: string | null;
  couleurStatutHex?: string | null;
  statutFinal?: boolean | null;
  // Type de dossier + dossier fournie
  idTypeDossier?: number | null;
  libelleTypeDossier?: string | null;
  idDossierFournie?: number | null;
  libelleDossierFournie?: string | null;
  // Ville
  idVille: number;
  nomVille?: string;
  // Demandeurs
  demandeurs?: DemandeDossierDemandeur[];
  // Parcelles demandées
  parcelles?: ParcelleDemandee[];
  // Suivi (étapes)
  suivi?: SuiviEtape[];
  // Avancement
  etapeActuelleOrdre?: number | null;
  etapeActuelleLibelle?: string | null;
  nombreEtapesRealisees?: number;
}

export interface DemandeDossierDemandeur {
  idPersonne: number;
  nom: string;
  contact?: string | null;
  email?: string | null;
  adresse?: string | null;
  role?: string | null;
  codeTypePersonne?: string | null;
  libelleTypePersonne?: string | null;
}

export interface ParcelleDemandee {
  idDossierParcelle?: string;
  idPropriete?: number;
  nomPropriete?: string | null;
  numeroPropriete?: string | null;
  libelleLieu?: string | null;
  nomLieu?: string | null;
  idParcelle?: string | null;
  numeroLot?: string | null;
  superficieM2?: number | null;
  observation?: string | null;
}

export interface ParcelleDemandeeRequest {
  idPropriete: number;
  idParcelle?: string;
  superficieM2?: number;
  observation?: string;
}

export interface SuiviEtape {
  idSuivi: number;
  idEtape: number;
  codeEtape: string;
  libelleEtape: string;
  ordreEtape: number;
  dureePrevisionnelle?: number | null;
  dateRealisation?: string | null;
  idStatutCouleur?: number | null;
  codeStatutCouleur?: string | null;
  libelleStatutCouleur?: string | null;
  couleurStatutCouleurHex?: string | null;
  commentaire?: string | null;
  nomUtilisateur?: string | null;
  dateCreation?: string;
  dateModification?: string;
}

export interface DemandeDossierRequest {
  numeroDossier: string;
  dateDemande?: string;
  annee?: number;
  transmission?: string;
  resultatEtude?: string;
  observation?: string;
  lieu?: string;
  dateValidation?: string;
  montantTotal?: number;
  idStatutDossier?: number;
  idTypeDossier?: number;
  /** Texte libre : le backend crée ou réutilise la pièce « dossier_fournie » correspondante. */
  dossierFournieLibelle?: string;
  idVille: number;
  demandeurs?: DemandeDossierDemandeurRequest[];
  parcelles?: ParcelleDemandeeRequest[];
}

export interface DemandeDossierDemandeurRequest {
  idPersonne?: number;
  nom?: string;
  contact?: string;
  email?: string;
  adresse?: string;
  role?: string;
  idTypePersonne?: number;
}

export interface SuiviEtapeRequest {
  idEtape: number;
  dateRealisation?: string;
  idStatutCouleur?: number;
  commentaire?: string;
}

export interface StatistiquesDossier {
  total: number;
  finalises: number;
  enCours: number;
  anneeEnCours: number;
  parStatut: Array<{ statut: string; nombre: number }>;
}
