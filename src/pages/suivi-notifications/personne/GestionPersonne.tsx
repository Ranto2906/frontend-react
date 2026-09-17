import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { personService } from '../../../services';
import type {
  Personne,
  TypePersonne,
  CreatePersonneRequest,
  UpdatePersonneRequest,
  PageResponse,
} from '../../../types';

// ── Types modaux ──
type Modal =
  | { type: 'create' }
  | { type: 'edit'; personne: Personne }
  | { type: 'delete'; personne: Personne }
  | null;

const ROLE_COLORS: Record<string, string> = {
  'Notifié': 'bg-blue-100 text-blue-800',
  'Averti': 'bg-red-100 text-red-800',
  'Avertis': 'bg-red-100 text-red-800',
  'Occupant': 'bg-green-100 text-green-800',
  'Propriétaire': 'bg-purple-100 text-purple-800',
  'Mandataire': 'bg-amber-100 text-amber-800',
  'Tiers': 'bg-gray-100 text-gray-800',
};

const TYPE_COLORS: Record<string, string> = {
  'DEMANDEUR': 'bg-blue-100 text-blue-800',
  'NOTIFIE': 'bg-blue-100 text-blue-800',
  'AVERTI': 'bg-red-100 text-red-800',
  'OCCUPANT': 'bg-green-100 text-green-800',
  'PROPRIETAIRE': 'bg-purple-100 text-purple-800',
  'MANDATAIRE': 'bg-amber-100 text-amber-800',
};



// ══════════════════════════════════════════════════════════════
// Composant principal
// ══════════════════════════════════════════════════════════════
export default function GestionPersonne() {
  const navigate = useNavigate();
  const [personnes, setPersonnes] = useState<Personne[]>([]);
  const [page, setPage] = useState<PageResponse<Personne> | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [types, setTypes] = useState<TypePersonne[]>([]);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Charger les personnes ──
  const loadPersonnes = useCallback(async () => {
    setLoading(true);
    try {
      const data = search.trim()
        ? await personService.rechercher(search.trim(), currentPage, 15)
        : await personService.lister(currentPage, 15);
      setPage(data);
      setPersonnes(data.content);
    } catch {
      showToast('Erreur lors du chargement des personnes', false);
    } finally {
      setLoading(false);
    }
  }, [search, currentPage]);

  useEffect(() => {
    loadPersonnes();
  }, [loadPersonnes]);

  // ── Charger les référentiels type / statut ──
  useEffect(() => {
    personService.listerTypes()
      .then(setTypes)
      .catch(() => {
        /* référentiel des types indisponible */
      });
  }, []);

  // ── Recherche avec reset page ──
  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(0);
  };

  // ── Actions CRUD ──
  const handleCreate = async (data: CreatePersonneRequest) => {
    try {
      await personService.creer(data);
      showToast('Personne créée avec succès');
      setModal(null);
      loadPersonnes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la création';
      showToast(msg, false);
    }
  };

  const handleUpdate = async (id: number, data: UpdatePersonneRequest) => {
    try {
      await personService.modifier(id, data);
      showToast('Personne mise à jour');
      setModal(null);
      loadPersonnes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
      showToast(msg, false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await personService.supprimer(id);
      showToast('Personne supprimée');
      setModal(null);
      loadPersonnes();
    } catch {
      showToast('Erreur lors de la suppression', false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm transition-all ${
            toast.ok ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/suivi-notifications"
              className="text-gray-400 hover:text-gray-600 text-sm transition-colors"
            >
              ← Retour
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">👤 Gestion des Personnes</h1>
          <p className="text-gray-500 text-sm mt-1">
            {page?.totalElements ?? 0} personne{(page?.totalElements ?? 0) > 1 ? 's' : ''} au
            total
          </p>
        </div>
        <button
          onClick={() => navigate('/suivi-notifications/personnes/nouvelle')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
        >
          <span>➕</span> Nouvelle personne
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="🔍 Rechercher par nom, contact, email..."
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
        ) : personnes.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-lg">Aucune personne trouvée</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nom</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Adresse</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {personnes.map((p) => (
                <tr key={p.idPersonne} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                        {p.nom?.charAt(0).toUpperCase()}
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/suivi-notifications/personnes/${p.idPersonne}`)}
                        className="font-medium text-gray-800 hover:text-blue-600 hover:underline text-left"
                      >
                        {p.nom}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.contact || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{p.adresse || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {p.libelleTypePersonne ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          TYPE_COLORS[p.codeTypePersonne || ''] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {p.libelleTypePersonne}
                      </span>
                    ) : p.role ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          ROLE_COLORS[p.role] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {p.role}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">—</span>
                    )}
                  </td>
                 
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {p.date
                      ? new Date(p.date).toLocaleDateString('fr-FR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* 👁️ → navigue vers la page détail */}
                      <button
                        onClick={() => navigate(`/suivi-notifications/personnes/${p.idPersonne}`)}
                        title="Voir la fiche"
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                      >
                        👁️
                      </button>
                      <button
                        onClick={() => setModal({ type: 'edit', personne: p })}
                        title="Modifier"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setModal({ type: 'delete', personne: p })}
                        title="Supprimer"
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                      >
                        🗑️
                      </button>
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
        <CreatePersonneModal
          types={types}
          onSave={handleCreate}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'edit' && (
        <EditPersonneModal
          personne={modal.personne}
          types={types}
          onSave={handleUpdate}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'delete' && (
        <DeletePersonneModal
          personne={modal.personne}
          onConfirm={handleDelete}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MODAL : Créer une personne
// ══════════════════════════════════════════════════════════════
function CreatePersonneModal({
  types,
  onSave,
  onClose,
}: {
  types: TypePersonne[];
  onSave: (data: CreatePersonneRequest) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CreatePersonneRequest>({
    nom: '',
    contact: '',
    email: '',
    adresse: '',
    role: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field: keyof CreatePersonneRequest, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));
  const setNum = (field: keyof CreatePersonneRequest, value: string) =>
    setForm((f) => ({ ...f, [field]: value ? Number(value) : undefined }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.nom.trim()) return setError('Le nom est requis');

    setSaving(true);
    try {
      await onSave({
        nom: form.nom.trim(),
        contact: form.contact?.trim() || undefined,
        email: form.email?.trim() || undefined,
        adresse: form.adresse?.trim() || undefined,
        role: form.role || undefined,
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
          <h2 className="text-lg font-bold text-gray-800">➕ Nouvelle personne</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <Field
            label="Nom *"
            value={form.nom}
            onChange={(v) => set('nom', v)}
            placeholder="ex: Rakoto"
          />
          <Field
            label="Contact"
            value={form.contact || ''}
            onChange={(v) => set('contact', v)}
            placeholder="ex: +261 34 00 000"
          />
          <Field
            label="Email"
            type="email"
            value={form.email || ''}
            onChange={(v) => set('email', v)}
            placeholder="ex: jean@email.mg"
          />
          <Field
            label="Adresse"
            value={form.adresse || ''}
            onChange={(v) => set('adresse', v)}
            placeholder="ex: Analakely, Antananarivo"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.idTypePersonne ?? ''}
                onChange={(e) => setNum('idTypePersonne', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">— Sélectionner —</option>
                {types.map((t) => (
                  <option key={t.idTypePersonne} value={t.idTypePersonne}>
                    {t.libelle}
                  </option>
                ))}
              </select>
            </div>
           
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              {saving ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

// ══════════════════════════════════════════════════════════════
// MODAL : Modifier une personne
// ══════════════════════════════════════════════════════════════
function EditPersonneModal({
  personne,
  types,
  onSave,
  onClose,
}: {
  personne: Personne;
  types: TypePersonne[];
  onSave: (id: number, data: UpdatePersonneRequest) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    nom: personne.nom,
    contact: personne.contact || '',
    email: personne.email || '',
    adresse: personne.adresse || '',
    role: personne.role || '',
    idTypePersonne: personne.idTypePersonne ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.nom.trim()) return setError('Le nom est requis');

    setSaving(true);
    try {
      await onSave(personne.idPersonne, {
        nom: form.nom.trim(),
        contact: form.contact.trim() || undefined,
        email: form.email.trim() || undefined,
        adresse: form.adresse.trim() || undefined,
        role: form.role || undefined,
        idTypePersonne: form.idTypePersonne !== '' ? Number(form.idTypePersonne) : undefined,
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
          <h2 className="text-lg font-bold text-gray-800">
            ✏️ Modifier — {personne.nom}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <Field label="Nom *" value={form.nom} onChange={(v) => set('nom', v)} />
          <Field
            label="Contact"
            value={form.contact}
            onChange={(v) => set('contact', v)}
          />
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(v) => set('email', v)}
          />
          <Field
            label="Adresse"
            value={form.adresse}
            onChange={(v) => set('adresse', v)}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.idTypePersonne}
                onChange={(e) => set('idTypePersonne', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">— Sélectionner —</option>
                {types.map((t) => (
                  <option key={t.idTypePersonne} value={t.idTypePersonne}>
                    {t.libelle}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
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
function DeletePersonneModal({
  personne,
  onConfirm,
  onClose,
}: {
  personne: Personne;
  onConfirm: (id: number) => Promise<void>;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(personne.idPersonne);
    } catch {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-red-200 bg-red-50">
          <h2 className="text-lg font-bold text-red-800">🗑️ Supprimer la personne</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-700">
            Êtes-vous sûr de vouloir supprimer la personne{' '}
            <strong>{personne.nom}</strong> ?
          </p>
          <p className="text-xs text-red-600 mt-2">
            Cette action est irréversible.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors"
            >
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
