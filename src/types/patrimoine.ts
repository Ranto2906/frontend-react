export interface Ville {
  idVille: number;
  nomVille: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PrixM2 {
  idPrix: number;
  prixTtc: number;
  prixHt?: number;
  observation?: string;
  dateMaj: string;
  idVille: number;
  nomVille?: string;
}

export interface Propriete {
  idPropriete: number;
  nom: string;
  numero?: string;
  zone?: string;
  localisation?: string;
  superficieTotale?: number;
  idVille?: number;
  nomVille?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Parcelle {
  idParcelle: string;
  numeroLot?: string;
  superficieM2?: number;
  observation?: string;
  idPropriete: number;
  numeroPropriete?: string;
  /** Champs enrichis (détail parcelle — renvoyés par le backend). */
  nomPropriete?: string;
  zonePropriete?: string;
  localisationPropriete?: string;
  nomVille?: string;
  idUtilisateurCreation?: number;
  createdAt?: string;
  updatedAt?: string;
}
