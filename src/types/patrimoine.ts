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
  idVille?: number;
  nomVille?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TitreFoncier {
  idTitreFoncier: string;
  numero: string;
  typeTitre: string;
  zone?: string;
  localisation?: string;
  superficieTotale?: number;
  idPropriete: number;
  nomPropriete?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Parcelle {
  idParcelle: string;
  numeroLot?: string;
  superficieM2?: number;
  observation?: string;
  idTitreFoncier: string;
  numeroTitre?: string;
  idUtilisateurCreation?: number;
  createdAt?: string;
  updatedAt?: string;
}
