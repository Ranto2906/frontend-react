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
  idDemandeur: number;
  role: string;
  dateAjout?: string;
  demandeur?: Demandeur;
}

export interface Demandeur {
  idDemandeur: number;
  nomPrenom: string;
  contact?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
}

export interface DossierParcelleDTO {
  idDossierParcelle: string;
  idDossier: number;
  idTitreFoncier: string;
  idParcelle?: string;
  superficieM2?: number;
  valeurDemandeTtc?: number;
  valeurDemandeHt?: number;
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
