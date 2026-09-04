// ══════════════════════════════════════════════════════════════
// Services — Barrel Export
// ══════════════════════════════════════════════════════════════

export { authService } from './authService';
export { utilisateurService } from './utilisateurService';
export { roleService } from './roleService';
export { adminService } from './adminService';
export { personService } from './personService';
export { notificationOccupationService } from './notificationService';
export { avertissementService } from './avertissementService';
export { suiviNotificationService } from './suiviNotificationService';
export { photoService } from './photoService';
export { importService } from './importService';
export { villeService, proprieteService, titreFoncierService, prixM2Service, parcelleService } from './terrainService';

// Re-export de l'instance axios et des token helpers
export { default as api, setTokens, clearTokens, getAccessToken, getRefreshToken } from './api';
