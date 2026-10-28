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

export interface Lieu {
  idLieu: number;
  libelle: string;
  idVille: number;
  nomVille?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProprieteType {
  idTypePropriete: number;
  libelle: string;
}

export interface Propriete {
  idPropriete: number;
  nom: string;
  numero?: string;
  zone?: string;
  localisation?: string;
  superficieTotale?: number;
  typePropriete?: ProprieteType;
  idLieu?: number;
  libelleLieu?: string;
  idVille?: number;
  nomVille?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Dossier rattaché à une propriété (tableau du détail propriété). */
export interface DossierLiePropriete {
  idDossier: number;
  numeroDossier: string;
  demandeur?: string;
  superficieM2?: number;
}

/** Occupation d'une propriété par les dossiers + superficie restante. */
export interface ProprieteOccupation {
  idPropriete: number;
  superficieTotale?: number;
  superficieUtilisee: number;
  superficieRestante?: number;
  /** false quand le reste vaut 0 : plus aucune demande possible. */
  disponible: boolean;
  dossiers: DossierLiePropriete[];
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
