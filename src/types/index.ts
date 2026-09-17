// ══════════════════════════════════════════════════════════════
// Types — Barrel Export
// ══════════════════════════════════════════════════════════════

// Auth & Utilisateurs
export type {
  LoginRequest,
  LoginResponse,
  UtilisateurDTO,
  CreateUtilisateurRequest,
  UpdateUtilisateurRequest,
  ChangePasswordRequest,
  TokenRefreshRequest,
} from './auth';

// Rôles & Permissions
export type {
  RoleDTO,
  CreateRoleRequest,
  PermissionDTO,
  RoleWithPermissionsDTO,
  ModuleRBAC,
  EntiteRBAC,
  ActionRBAC,
} from './role';

// Admin (Journal, Sessions, Audit)
export type {
  JournalConnexionDTO,
  SessionDTO,
  AuditDTO,
} from './admin';

// Patrimoine
export type {
  Ville,
  PrixM2,
  Propriete,
  Parcelle,
} from './patrimoine';

// Dossiers
export type {
  Dossier,
  DossierDemandeurDTO,
  DossierParcelleDTO,
  Etape,
  StatutDossier,
  StatutCouleur,
  SuiviDossierDTO,
  DemandeDossier,
  DemandeDossierDemandeur,
  SuiviEtape,
  DemandeDossierRequest,
  DemandeDossierDemandeurRequest,
  SuiviEtapeRequest,
  StatistiquesDossier,
  EtapeRequest,
  ParcelleDemandee,
  ParcelleDemandeeRequest,
} from './dossier';

// Suivi terrain
export type {
  NotificationOccupation,
  NotificationPersonne,
  NotificationPersonneRequest,
  NotificationOccupationRequest,
  Avertissement,
  AvertissementRequest,
  SuiviNotification,
  SuiviNotificationRequest,
  Personne,
  TypePersonne,
  PhotoDTO,
  CreatePersonneRequest,
  UpdatePersonneRequest,
  DescenteTerrain,
  Geometrie,
  ImportExcelResult,
  ImportSituationDemandesResult,
} from './suivi';

// Signalements
export type {
  Signalement,
  TypeSignalement,
  StatutSignalement,
  SignalementRequest,
  SignalementTraitementRequest,
  SignalementAudit,
  StatistiquesSignalement,
} from './signalement';

// Documents & Alertes
export type {
  DocumentDossier,
  DocumentDemandeur,
  Alerte,
  VueRecouvrement,
} from './document';

// Commun
export type {
  PageResponse,
  DashboardStats,
} from './common';
