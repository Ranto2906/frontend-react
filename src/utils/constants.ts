// ══════════════════════════════════════════════════════════════
// Constants — Constantes de l'application
// ══════════════════════════════════════════════════════════════

/** URL de base de l'API */
export const API_BASE = '/api';

/** Nombre d'éléments par page par défaut */
export const PAGE_SIZE = 20;

/** Couleurs des actions RBAC */
export const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  READ: 'bg-blue-100 text-blue-800',
  UPDATE: 'bg-yellow-100 text-yellow-800',
  DELETE: 'bg-red-100 text-red-800',
  VALIDATE: 'bg-purple-100 text-purple-800',
  EXPORT: 'bg-cyan-100 text-cyan-800',
};

/** Icônes des entités (pour l'audit) */
export const ENTITE_ICONS: Record<string, string> = {
  dossier: '📁',
  utilisateur: '👤',
  parcelle: '🗺️',
  titre_foncier: '📄',
  propriete: '🏘️',
  geometrie: '📍',
  signalement: '📢',
  notification_occupation: '🔔',
  avertissement: '⚠️',
  descente_terrain: '🥾',
};

/** Types d'entité pour le filtre audit */
export const ENTITE_TYPES = [
  { value: '', label: 'Toutes' },
  { value: 'dossier', label: '📁 Dossier' },
  { value: 'utilisateur', label: '👤 Utilisateur' },
  { value: 'parcelle', label: '🗺️ Parcelle' },
  { value: 'propriete', label: '🏘️ Propriété' },
  { value: 'propriete', label: '🏘️ Propriété' },
  { value: 'geometrie', label: '📍 Géométrie' },
  { value: 'signalement', label: '📢 Signalement' },
  { value: 'notification_occupation', label: '🔔 Notification' },
  { value: 'avertissement', label: '⚠️ Avertissement' },
  { value: 'descente_terrain', label: '🥾 Descente terrain' },
];

/** Types d'action pour le filtre audit */
export const ACTION_TYPES = [
  { value: '', label: 'Toutes' },
  { value: 'CREATE', label: 'Création' },
  { value: 'READ', label: 'Lecture' },
  { value: 'UPDATE', label: 'Modification' },
  { value: 'DELETE', label: 'Suppression' },
];
