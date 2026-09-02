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
