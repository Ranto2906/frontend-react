export interface NotificationOccupation {
  idNotification: string;
  dateNotification?: string;
  annee?: number;
  dateConvocation?: string;
  informationsOccupants?: string;
  constats?: string;
  doleances?: string;
  actionsEntreprises?: string;
  statut: string;
  idParcelle?: string;
  idTitreFoncier: string;
  createdAt?: string;
}

export interface Avertissement {
  idAvertissement: string;
  dateAvertissement?: string;
  annee?: number;
  informationsOccupants?: string;
  constats?: string;
  actionsEntreprises?: string;
  aFaire?: string;
  mission?: string;
  idPersonne?: number;
  idParcelle?: string;
  idTitreFoncier: string;
  createdAt?: string;
}

export interface Personne {
  idPersonne: number;
  nom: string;
  contact?: string;
  adresse?: string;
  email?: string;
  date?: string;
  role?: string;
}

export interface CreatePersonneRequest {
  nom: string;
  contact?: string;
  email?: string;
  adresse?: string;
  role?: string;
}

export interface UpdatePersonneRequest {
  nom?: string;
  contact?: string;
  email?: string;
  adresse?: string;
  role?: string;
}

export interface DescenteTerrain {
  idDescente: string;
  reference?: string;
  dateDescente?: string;
  statutConstat: string;
  observation?: string;
  mode: 'online' | 'offline';
  validation: string;
  dateValidation?: string;
  synchronise: boolean;
  createdAt?: string;
  dateModification?: string;
  idUtilisateurCreation: number;
  idUtilisateurValidation?: number;
  idDemandeur: number;
  idDossierParcelle: string;
  demandeurNom?: string;
  demandeurContact?: string;
  dossierNumero?: string;
  dossierSuperficie?: number;
  dossierParcelle?: string;
  dossierVille?: string;
}

export interface Geometrie {
  idGeometrie: string;
  entiteType: string;
  entiteId: string;
  typeGeometrie: 'Point' | 'Polygon' | 'LineString';
  geom: string;
  precisionM?: number;
  superficieCalculeeM2?: number;
  source: string;
  idUtilisateur: number;
  dateCreation?: string;
  dateModification?: string;
}
