export interface DocumentDossier {
  idDocument: number;
  nomFichier: string;
  cheminFichier: string;
  typeDocument?: string;
  tailleOctets?: number;
  dateUpload?: string;
  idUtilisateur?: number;
  idDossier: number;
}

export interface DocumentDemandeur {
  idDocument: number;
  nomFichier: string;
  cheminFichier?: string;
  typeDocument: string;
  tailleOctets?: number;
  dateUpload?: string;
  idUtilisateur?: number;
  idPersonne: number;
}

export interface Alerte {
  idAlerte: number;
  message: string;
  dateEnvoi?: string;
  type?: string;
  destinataire?: string;
  lu: boolean;
  dateLecture?: string;
  idDossier?: number;
}

export interface VueRecouvrement {
  idLigne: string;
  nomVille: string;
  annee: number;
  nbDossiers: number;
  montantTotal: number;
}
