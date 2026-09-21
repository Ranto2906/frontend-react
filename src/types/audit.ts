// ══════════════════════════════════════════════════════════════
// Entrée d'audit — utilisée par l'historique des modifications
// (entiteType : « dossier » ou « suivi_dossier »)
// ══════════════════════════════════════════════════════════════

export interface AuditEntry {
  idAudit: number;
  entiteType: string;
  entiteId: string;
  action?: string | null;          // CREATE | UPDATE | DELETE
  anciennesValeurs?: string | null; // JSON sérialisé
  nouvellesValeurs?: string | null; // JSON sérialisé
  dateAction?: string | null;
  ipAdresse?: string | null;
  idUtilisateur?: number | null;
  nomUtilisateur?: string | null;
}
