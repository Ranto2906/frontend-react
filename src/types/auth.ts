import type { RoleDTO } from './role';

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
