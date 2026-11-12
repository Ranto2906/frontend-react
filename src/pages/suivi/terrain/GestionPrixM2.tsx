import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { prixM2Service, villeService } from '../../../services';
import type { PrixM2, Ville, PageResponse } from '../../../types';
import { msgErreur } from '../../../utils';

type Modal =
  | { type: 'create' }
  | { type: 'edit'; prix: PrixM2 }
  | { type: 'delete'; prix: PrixM2 }
  | null;

export default function GestionPrixM2() {
  const [prixList, setPrixList] = useState<PrixM2[]>([]);
  const [villes, setVilles] = useState<Ville[]>([]);
  const [page, setPage] = useState<PageResponse<PrixM2> | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
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
      const [data, villesData] = await Promise.all([
        prixM2Service.lister(currentPage, 15),
        villeService.listerToutes(),
      ]);
      setPage(data);
      setPrixList(data.content);
      setVilles(villesData);
    } catch {
      showToast('Erreur lors du chargement', false);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async (data: { prixTtc: number; prixHt?: number; observation?: string; idVille: number }) => {
    try {
      await prixM2Service.creer(data);
      showToast('Prix créé avec succès');
      setModal(null);
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de la création', false);
    }
  };

  const handleUpdate = async (id: number, data: { prixTtc: number; prixHt?: number; observation?: string; idVille: number }) => {
    try {
      await prixM2Service.modifier(id, data);
      showToast('Prix mis à jour');
      setModal(null);
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de la mise à jour', false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await prixM2Service.supprimer(id);
      showToast('Prix supprimé');
      setModal(null);
      loadData();
    } catch (err) {
      showToast(msgErreur(err, 'Erreur lors de la suppression'), false);
      // La fenêtre de confirmation reste sinon bloquée sur « Suppression... »
      setModal(null);
    }
  };

  const getVilleNom = (idVille: number) => villes.find((v) => v.idVille === idVille)?.nomVille || '—';

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm transition-all ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>{toast.msg}</div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/suivi" className="text-gray-400 hover:text-gray-600 text-sm transition-colors">← Retour</Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">💰 Prix au M²</h1>
          <p className="text-gray-500 text-sm mt-1">{page?.totalElements ?? 0} prix au total</p>
        </div>
        <button onClick={() => setModal({ type: 'create' })} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors">
          <span>➕</span> Nouveau prix
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            Chargement...
          </div>
        ) : prixList.length === 0 ? (
          <div className="p-12 text-center text-gray-400"><p className="text-lg">Aucun prix trouvé</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ville</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Prix TTC</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Prix HT</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Observation</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date MAJ</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {prixList.map((p) => (
                <tr key={p.idPrix} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.idPrix}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">🏘️</div>
                      <span className="font-medium text-gray-800">{p.nomVille || getVilleNom(p.idVille)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-800 font-semibold text-right">{p.prixTtc?.toLocaleString('fr-FR')} Ar</td>
                  <td className="px-4 py-3 text-gray-600 text-right">{p.prixHt ? `${p.prixHt.toLocaleString('fr-FR')} Ar` : '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-[200px] truncate">{p.observation || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {p.dateMaj ? new Date(p.dateMaj).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/suivi/prix-m2/${p.idPrix}`} title="Historique" className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors">📜</Link>
                      <button onClick={() => setModal({ type: 'edit', prix: p })} title="Modifier" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">✏️</button>
                      <button onClick={() => setModal({ type: 'delete', prix: p })} title="Supprimer" className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {page && page.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">Page {page.number + 1} sur {page.totalPages}</p>
            <div className="flex gap-1">
              <button disabled={page.first} onClick={() => setCurrentPage((p) => p - 1)} className="px-3 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">← Précédent</button>
              <button disabled={page.last} onClick={() => setCurrentPage((p) => p + 1)} className="px-3 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">Suivant →</button>
            </div>
          </div>
        )}
      </div>

      {modal?.type === 'create' && <CreatePrixModal villes={villes} onSave={handleCreate} onClose={() => setModal(null)} />}
      {modal?.type === 'edit' && <EditPrixModal prix={modal.prix} villes={villes} onSave={handleUpdate} onClose={() => setModal(null)} />}
      {modal?.type === 'delete' && <DeletePrixModal prix={modal.prix} onConfirm={handleDelete} onClose={() => setModal(null)} />}
    </div>
  );
}

function recalcTtc(ht: string, tvaPct: string): string {
  const htVal = ht === '' ? NaN : Number(ht);
  const tvaVal = tvaPct === '' ? NaN : Number(tvaPct);
  if (Number.isFinite(htVal) && htVal > 0 && Number.isFinite(tvaVal) && tvaVal >= 0) {
    return String(Math.round(htVal * (1 + tvaVal / 100) * 100) / 100);
  }
  return '';
}

function CreatePrixModal({ villes, onSave, onClose }: { villes: Ville[]; onSave: (data: { prixTtc: number; prixHt?: number; observation?: string; idVille: number }) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState({ prixTtc: '', prixHt: '', tauxTva: '20', observation: '', idVille: 0 });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleHtChange = (value: string) => {
    setForm((f) => {
      const ttc = recalcTtc(value, f.tauxTva);
      return { ...f, prixHt: value, prixTtc: ttc || f.prixTtc };
    });
  };

  const handleTvaChange = (value: string) => {
    setForm((f) => {
      const ttc = recalcTtc(f.prixHt, value);
      return { ...f, tauxTva: value, prixTtc: ttc || f.prixTtc };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.prixTtc.trim()) return setError('Le prix TTC est requis');
    if (!form.idVille) return setError('La ville est requise');
    setSaving(true);
    try {
      await onSave({
        prixTtc: Number(form.prixTtc),
        prixHt: form.prixHt ? Number(form.prixHt) : undefined,
        observation: form.observation || undefined,
        idVille: form.idVille,
      });
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Erreur'); setSaving(false); }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-200"><h2 className="text-lg font-bold text-gray-800">➕ Nouveau prix au m²</h2></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm border border-red-200">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
            <select value={form.idVille || ''} onChange={(e) => setForm((f) => ({ ...f, idVille: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
              <option value="">— Sélectionner —</option>
              {villes.map((v) => <option key={v.idVille} value={v.idVille}>{v.nomVille}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Prix HT (Ar) *</label><input type="number" step="0.01" min="0" value={form.prixHt} onChange={(e) => handleHtChange(e.target.value)} placeholder="ex: 130434.78" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Taux TVA (%) *</label><input type="number" step="0.01" min="0" value={form.tauxTva} onChange={(e) => handleTvaChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Prix TTC (Ar) *</label><input type="number" step="0.01" min="0" value={form.prixTtc} onChange={(e) => setForm((f) => ({ ...f, prixTtc: e.target.value }))} placeholder="Calculé automatiquement" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /><p className="text-xs text-gray-400 mt-1">Calculé automatiquement : HT × (1 + TVA %)</p></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Observation</label><input type="text" value={form.observation} onChange={(e) => setForm((f) => ({ ...f, observation: e.target.value }))} placeholder="ex: Prix révisé Janvier 2026" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Annuler</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors">{saving ? 'Création...' : 'Créer'}</button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

function EditPrixModal({ prix, villes, onSave, onClose }: { prix: PrixM2; villes: Ville[]; onSave: (id: number, data: { prixTtc: number; prixHt?: number; observation?: string; idVille: number }) => Promise<void>; onClose: () => void }) {
  // Essayer de déduire la TVA existante : si HT et TTC sont renseignés, TVA = (TTC/HT - 1) × 100
  const inferTva = (): string => {
    if (prix.prixHt && prix.prixTtc && prix.prixHt > 0) {
      const tva = Math.round(((prix.prixTtc / prix.prixHt) - 1) * 100 * 100) / 100;
      return String(tva);
    }
    return '20';
  };
  const [form, setForm] = useState({ prixTtc: prix.prixTtc?.toString() || '', prixHt: prix.prixHt?.toString() || '', tauxTva: inferTva(), observation: prix.observation || '', idVille: prix.idVille });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleHtChange = (value: string) => {
    setForm((f) => {
      const ttc = recalcTtc(value, f.tauxTva);
      return { ...f, prixHt: value, prixTtc: ttc || f.prixTtc };
    });
  };

  const handleTvaChange = (value: string) => {
    setForm((f) => {
      const ttc = recalcTtc(f.prixHt, value);
      return { ...f, tauxTva: value, prixTtc: ttc || f.prixTtc };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.prixTtc.trim()) return setError('Le prix TTC est requis');
    if (!form.idVille) return setError('La ville est requise');
    setSaving(true);
    try {
      await onSave(prix.idPrix, {
        prixTtc: Number(form.prixTtc),
        prixHt: form.prixHt ? Number(form.prixHt) : undefined,
        observation: form.observation || undefined,
        idVille: form.idVille,
      });
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Erreur'); setSaving(false); }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-200"><h2 className="text-lg font-bold text-gray-800">✏️ Modifier le prix</h2></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm border border-red-200">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
            <select value={form.idVille || ''} onChange={(e) => setForm((f) => ({ ...f, idVille: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
              <option value="">— Sélectionner —</option>
              {villes.map((v) => <option key={v.idVille} value={v.idVille}>{v.nomVille}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Prix HT (Ar) *</label><input type="number" step="0.01" min="0" value={form.prixHt} onChange={(e) => handleHtChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Taux TVA (%) *</label><input type="number" step="0.01" min="0" value={form.tauxTva} onChange={(e) => handleTvaChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Prix TTC (Ar) *</label><input type="number" step="0.01" min="0" value={form.prixTtc} onChange={(e) => setForm((f) => ({ ...f, prixTtc: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /><p className="text-xs text-gray-400 mt-1">Calculé automatiquement : HT × (1 + TVA %)</p></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Observation</label><input type="text" value={form.observation} onChange={(e) => setForm((f) => ({ ...f, observation: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Annuler</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

function DeletePrixModal({ prix, onConfirm, onClose }: { prix: PrixM2; onConfirm: (id: number) => Promise<void>; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-red-200 bg-red-50"><h2 className="text-lg font-bold text-red-800">🗑️ Supprimer le prix</h2></div>
        <div className="p-6">
          <p className="text-sm text-gray-700">Êtes-vous sûr de vouloir supprimer ce prix au m² pour <strong>{prix.nomVille}</strong> ?</p>
          <p className="text-xs text-red-600 mt-2">Cette information sera placer dans le corbeille.</p>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Annuler</button>
            <button onClick={async () => { setSaving(true); try { await onConfirm(prix.idPrix); } catch { setSaving(false); } }} disabled={saving} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors">
              {saving ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="relative z-50 w-full max-w-lg px-4" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
