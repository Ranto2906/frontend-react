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
  createdAt?: string;
  // Référentiels
  idParcelle?: string;
  numeroLot?: string;
  idTitreFoncier?: string;
  numeroTitre?: string;
  // Personnes associées
  personnes?: NotificationPersonne[];
}

export interface NotificationPersonne {
  idNotification?: string;
  idPersonne: number;
  nomPersonne?: string;
  roleDansNotification?: string;
  contact?: string;
}

export interface NotificationPersonneRequest {
  idPersonne: number;
  roleDansNotification?: string;
}

export interface NotificationOccupationRequest {
  dateNotification?: string;
  annee?: number;
  dateConvocation?: string;
  informationsOccupants?: string;
  constats?: string;
  doleances?: string;
  actionsEntreprises?: string;
  statut: string;
  idParcelle: string;
  idTitreFoncier: string;
  personnes?: NotificationPersonneRequest[];
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
  createdAt?: string;
  // Relations
  idParcelle?: string;
  numeroLot?: string;
  idTitreFoncier?: string;
  numeroTitre?: string;
  // Personne associée
  idPersonne?: number;
  nomPersonne?: string;
}

export interface SuiviNotification {
  idSuivi: string;
  ordre?: number;
  dateSuivi?: string;
  constats?: string;
  actionsASuivre?: string;
  // Notification liée
  idNotification?: string;
  numeroTitre?: string;
  numeroLot?: string;
  dateNotification?: string;
  statut?: string;
}

export interface SuiviNotificationRequest {
  idNotification?: string;
  ordre?: number;
  dateSuivi?: string;
  constats?: string;
  actionsASuivre?: string;
}

export interface AvertissementRequest {
  dateAvertissement?: string;
  annee?: number;
  informationsOccupants?: string;
  constats?: string;
  actionsEntreprises?: string;
  aFaire?: string;
  mission?: string;
  idPersonne: number;
  idParcelle: string;
  idTitreFoncier: string;
}

export interface TypePersonne {
  idTypePersonne: number;
  code: string;
  libelle: string;
}

export interface Personne {
  idPersonne: number;
  nom: string;
  contact?: string;
  adresse?: string;
  email?: string;
  date?: string;
  role?: string;
  // Type personne (référentiel)
  idTypePersonne?: number;
  codeTypePersonne?: string;
  libelleTypePersonne?: string;
}

export interface CreatePersonneRequest {
  nom: string;
  contact?: string;
  email?: string;
  adresse?: string;
  role?: string;
  idTypePersonne?: number;
}

export interface UpdatePersonneRequest {
  nom?: string;
  contact?: string;
  email?: string;
  adresse?: string;
  role?: string;
  idTypePersonne?: number;
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
  idPersonne: number;
  idDossierParcelle: string;
  personneNom?: string;
  personneContact?: string;
  dossierNumero?: string;
  dossierSuperficie?: number;
  dossierParcelle?: string;
  dossierVille?: string;
}

export interface ImportExcelResult {
  notificationsImportees: number;
  avertissementsImportes: number;
  personnesCrees: number;
  personnesReutilisees: number;
  titresFonciersCrees: number;
  parcellesCrees: number;
  suivisCrees: number;
  photosImportees: number;
  lignesIgnorees: number;
  erreurs: string[];
}

export interface PhotoDTO {
  idPhoto: string;
  entiteType?: string;
  entiteId?: string;
  typePhoto?: string;
  observation?: string;
  datePrise?: string;
  dateCreation?: string;
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
