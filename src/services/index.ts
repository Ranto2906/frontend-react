// ══════════════════════════════════════════════════════════════
// Services — Barrel Export
// ══════════════════════════════════════════════════════════════

export { authService } from './authService';
export { utilisateurService } from './utilisateurService';
export { roleService } from './roleService';
export { adminService } from './adminService';
export { personService } from './personService';

// Re-export de l'instance axios et des token helpers
export { default as api, setTokens, clearTokens, getAccessToken, getRefreshToken } from './api';
