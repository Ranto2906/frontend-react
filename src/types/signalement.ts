export interface Signalement {
  idSignalement: string;
  reference?: string;
  description?: string;
  dateSignalement?: string;
  idTypeSignalement: number;
  idStatutSignalement?: number;
  idVille?: number;
  idTitreFoncier?: string;
  idParcelle?: string;
  commentaireTraitement?: string;
  dateTraitement?: string;
}

export interface TypeSignalement {
  idTypeSignalement: number;
  code: string;
  libelle: string;
  couleur?: string;
}

export interface StatutSignalement {
  idStatutSignalement: number;
  code: string;
  libelle: string;
  couleurHex: string;
  estFinal: boolean;
  ordre?: number;
}
