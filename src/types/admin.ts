export interface JournalConnexionDTO {
  idJournal: number;
  dateConnexion?: string;
  ipAdresse?: string;
  succes: boolean;
  idUtilisateur?: number;
  nomUtilisateur?: string;
}

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
