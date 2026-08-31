// ── Auth ──
export interface LoginRequest {
  nomUtilisateur: string;
  motDePasse: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  utilisateur: UtilisateurDTO;
}

export interface UtilisateurDTO {
  idUtilisateur: number;
  nomUtilisateur: string;
  nomComplet?: string;
  email?: string;
  actif: boolean;
  statutCompte: string;
  tentativesEchouees?: number;
  dateCreation?: string;
  derniereConnexion?: string;
  roles: RoleDTO[];
}

export interface CreateUtilisateurRequest {
  nomUtilisateur: string;
  nomComplet?: string;
  email?: string;
  motDePasse: string;
  actif?: boolean;
}

export interface UpdateUtilisateurRequest {
  nomUtilisateur?: string;
  nomComplet?: string;
  email?: string;
  motDePasse?: string;
  actif?: boolean;
  statutCompte?: string;
}

export interface ChangePasswordRequest {
  ancienMotDePasse: string;
  nouveauMotDePasse: string;
}

export interface TokenRefreshRequest {
  refreshToken: string;
}

// ── Roles & Permissions ──
export interface RoleDTO {
  idRole: number;
  nomRole: string;
  description?: string;
}

export interface CreateRoleRequest {
  nomRole: string;
  description?: string;
}

export interface PermissionDTO {
  idPermission: number;
  codeModule: string;
  libelleModule: string;
  codeEntite: string;
  libelleEntite: string;
  codeAction: string;
}

export interface RoleWithPermissionsDTO {
  idRole: number;
  nomRole: string;
  description?: string;
  permissions: PermissionDTO[];
}

// ── Audit ──
export interface AuditDTO {
  idAudit: number;
  entiteType: string;
  entiteId: string;
  action?: string;
  anciennesValeurs?: string;
  nouvellesValeurs?: string;
  dateAction?: string;
  ipAdresse?: string;
  idUtilisateur?: number;
  nomUtilisateur?: string;
}

// ── RBAC Referentiels ──
export interface ModuleRBAC {
  idModule: number;
  codeModule: string;
  libelle: string;
}

export interface EntiteRBAC {
  idEntite: number;
  codeEntite: string;
  libelle: string;
  codeModule: string;
}

export interface ActionRBAC {
  idAction: number;
  codeAction: string;
}

// ── Sessions ──
export interface SessionDTO {
  idSession: number;
  userAgent?: string;
  ipAdresse?: string;
  dateCreation?: string;
  dateExpiration?: string;
  revoque: boolean;
  idUtilisateur?: number;
  nomUtilisateur?: string;
}

// ── Journal ──
export interface JournalConnexionDTO {
  idJournal: number;
  dateConnexion?: string;
  ipAdresse?: string;
  succes: boolean;
  idUtilisateur?: number;
  nomUtilisateur?: string;
}

// ── Référentiels ──
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

// ── Demandes ──
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

// ── Suivi terrain ──
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
  role?: string;
}

// ── Descente terrain ──
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

// ── Géométrie ──
export interface Geometrie {
  idGeometrie: string;
  entiteType: string;
  entiteId: string;
  typeGeometrie: 'Point' | 'Polygon' | 'LineString';
  geom: string; // GeoJSON or geography
  precisionM?: number;
  superficieCalculeeM2?: number;
  source: string;
  idUtilisateur: number;
  dateCreation?: string;
  dateModification?: string;
}

// ── Signalement ──
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

// ── Document ──
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
  idDemandeur: number;
}

// ── Alerte ──
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

// ── Synthèse financière ──
export interface VueRecouvrement {
  idLigne: string;
  nomVille: string;
  annee: number;
  nbDossiers: number;
  montantTotal: number;
}

// ── Pagination ──
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

// ── Stats Dashboard ──
export interface DashboardStats {
  nbDossiers: number;
  valeurTotale: number;
  nbTitresFonciers: number;
  nbParcelles: number;
  nbNotifications: number;
  nbAvertissements: number;
  nbVilles: number;
}
