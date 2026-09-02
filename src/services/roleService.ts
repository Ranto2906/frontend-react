import api from './api';
import type {
  RoleDTO, CreateRoleRequest, RoleWithPermissionsDTO, PermissionDTO,
  ModuleRBAC, EntiteRBAC, ActionRBAC,
} from '../types';

// ══════════════════════════════════════════════════════════════
// Role Service — CRUD rôles, permissions RBAC, modules/entités
// ══════════════════════════════════════════════════════════════

export const roleService = {
  // ── CRUD Rôles ──
  lister: (): Promise<RoleDTO[]> =>
    api.get<RoleDTO[]>('/roles').then((r) => r.data),

  trouverParId: (id: number): Promise<RoleDTO> =>
    api.get<RoleDTO>(`/roles/${id}`).then((r) => r.data),

  creer: (request: CreateRoleRequest): Promise<RoleDTO> =>
    api.post<RoleDTO>('/roles', request).then((r) => r.data),

  mettreAJour: (id: number, request: CreateRoleRequest): Promise<RoleDTO> =>
    api.put<RoleDTO>(`/roles/${id}`, request).then((r) => r.data),

  supprimer: (id: number) =>
    api.delete(`/roles/${id}`),

  // ── Permissions ──
  listerPermissions: (): Promise<PermissionDTO[]> =>
    api.get<PermissionDTO[]>('/roles/permissions').then((r) => r.data),

  trouverAvecPermissions: (id: number): Promise<RoleWithPermissionsDTO> =>
    api.get<RoleWithPermissionsDTO>(`/roles/${id}/permissions`).then((r) => r.data),

  attribuerPermission: (idRole: number, idPermission: number) =>
    api.post(`/roles/${idRole}/permissions`, { idPermission }),

  retirerPermission: (idRole: number, idPermission: number) =>
    api.delete(`/roles/${idRole}/permissions/${idPermission}`),

  // ── Referentiels RBAC ──
  listerModules: (): Promise<ModuleRBAC[]> =>
    api.get<ModuleRBAC[]>('/roles/modules').then((r) => r.data),

  listerEntites: (): Promise<EntiteRBAC[]> =>
    api.get<EntiteRBAC[]>('/roles/entites').then((r) => r.data),

  listerActions: (): Promise<ActionRBAC[]> =>
    api.get<ActionRBAC[]>('/roles/actions').then((r) => r.data),
};
