import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { roleApi } from '../services/api';
import type {
  RoleDTO, RoleWithPermissionsDTO, PermissionDTO,
  ModuleRBAC, EntiteRBAC, ActionRBAC,
  CreateRoleRequest,
} from '../types';

type Modal =
  | { type: 'create' }
  | { type: 'edit'; role: RoleDTO }
  | { type: 'permissions'; role: RoleDTO }
  | { type: 'delete'; role: RoleDTO }
  | null;

type Toast = { msg: string; ok: boolean } | null;

export default function Roles() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.roles?.some((r) => r.nomRole === 'Administrateur');

  const [roles, setRoles] = useState<RoleDTO[]>([]);
  const [modules, setModules] = useState<ModuleRBAC[]>([]);
  const [entites, setEntites] = useState<EntiteRBAC[]>([]);
  const [actions, setActions] = useState<ActionRBAC[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState<Toast>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [r, m, e, a] = await Promise.all([
        roleApi.lister(),
        roleApi.listerModules(),
        roleApi.listerEntites(),
        roleApi.listerActions(),
      ]);
      setRoles(r);
      setModules(m);
      setEntites(e);
      setActions(a);
    } catch {
      showToast('Erreur lors du chargement', false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (!isAdmin) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-semibold">Accès réservé aux administrateurs</p>
        </div>
      </div>
    );
  }

  const handleCreate = async (data: CreateRoleRequest) => {
    try {
      await roleApi.creer(data);
      showToast('Rôle créé');
      setModal(null);
      loadAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      showToast(msg, false);
    }
  };

  const handleEdit = async (id: number, data: CreateRoleRequest) => {
    try {
      await roleApi.mettreAJour(id, data);
      showToast('Rôle mis à jour');
      setModal(null);
      loadAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      showToast(msg, false);
    }
  };

  const handleDelete = async (role: RoleDTO) => {
    try {
      await roleApi.supprimer(role.idRole);
      showToast('Rôle supprimé');
      setModal(null);
      loadAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      showToast(msg, false);
    }
  };

  const handleAssignPermission = async (idRole: number, idPermission: number) => {
    try {
      await roleApi.attribuerPermission(idRole, idPermission);
      showToast('Permission ajoutée');
      loadAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      showToast(msg, false);
    }
  };

  const handleRemovePermission = async (idRole: number, idPermission: number) => {
    try {
      await roleApi.retirerPermission(idRole, idPermission);
      showToast('Permission retirée');
      loadAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      showToast(msg, false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm transition-all ${
          toast.ok ? 'bg-green-600' : 'bg-red-600'
        }`}>{toast.msg}</div>
      )}

      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🛡️ Rôles & Permissions</h1>
          <p className="text-gray-500 text-sm mt-1">
            Gestion RBAC — {roles.length} rôle{roles.length > 1 ? 's' : ''},
            {' '}{entites.length} entité{entites.length > 1 ? 's' : ''},
            {' '}{actions.length} action{actions.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setModal({ type: 'create' })}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
        >
          <span>➕</span> Nouveau rôle
        </button>
      </div>

      {/* ── Liste des rôles ── */}
      {loading ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          Chargement...
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400">
          <p className="text-lg">Aucun rôle trouvé</p>
        </div>
      ) : (
        <div className="space-y-4">
          {roles.map((role) => (
            <RoleCard
              key={role.idRole}
              role={role}
              onEdit={() => setModal({ type: 'edit', role })}
              onPermissions={() => setModal({ type: 'permissions', role })}
              onDelete={() => setModal({ type: 'delete', role })}
            />
          ))}
        </div>
      )}

      {/* ── Modaux ── */}
      {modal?.type === 'create' && (
        <CreateEditRoleModal onSave={handleCreate} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'edit' && (
        <CreateEditRoleModal role={modal.role} onSave={(data) => handleEdit(modal.role.idRole, data)} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'permissions' && (
        <PermissionsModal
          role={modal.role}
          modules={modules}
          entites={entites}
          actions={actions}
          onAssign={handleAssignPermission}
          onRemove={handleRemovePermission}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'delete' && (
        <DeleteRoleModal role={modal.role} onConfirm={handleDelete} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Carte d'un rôle
// ══════════════════════════════════════════════════════════════
function RoleCard({
  role,
  onEdit,
  onPermissions,
  onDelete,
}: {
  role: RoleDTO;
  onEdit: () => void;
  onPermissions: () => void;
  onDelete: () => void;
}) {
  const [details, setDetails] = useState<RoleWithPermissionsDTO | null>(null);
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    try {
      const data = await roleApi.trouverAvecPermissions(role.idRole);
      setDetails(data);
      setExpanded(true);
    } catch {
      // ignore
    }
  };

  // Grouper les permissions par module
  const permsByModule = new Map<string, { libelle: string; perms: PermissionDTO[] }>();
  if (details?.permissions) {
    for (const p of details.permissions) {
      const existing = permsByModule.get(p.codeModule);
      if (existing) {
        existing.perms.push(p);
      } else {
        permsByModule.set(p.codeModule, { libelle: p.libelleModule, perms: [p] });
      }
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* En-tête du rôle */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleExpand}
            className="w-8 h-8 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center text-sm font-bold hover:bg-purple-200 transition-colors"
            title="Voir les permissions"
          >
            {expanded ? '▼' : '▶'}
          </button>
          <div>
            <h3 className="font-bold text-gray-800">{role.nomRole}</h3>
            {role.description && (
              <p className="text-sm text-gray-500">{role.description}</p>
            )}
          </div>
          {details && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
              {details.permissions.length} permission{details.permissions.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} title="Modifier"
            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">✏️</button>
          <button onClick={onPermissions} title="Gérer les permissions"
            className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600 transition-colors">🔐</button>
          <button onClick={onDelete} title="Supprimer"
            className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors">🗑️</button>
        </div>
      </div>

      {/* Permissions détaillées (expandable) */}
      {expanded && details && (
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
          {permsByModule.size === 0 ? (
            <p className="text-sm text-gray-400 italic">Aucune permission attribuée</p>
          ) : (
            <div className="space-y-3">
              {Array.from(permsByModule.entries()).map(([codeModule, { libelle, perms }]) => (
                <div key={codeModule}>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                    📦 {libelle} ({codeModule})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {perms.map((p) => (
                      <span key={p.idPermission}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white border border-gray-200 text-gray-700">
                        {p.codeEntite}.{p.codeAction}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MODAL : Créer / Modifier un rôle
// ══════════════════════════════════════════════════════════════
function CreateEditRoleModal({
  role,
  onSave,
  onClose,
}: {
  role?: RoleDTO;
  onSave: (data: CreateRoleRequest) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    nomRole: role?.nomRole || '',
    description: role?.description || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.nomRole.trim()) return setError('Le nom du rôle est requis');

    setSaving(true);
    try {
      await onSave({ nomRole: form.nomRole.trim(), description: form.description.trim() || undefined });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      setError(msg);
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">
            {role ? `✏️ Modifier — ${role.nomRole}` : '➕ Nouveau rôle'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm border border-red-200">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom du rôle *</label>
            <input type="text" value={form.nomRole} onChange={(e) => set('nomRole', e.target.value)}
              placeholder="ex: Gestionnaire foncier"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
              placeholder="Description du rôle et de ses responsabilités..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Annuler</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors">
              {saving ? 'Enregistrement...' : role ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

// ══════════════════════════════════════════════════════════════
// MODAL : Matrice Permissions RBAC
// ══════════════════════════════════════════════════════════════
function PermissionsModal({
  role,
  modules,
  entites,
  actions,
  onAssign,
  onRemove,
  onClose,
}: {
  role: RoleDTO;
  modules: ModuleRBAC[];
  entites: EntiteRBAC[];
  actions: ActionRBAC[];
  onAssign: (idRole: number, idPermission: number) => Promise<void>;
  onRemove: (idRole: number, idPermission: number) => Promise<void>;
  onClose: () => void;
}) {
  const [roleDetails, setRoleDetails] = useState<RoleWithPermissionsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [toggling, setToggling] = useState<number | null>(null);

  const loadRole = useCallback(async () => {
    setLoading(true);
    try {
      const data = await roleApi.trouverAvecPermissions(role.idRole);
      setRoleDetails(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [role.idRole]);

  useEffect(() => { loadRole(); }, [loadRole]);

  // Ensemble des idPermission du rôle
  const rolePermIds = new Set(roleDetails?.permissions.map((p) => p.idPermission) ?? []);

  // Toutes les permissions possibles (entite × action)
  // On doit charger toutes les permissions depuis l'API
  const [allPermissions, setAllPermissions] = useState<PermissionDTO[]>([]);
  useEffect(() => {
    roleApi.listerPermissions().then(setAllPermissions).catch(() => {});
  }, []);

  // Grouper par entité
  const entitesByModule = new Map<string, EntiteRBAC[]>();
  for (const e of entites) {
    const existing = entitesByModule.get(e.codeModule);
    if (existing) existing.push(e);
    else entitesByModule.set(e.codeModule, [e]);
  }

  // Créer un index rapide permissionId → PermissionDTO
  const permById = new Map(allPermissions.map((p) => [p.idPermission, p]));

  const filteredModules = selectedModule === 'all'
    ? modules
    : modules.filter((m) => m.codeModule === selectedModule);

  const handleToggle = async (idPermission: number) => {
    setToggling(idPermission);
    try {
      if (rolePermIds.has(idPermission)) {
        await onRemove(role.idRole, idPermission);
      } else {
        await onAssign(role.idRole, idPermission);
      }
      // Recharger les détails du rôle
      const updated = await roleApi.trouverAvecPermissions(role.idRole);
      setRoleDetails(updated);
    } finally {
      setToggling(null);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800">🔐 Permissions — {role.nomRole}</h2>
            <p className="text-sm text-gray-500">
              {roleDetails?.permissions.length ?? 0} permission{(roleDetails?.permissions.length ?? 0) > 1 ? 's' : ''} attribuée(s)
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {/* Filtre par module */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedModule('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedModule === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tous
          </button>
          {modules.map((m) => (
            <button
              key={m.codeModule}
              onClick={() => setSelectedModule(m.codeModule)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                selectedModule === m.codeModule
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {m.libelle}
            </button>
          ))}
        </div>

        {/* Matrice */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center text-gray-400 py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
              Chargement des permissions...
            </div>
          ) : (
            <div className="space-y-6">
              {filteredModules.map((mod) => {
                const modEntites = entitesByModule.get(mod.codeModule) ?? [];
                if (modEntites.length === 0) return null;

                return (
                  <div key={mod.idModule}>
                    <h3 className="text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      {mod.libelle}
                      <span className="text-xs font-normal text-gray-400">({mod.codeModule})</span>
                    </h3>

                    <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                      {/* Header actions */}
                      <div className="grid bg-gray-100 border-b border-gray-200"
                        style={{ gridTemplateColumns: `200px repeat(${actions.length}, 1fr)` }}>
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500">Entité</div>
                        {actions.map((a) => (
                          <div key={a.idAction} className="px-2 py-2 text-xs font-semibold text-gray-500 text-center">
                            {a.codeAction}
                          </div>
                        ))}
                      </div>

                      {/* Lignes entités */}
                      {modEntites.map((ent) => (
                        <div key={ent.idEntite}
                          className="grid border-b border-gray-100 last:border-b-0 hover:bg-white transition-colors"
                          style={{ gridTemplateColumns: `200px repeat(${actions.length}, 1fr)` }}>
                          <div className="px-3 py-2.5 flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">{ent.libelle}</span>
                            <span className="text-xs text-gray-400">({ent.codeEntite})</span>
                          </div>
                          {actions.map((act) => {
                            // Trouver la permission correspondante
                            const perm = allPermissions.find(
                              (p) => p.codeEntite === ent.codeEntite && p.codeAction === act.codeAction
                            );
                            const hasPerm = perm ? rolePermIds.has(perm.idPermission) : false;
                            const isToggling = perm ? toggling === perm.idPermission : false;

                            return (
                              <div key={act.idAction} className="px-2 py-2.5 flex items-center justify-center">
                                <button
                                  onClick={() => perm && handleToggle(perm.idPermission)}
                                  disabled={!perm || isToggling}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all ${
                                    isToggling ? 'opacity-50' : ''
                                  } ${
                                    hasPerm
                                      ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                                      : 'bg-white text-gray-300 hover:bg-gray-100 border border-gray-200'
                                  }`}
                                  title={hasPerm ? 'Retirer' : 'Attribuer'}
                                >
                                  {hasPerm ? '✓' : '·'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            Fermer
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ══════════════════════════════════════════════════════════════
// MODAL : Confirmer suppression
// ══════════════════════════════════════════════════════════════
function DeleteRoleModal({
  role,
  onConfirm,
  onClose,
}: {
  role: RoleDTO;
  onConfirm: (r: RoleDTO) => Promise<void>;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-red-200 bg-red-50">
          <h2 className="text-lg font-bold text-red-800">🗑️ Supprimer le rôle</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-700">
            Êtes-vous sûr de vouloir supprimer le rôle <strong>{role.nomRole}</strong> ?
          </p>
          <p className="text-xs text-red-600 mt-2">
            Les permissions associées seront également supprimées.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Annuler</button>
            <button
              onClick={async () => { setSaving(true); try { await onConfirm(role); } catch { setSaving(false); } }}
              disabled={saving}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors">
              {saving ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ══════════════════════════════════════════════════════════════
// Overlay réutilisable
// ══════════════════════════════════════════════════════════════
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="relative z-50 w-full max-w-5xl px-4" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
