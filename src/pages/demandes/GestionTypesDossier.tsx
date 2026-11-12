import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { typeDossierService, dossierFournieService } from '../../services';
import type { TypeDossier, DossierFournie } from '../../types';
import { msgErreur } from '../../utils';

// ══════════════════════════════════════════════════════════════
// Configuration des référentiels de dossiers :
//  - onglet « Types de dossier » (liste déroulante du formulaire)
//  - onglet « Dossiers fournis » (saisie libre dans le formulaire,
//    alimentée par la configuration ici)
// ══════════════════════════════════════════════════════════════
export default function GestionTypesDossier() {
  const [onglet, setOnglet] = useState<'types' | 'fournis'>('types');
  const [types, setTypes] = useState<TypeDossier[]>([]);
  const [fournis, setFournis] = useState<DossierFournie[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  type Modal =
    | { type: 'create'; cible: 'types' | 'fournis' }
    | { type: 'edit'; cible: 'types' | 'fournis'; id: number; code: string; libelle: string }
    | { type: 'delete'; cible: 'types' | 'fournis'; id: number; libelle: string }
    | null;

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [t, f] = await Promise.all([
        typeDossierService.lister(),
        dossierFournieService.lister(),
      ]);
      setTypes(t);
      setFournis(f);
    } catch {
      showToast('Erreur lors du chargement des référentiels', false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const liste = onglet === 'types'
    ? types.map(({ idTypeDossier, code, libelle }) => ({ id: idTypeDossier, code, libelle }))
    : fournis.map(({ idDossierFournie, libelle }) => ({ id: idDossierFournie, code: '', libelle }));
  const libelleOnglet = onglet === 'types' ? 'Type de dossier' : 'Dossier fourni';

  const handleSave = async (data: { code: string; libelle: string }, id?: number) => {
    if (onglet === 'types') {
      if (id != null) await typeDossierService.modifier(id, data.code, data.libelle);
      else await typeDossierService.creer(data.code, data.libelle);
    } else {
      if (id != null) await dossierFournieService.modifier(id, data.libelle);
      else await dossierFournieService.creer(data.libelle);
    }
    showToast(id != null ? 'Mise à jour enregistrée' : 'Créé avec succès');
    setModal(null);
    loadData();
  };

  const handleDelete = async (id: number) => {
    try {
      if (onglet === 'types') await typeDossierService.supprimer(id);
      else await dossierFournieService.supprimer(id);
      showToast('Supprimé');
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
            <Link to="/demandes" className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
              ← Retour
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">🗂️ Configuration des dossiers</h1>
          <p className="text-gray-500 text-sm mt-1">
            Types de dossier et pièces fournies utilisés dans le formulaire de demande
          </p>
        </div>
        <button
          onClick={() => setModal({ type: 'create', cible: onglet })}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
        >
          <span>➕</span> Nouveau {libelleOnglet.toLowerCase()}
        </button>
      </div>

      {/* ── Onglets ── */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setOnglet('types')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            onglet === 'types'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          📁 Types de dossier <span className="opacity-70">({types.length})</span>
        </button>
        <button
          onClick={() => setOnglet('fournis')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            onglet === 'fournis'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          📎 Dossiers fournis <span className="opacity-70">({fournis.length})</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            Chargement...
          </div>
        ) : liste.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-lg">Aucun {libelleOnglet.toLowerCase()} configuré</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Libellé</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {liste.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {item.id}
                  </td>
                  <td className="px-4 py-3">
                    {onglet === 'types' ? (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-mono font-medium">
                        {item.code}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        onglet === 'types' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.libelle?.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-800">{item.libelle}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() =>
                          setModal({ type: 'edit', cible: onglet, id: item.id, code: item.code, libelle: item.libelle })
                        }
                        title="Modifier"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() =>
                          setModal({ type: 'delete', cible: onglet, id: item.id, libelle: item.libelle })
                        }
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
        <LibelleModal
          titre={`➕ Nouveau ${libelleOnglet.toLowerCase()}`}
          showCode={modal.cible === 'types'}
          onSave={(data) => handleSave(data)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'edit' && (
        <LibelleModal
          titre={`✏️ Modifier — ${modal.libelle}`}
          initialCode={modal.code}
          initialLibelle={modal.libelle}
          showCode={modal.cible === 'types'}
          onSave={(data) => handleSave(data, modal.id)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'delete' && (
        <DeleteLibelleModal
          libelle={modal.libelle}
          onConfirm={() => handleDelete(modal.id)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MODAL : Créer / modifier (simple champ libellé)
// ══════════════════════════════════════════════════════════════
function LibelleModal({
  titre,
  initialCode = '',
  initialLibelle = '',
  showCode = false,
  onSave,
  onClose,
}: {
  titre: string;
  initialCode?: string;
  initialLibelle?: string;
  showCode?: boolean;
  onSave: (data: { code: string; libelle: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [code, setCode] = useState(initialCode);
  const [libelle, setLibelle] = useState(initialLibelle);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (showCode && !code.trim()) return setError('Le code est requis');
    if (!libelle.trim()) return setError('Le libellé est requis');
    setSaving(true);
    try {
      await onSave({ code: code.trim().toUpperCase(), libelle: libelle.trim() });
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
          <h2 className="text-lg font-bold text-gray-800">{titre}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}
          {showCode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ex: ACHAT, BORNAGE, CSSION…"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Libellé *</label>
            <input
              type="text"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder="ex: Demande de terrain, Certificat d'occupation…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

// ══════════════════════════════════════════════════════════════
// MODAL : Supprimer
// ══════════════════════════════════════════════════════════════
function DeleteLibelleModal({
  libelle,
  onConfirm,
  onClose,
}: {
  libelle: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-red-200 bg-red-50">
          <h2 className="text-lg font-bold text-red-800">🗑️ Supprimer</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-700">
            Êtes-vous sûr de vouloir supprimer <strong>{libelle}</strong> ?
          </p>
          <p className="text-xs text-red-600 mt-2">Cette information sera placer dans le corbeille.</p>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Annuler
            </button>
            <button
              onClick={async () => { setSaving(true); try { await onConfirm(); } catch { setSaving(false); } }}
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
