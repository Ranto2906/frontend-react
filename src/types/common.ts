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

export interface DashboardStats {
  nbDossiers: number;
  valeurTotale: number;
  nbTitresFonciers: number;
  nbParcelles: number;
  nbNotifications: number;
  nbAvertissements: number;
  nbVilles: number;
}
