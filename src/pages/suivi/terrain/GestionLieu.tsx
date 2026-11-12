import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { lieuService, villeService } from '../../../services';
import type { Lieu, Ville } from '../../../types';
import { msgErreur } from '../../../utils';

// ── Types modaux ──
type Modal =
  | { type: 'create' }
  | { type: 'edit'; lieu: Lieu }
  | { type: 'delete'; lieu: Lieu }
  | null;

// ══════════════════════════════════════════════════════════════
// Gestion des Lieux (config : gestion terrain)
// ══════════════════════════════════════════════════════════════
export default function GestionLieu() {
  const [lieux, setLieux] = useState<Lieu[]>([]);
  const [villes, setVilles] = useState<Ville[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [l, v] = await Promise.all([
        lieuService.lister(),
        villeService.listerToutes(),
      ]);
      setLieux(l);
      setVilles(v);
    } catch {
      showToast('Erreur lors du chargement des lieux', false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const nomVille = (idVille?: number) =>
    villes.find((v) => v.idVille === idVille)?.nomVille ?? '—';

  const handleCreate = async (data: { libelle: string; idVille: number }) => {
    await lieuService.creer(data);
    showToast('Lieu créé avec succès');
    setModal(null);
    loadData();
  };

  const handleUpdate = async (id: number, data: { libelle: string; idVille: number }) => {
    await lieuService.modifier(id, data);
    showToast('Lieu mis à jour');
    setModal(null);
    loadData();
  };

  const handleDelete = async (id: number) => {
    try {
      await lieuService.supprimer(id);
      showToast('Lieu supprimé');
      setModal(null);
      loadData();
    } catch (err) {
      showToast(msgErreur(err, 'Erreur lors de la suppression'), false);
      // La fenêtre de confirmation reste sinon bloquée sur « Suppression... »
      setModal(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm transition-all ${
            toast.ok ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/suivi" className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
              ← Retour
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">📍 Gestion des Lieux</h1>
          <p className="text-gray-500 text-sm mt-1">
            {lieux.length} lieu{lieux.length > 1 ? 'x' : ''} configuré{lieux.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setModal({ type: 'create' })}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
        >
          <span>➕</span> Nouveau lieu
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            Chargement...
          </div>
        ) : lieux.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-lg">Aucun lieu configuré</p>
            <p className="text-sm mt-1">Créez un lieu pour l'associer aux propriétés.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Libellé</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ville</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lieux.map((l) => (
                <tr key={l.idLieu} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 text-xs">{l.idLieu}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">
                        {l.libelle?.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-800">{l.libelle}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{nomVille(l.idVille)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setModal({ type: 'edit', lieu: l })}
                        title="Modifier"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setModal({ type: 'delete', lieu: l })}
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
      </div>

      {modal?.type === 'create' && (
        <LieuFormModal
          villes={villes}
          onSave={handleCreate}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'edit' && (
        <LieuFormModal
          lieux={modal.lieu}
          villes={villes}
          onSave={(data) => handleUpdate(modal.lieu.idLieu, data)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'delete' && (
        <DeleteLieuModal lieu={modal.lieu} onConfirm={handleDelete} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MODAL : Créer / modifier un lieu
// ══════════════════════════════════════════════════════════════
function LieuFormModal({
  lieux,
  villes,
  onSave,
  onClose,
}: {
  lieux?: Lieu;
  villes: Ville[];
  onSave: (data: { libelle: string; idVille: number }) => Promise<void>;
  onClose: () => void;
}) {
  const edition = !!lieux;
  const [libelle, setLibelle] = useState(lieux?.libelle ?? '');
  const [idVille, setIdVille] = useState(lieux?.idVille != null ? String(lieux.idVille) : '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!libelle.trim()) return setError('Le libellé du lieu est requis');
    if (!idVille) return setError('La ville est requise');
    setSaving(true);
    try {
      await onSave({ libelle: libelle.trim(), idVille: Number(idVille) });
    } catch (err: unknown) {
      const msg = err instanceof Error && 'response' in err
        ? String((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Erreur')
        : err instanceof Error ? err.message : 'Erreur';
      setError(msg);
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">
            {edition ? `✏️ Modifier — ${lieux?.libelle}` : '➕ Nouveau lieu'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Libellé du lieu *</label>
            <input
              type="text"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder="ex: Ambodivona, Ambohipo…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
            <select
              required
              value={idVille}
              onChange={(e) => setIdVille(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">— Sélectionner —</option>
              {villes.map((v) => (
                <option key={v.idVille} value={v.idVille}>{v.nomVille}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors">
              {saving ? 'Enregistrement...' : edition ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

// ══════════════════════════════════════════════════════════════
// MODAL : Supprimer un lieu
// ══════════════════════════════════════════════════════════════
function DeleteLieuModal({
  lieu,
  onConfirm,
  onClose,
}: {
  lieu: Lieu;
  onConfirm: (id: number) => Promise<void>;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-red-200 bg-red-50">
          <h2 className="text-lg font-bold text-red-800">🗑️ Supprimer le lieu</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-700">
            Êtes-vous sûr de vouloir supprimer le lieu <strong>{lieu.libelle}</strong> ?
          </p>
          <p className="text-xs text-red-600 mt-2">Cette information sera placer dans le corbeille.</p>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Annuler
            </button>
            <button
              onClick={async () => { setSaving(true); try { await onConfirm(lieu.idLieu); } catch { setSaving(false); } }}
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
