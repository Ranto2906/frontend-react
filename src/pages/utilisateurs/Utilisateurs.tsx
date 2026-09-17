import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { utilisateurService, roleService } from '../../services';
import type {
  UtilisateurDTO, RoleDTO,
  CreateUtilisateurRequest, UpdateUtilisateurRequest,
  PageResponse,
} from '../../types';

// ── Types locaux ──
type Modal =
  | { type: 'create' }
  | { type: 'edit'; user: UtilisateurDTO }
  | { type: 'roles'; user: UtilisateurDTO }
  | { type: 'resetPassword'; user: UtilisateurDTO }
  | { type: 'delete'; user: UtilisateurDTO }
  | null;

// ── Composant principal ──
export default function Utilisateurs() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.roles?.some((r) => r.nomRole === 'Administrateur');

  const [users, setUsers] = useState<UtilisateurDTO[]>([]);
  const [allRoles, setAllRoles] = useState<RoleDTO[]>([]);
  const [page, setPage] = useState<PageResponse<UtilisateurDTO> | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // ── Charger les rôles disponibles ──
  useEffect(() => {
    roleService.lister().then(setAllRoles).catch(() => {});
  }, []);

  // ── Charger les utilisateurs ──
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await utilisateurService.lister(search || undefined, currentPage, 15);
      setPage(data);
      setUsers(data.content);
    } catch {
      showToast('Erreur lors du chargement des utilisateurs', false);
    } finally {
      setLoading(false);
    }
  }, [search, currentPage]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  if (!isAdmin) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-semibold">Accès réservé aux administrateurs</p>
        </div>
      </div>
    );
  }

  // ── Actions ──
  const handleToggleActive = async (u: UtilisateurDTO) => {
    try {
      await utilisateurService.activerDesactiver(u.idUtilisateur, !u.actif);
      showToast(u.actif ? 'Utilisateur désactivé' : 'Utilisateur activé');
      loadUsers();
    } catch {
      showToast('Erreur lors de la modification', false);
    }
  };

  const handleDelete = async (u: UtilisateurDTO) => {
    try {
      await utilisateurService.supprimer(u.idUtilisateur);
      showToast('Utilisateur supprimé');
      setModal(null);
      loadUsers();
    } catch {
      showToast('Erreur lors de la suppression', false);
    }
  };

  const handleResetPassword = async (id: number, newPassword: string) => {
    try {
      await utilisateurService.reinitialiserMotDePasse(id, newPassword);
      showToast('Mot de passe réinitialisé');
      setModal(null);
    } catch {
      showToast('Erreur lors de la réinitialisation', false);
    }
  };

  const handleSaveUser = async (data: CreateUtilisateurRequest | { id: number; data: UpdateUtilisateurRequest }) => {
    try {
      if ('id' in data) {
        await utilisateurService.mettreAJour(data.id, data.data);
        showToast('Utilisateur mis à jour');
      } else {
        await utilisateurService.creer(data);
        showToast('Utilisateur créé');
      }
      setModal(null);
      loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde';
      showToast(msg, false);
    }
  };

  const handleAssignRole = async (userId: number, idRole: number) => {
    try {
      await utilisateurService.attribuerRole(userId, idRole);
      showToast('Rôle attribué');
      loadUsers();
    } catch {
      showToast('Erreur lors de l\'attribution du rôle', false);
    }
  };

  const handleRemoveRole = async (userId: number, roleId: number) => {
    try {
      await utilisateurService.retirerRole(userId, roleId);
      showToast('Rôle retiré');
      loadUsers();
    } catch {
      showToast('Erreur lors du retrait du rôle', false);
    }
  };

  // ── Recherche avec debounce ──
  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(0);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm transition-all ${
          toast.ok ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">👥 Gestion des Utilisateurs</h1>
          <p className="text-gray-500 text-sm mt-1">
            {page?.totalElements ?? 0} utilisateur{(page?.totalElements ?? 0) > 1 ? 's' : ''} au total
          </p>
        </div>
        <button
          onClick={() => setModal({ type: 'create' })}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
        >
          <span>➕</span> Nouvel utilisateur
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="🔍 Rechercher par nom, email..."
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
        />
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            Chargement...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-lg">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Utilisateur</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nom complet</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rôles</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Dernière connexion</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.idUtilisateur} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                        {u.nomUtilisateur?.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-800">{u.nomUtilisateur}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.nomComplet || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles?.length ? (
                        u.roles.map((r) => (
                          <span key={r.idRole} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {r.nomRole}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400 italic">Aucun rôle</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.actif ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Inactif
                      </span>
                    )}
                    {u.tentativesEchouees && u.tentativesEchouees > 0 && (
                      <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800" title={`${u.tentativesEchouees} tentative(s) échouée(s)`}>
                        ⚠️ {u.tentativesEchouees}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500 text-xs">
                    {u.derniereConnexion
                      ? new Date(u.derniereConnexion).toLocaleString('fr-FR')
                      : 'Jamais'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setModal({ type: 'edit', user: u })}
                        title="Modifier"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                      >✏️</button>
                      <button
                        onClick={() => setModal({ type: 'roles', user: u })}
                        title="Gérer les rôles"
                        className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600 transition-colors"
                      >🛡️</button>
                      <button
                        onClick={() => setModal({ type: 'resetPassword', user: u })}
                        title="Réinitialiser le mot de passe"
                        className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-600 transition-colors"
                      >🔑</button>
                      <button
                        onClick={() => handleToggleActive(u)}
                        title={u.actif ? 'Désactiver' : 'Activer'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          u.actif ? 'hover:bg-orange-50 text-orange-600' : 'hover:bg-green-50 text-green-600'
                        }`}
                      >{u.actif ? '🚫' : '✅'}</button>
                      <button
                        onClick={() => setModal({ type: 'delete', user: u })}
                        title="Supprimer"
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                      >🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {page && page.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              Page {page.number + 1} sur {page.totalPages}
            </p>
            <div className="flex gap-1">
              <button
                disabled={page.first}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-3 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Précédent
              </button>
              <button
                disabled={page.last}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Suivant →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modaux ── */}
      {modal?.type === 'create' && (
        <CreateUserModal
          allRoles={allRoles}
          onSave={handleSaveUser}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'edit' && (
        <EditUserModal
          user={modal.user}
          onSave={handleSaveUser}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'roles' && (
        <RolesModal
          user={modal.user}
          allRoles={allRoles}
          onAssign={handleAssignRole}
          onRemove={handleRemoveRole}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'resetPassword' && (
        <ResetPasswordModal
          user={modal.user}
          onReset={handleResetPassword}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'delete' && (
        <DeleteModal
          user={modal.user}
          onConfirm={handleDelete}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MODAL : Créer un utilisateur
// ══════════════════════════════════════════════════════════════
function CreateUserModal({
  allRoles,
  onSave,
  onClose,
}: {
  allRoles: RoleDTO[];
  onSave: (data: CreateUtilisateurRequest) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    nomUtilisateur: '',
    nomComplet: '',
    email: '',
    motDePasse: '',
    confirmMotDePasse: '',
    actif: true,
  });
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const toggleRole = (id: number) => {
    setSelectedRoleIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.nomUtilisateur.trim()) return setError('Le nom d\'utilisateur est requis');
    if (!form.motDePasse) return setError('Le mot de passe est requis');
    if (form.motDePasse.length < 6) return setError('Le mot de passe doit contenir au moins 6 caractères');
    if (form.motDePasse !== form.confirmMotDePasse) return setError('Les mots de passe ne correspondent pas');

    setSaving(true);
    try {
      await onSave({
        nomUtilisateur: form.nomUtilisateur.trim(),
        nomComplet: form.nomComplet.trim() || undefined,
        email: form.email.trim() || undefined,
        motDePasse: form.motDePasse,
        actif: form.actif,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      setError(msg);
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">➕ Nouvel utilisateur</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm border border-red-200">{error}</div>
          )}

          <Field label="Nom d'utilisateur *" value={form.nomUtilisateur}
            onChange={(v) => set('nomUtilisateur', v)} placeholder="ex: jean_dupont" />

          <Field label="Nom complet" value={form.nomComplet}
            onChange={(v) => set('nomComplet', v)} placeholder="ex: Jean Dupont" />

          <Field label="Email" type="email" value={form.email}
            onChange={(v) => set('email', v)} placeholder="ex: jean@seimad.mg" />

          <Field label="Mot de passe *" type="password" value={form.motDePasse}
            onChange={(v) => set('motDePasse', v)} placeholder="Minimum 6 caractères" />

          <Field label="Confirmer le mot de passe *" type="password" value={form.confirmMotDePasse}
            onChange={(v) => set('confirmMotDePasse', v)} placeholder="Retapez le mot de passe" />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.actif}
              onChange={(e) => set('actif', e.target.checked)}
              className="rounded border-gray-300 text-blue-600"
              id="actif-create"
            />
            <label htmlFor="actif-create" className="text-sm text-gray-700">Compte actif</label>
          </div>

          {/* Sélection des rôles */}
          {allRoles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rôles</label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {allRoles.map((role) => (
                  <label key={role.idRole} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRoleIds.includes(role.idRole)}
                      onChange={() => toggleRole(role.idRole)}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">{role.nomRole}</span>
                      {role.description && (
                        <p className="text-xs text-gray-500">{role.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Les rôles seront attribués après la création de l'utilisateur.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors">
              {saving ? 'Création...' : 'Créer l\'utilisateur'}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

// ══════════════════════════════════════════════════════════════
// MODAL : Modifier un utilisateur
// ══════════════════════════════════════════════════════════════
function EditUserModal({
  user,
  onSave,
  onClose,
}: {
  user: UtilisateurDTO;
  onSave: (data: { id: number; data: UpdateUtilisateurRequest }) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    nomUtilisateur: user.nomUtilisateur,
    nomComplet: user.nomComplet || '',
    email: user.email || '',
    actif: user.actif,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.nomUtilisateur.trim()) return setError('Le nom d\'utilisateur est requis');

    setSaving(true);
    try {
      await onSave({
        id: user.idUtilisateur,
        data: {
          nomUtilisateur: form.nomUtilisateur.trim(),
          nomComplet: form.nomComplet.trim() || undefined,
          email: form.email.trim() || undefined,
          actif: form.actif,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      setError(msg);
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">✏️ Modifier — {user.nomUtilisateur}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm border border-red-200">{error}</div>
          )}

          <Field label="Nom d'utilisateur *" value={form.nomUtilisateur}
            onChange={(v) => set('nomUtilisateur', v)} />

          <Field label="Nom complet" value={form.nomComplet}
            onChange={(v) => set('nomComplet', v)} />

          <Field label="Email" type="email" value={form.email}
            onChange={(v) => set('email', v)} />

          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.actif}
              onChange={(e) => set('actif', e.target.checked)}
              className="rounded border-gray-300 text-blue-600" id="actif-edit" />
            <label htmlFor="actif-edit" className="text-sm text-gray-700">Compte actif</label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

// ══════════════════════════════════════════════════════════════
// MODAL : Gérer les rôles d'un utilisateur
// ══════════════════════════════════════════════════════════════
function RolesModal({
  user,
  allRoles,
  onAssign,
  onRemove,
  onClose,
}: {
  user: UtilisateurDTO;
  allRoles: RoleDTO[];
  onAssign: (userId: number, roleId: number) => Promise<void>;
  onRemove: (userId: number, roleId: number) => Promise<void>;
  onClose: () => void;
}) {
  const [userRoles, setUserRoles] = useState<RoleDTO[]>(user.roles || []);
  const [loading, setLoading] = useState(false);

  const userRoleIds = userRoles.map((r) => r.idRole);
  const availableRoles = allRoles.filter((r) => !userRoleIds.includes(r.idRole));

  const handleAssign = async (roleId: number) => {
    setLoading(true);
    try {
      await onAssign(user.idUtilisateur, roleId);
      const assigned = allRoles.find((r) => r.idRole === roleId);
      if (assigned) setUserRoles((prev) => [...prev, assigned]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (roleId: number) => {
    setLoading(true);
    try {
      await onRemove(user.idUtilisateur, roleId);
      setUserRoles((prev) => prev.filter((r) => r.idRole !== roleId));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">🛡️ Rôles — {user.nomUtilisateur}</h2>
        </div>
        <div className="p-6 space-y-4">
          {/* Rôles actuels */}
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Rôles attribués</h3>
            {userRoles.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Aucun rôle attribué</p>
            ) : (
              <div className="space-y-2">
                {userRoles.map((role) => (
                  <div key={role.idRole} className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-blue-800">{role.nomRole}</span>
                      {role.description && (
                        <p className="text-xs text-blue-600">{role.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemove(role.idRole)}
                      disabled={loading}
                      className="text-red-500 hover:text-red-700 text-sm font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                    >
                      Retirer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rôles disponibles */}
          {availableRoles.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Rôles disponibles</h3>
              <div className="space-y-2">
                {availableRoles.map((role) => (
                  <div key={role.idRole} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-gray-700">{role.nomRole}</span>
                      {role.description && (
                        <p className="text-xs text-gray-500">{role.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleAssign(role.idRole)}
                      disabled={loading}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                    >
                      Attribuer
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button onClick={onClose}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              Fermer
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ══════════════════════════════════════════════════════════════
// MODAL : Réinitialiser le mot de passe
// ══════════════════════════════════════════════════════════════
function ResetPasswordModal({
  user,
  onReset,
  onClose,
}: {
  user: UtilisateurDTO;
  onReset: (id: number, newPassword: string) => Promise<void>;
  onClose: () => void;
}) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password) return setError('Le mot de passe est requis');
    if (password.length < 6) return setError('Minimum 6 caractères');
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas');

    setSaving(true);
    try {
      await onReset(user.idUtilisateur, password);
    } catch {
      setError('Erreur lors de la réinitialisation');
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">🔑 Réinitialiser le mot de passe</h2>
          <p className="text-sm text-gray-500 mt-1">Pour : <strong>{user.nomUtilisateur}</strong></p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm border border-red-200">{error}</div>
          )}

          <Field label="Nouveau mot de passe *" type="password" value={password}
            onChange={setPassword} placeholder="Minimum 6 caractères" />

          <Field label="Confirmer *" type="password" value={confirm}
            onChange={setConfirm} placeholder="Retapez le mot de passe" />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400 text-white rounded-lg font-medium transition-colors">
              {saving ? 'Réinitialisation...' : 'Réinitialiser'}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

// ══════════════════════════════════════════════════════════════
// MODAL : Confirmer la suppression
// ══════════════════════════════════════════════════════════════
function DeleteModal({
  user,
  onConfirm,
  onClose,
}: {
  user: UtilisateurDTO;
  onConfirm: (u: UtilisateurDTO) => Promise<void>;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(user);
    } catch {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-red-200 bg-red-50">
          <h2 className="text-lg font-bold text-red-800">🗑️ Supprimer l'utilisateur</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-700">
            Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{user.nomUtilisateur}</strong> ?
          </p>
          <p className="text-xs text-red-600 mt-2">
            Cette action est irréversible. Toutes les données associées seront supprimées.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Annuler
            </button>
            <button onClick={handleConfirm} disabled={saving}
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
// Composants réutilisables
// ══════════════════════════════════════════════════════════════

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="relative z-50 w-full max-w-lg px-4" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
      />
    </div>
  );
}
