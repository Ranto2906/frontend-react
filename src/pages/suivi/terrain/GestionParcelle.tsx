import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { parcelleService, titreFoncierService } from '../../../services';
import type { Parcelle, TitreFoncier, PageResponse } from '../../../types';

type Modal =
  | { type: 'create' }
  | { type: 'edit'; parcelle: Parcelle }
  | { type: 'delete'; parcelle: Parcelle }
  | null;

export default function GestionParcelle() {
  const [parcelles, setParcelles] = useState<Parcelle[]>([]);
  const [titres, setTitres] = useState<TitreFoncier[]>([]);
  const [page, setPage] = useState<PageResponse<Parcelle> | null>(null);
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
      const [data, titresData] = await Promise.all([
        parcelleService.lister(currentPage, 15),
        titreFoncierService.lister(0, 200),
      ]);
      setPage(data);
      setParcelles(data.content);
      setTitres(titresData.content);
    } catch {
      showToast('Erreur lors du chargement', false);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async (data: { numeroLot?: string; superficieM2?: number; observation?: string; idTitreFoncier: string }) => {
    try {
      await parcelleService.creer(data);
      showToast('Parcelle créée avec succès');
      setModal(null);
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de la création', false);
    }
  };

  const handleUpdate = async (id: string, data: { numeroLot?: string; superficieM2?: number; observation?: string; idTitreFoncier: string }) => {
    try {
      await parcelleService.modifier(id, data);
      showToast('Parcelle mise à jour');
      setModal(null);
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de la mise à jour', false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await parcelleService.supprimer(id);
      showToast('Parcelle supprimée');
      setModal(null);
      loadData();
    } catch {
      showToast('Erreur lors de la suppression', false);
    }
  };

  const getTitreNumero = (idTitre: string) => titres.find((t) => t.idTitreFoncier === idTitre)?.numero || '—';

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
          <h1 className="text-2xl font-bold text-gray-800">🗺️ Gestion des Parcelles</h1>
          <p className="text-gray-500 text-sm mt-1">{page?.totalElements ?? 0} parcelle{(page?.totalElements ?? 0) > 1 ? 's' : ''} au total</p>
        </div>
        <button onClick={() => setModal({ type: 'create' })} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors">
          <span>➕</span> Nouvelle parcelle
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            Chargement...
          </div>
        ) : parcelles.length === 0 ? (
          <div className="p-12 text-center text-gray-400"><p className="text-lg">Aucune parcelle trouvée</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Numéro Lot</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Superficie (m²)</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Observation</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Titre Foncier</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {parcelles.map((p) => (
                <tr key={p.idParcelle} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{p.idParcelle?.substring(0, 8)}...</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-xs font-bold">🗺️</div>
                      <span className="font-medium text-gray-800">{p.numeroLot || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-800 font-semibold text-right">{p.superficieM2 ? p.superficieM2.toLocaleString('fr-FR') : '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-[200px] truncate">{p.observation || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.numeroTitre || getTitreNumero(p.idTitreFoncier)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setModal({ type: 'edit', parcelle: p })} title="Modifier" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">✏️</button>
                      <button onClick={() => setModal({ type: 'delete', parcelle: p })} title="Supprimer" className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors">🗑️</button>
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

      {modal?.type === 'create' && <CreateParcelleModal titres={titres} onSave={handleCreate} onClose={() => setModal(null)} />}
      {modal?.type === 'edit' && <EditParcelleModal parcelle={modal.parcelle} titres={titres} onSave={handleUpdate} onClose={() => setModal(null)} />}
      {modal?.type === 'delete' && <DeleteParcelleModal parcelle={modal.parcelle} onConfirm={handleDelete} onClose={() => setModal(null)} />}
    </div>
  );
}

function CreateParcelleModal({ titres, onSave, onClose }: { titres: TitreFoncier[]; onSave: (data: { numeroLot?: string; superficieM2?: number; observation?: string; idTitreFoncier: string }) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState({ numeroLot: '', superficieM2: '', observation: '', idTitreFoncier: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.idTitreFoncier) return setError('Le titre foncier est requis');
    setSaving(true);
    try {
      await onSave({
        numeroLot: form.numeroLot || undefined,
        superficieM2: form.superficieM2 ? Number(form.superficieM2) : undefined,
        observation: form.observation || undefined,
        idTitreFoncier: form.idTitreFoncier,
      });
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Erreur'); setSaving(false); }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-200"><h2 className="text-lg font-bold text-gray-800">➕ Nouvelle parcelle</h2></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm border border-red-200">{error}</div>}
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Numéro de lot</label><input type="text" value={form.numeroLot} onChange={(e) => set('numeroLot', e.target.value)} placeholder="ex: LOT-001" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Superficie (m²)</label><input type="number" step="0.01" value={form.superficieM2} onChange={(e) => set('superficieM2', e.target.value)} placeholder="ex: 500" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Observation</label><input type="text" value={form.observation} onChange={(e) => set('observation', e.target.value)} placeholder="ex: Parcelle coin nord" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre foncier *</label>
            <select value={form.idTitreFoncier} onChange={(e) => set('idTitreFoncier', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
              <option value="">— Sélectionner —</option>
              {titres.map((t) => <option key={t.idTitreFoncier} value={t.idTitreFoncier}>{t.numero}{t.nomPropriete ? ` (${t.nomPropriete})` : ''}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Annuler</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors">{saving ? 'Création...' : 'Créer'}</button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

function EditParcelleModal({ parcelle, titres, onSave, onClose }: { parcelle: Parcelle; titres: TitreFoncier[]; onSave: (id: string, data: { numeroLot?: string; superficieM2?: number; observation?: string; idTitreFoncier: string }) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState({ numeroLot: parcelle.numeroLot || '', superficieM2: parcelle.superficieM2?.toString() || '', observation: parcelle.observation || '', idTitreFoncier: parcelle.idTitreFoncier });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.idTitreFoncier) return setError('Le titre foncier est requis');
    setSaving(true);
    try {
      await onSave(parcelle.idParcelle, {
        numeroLot: form.numeroLot || undefined,
        superficieM2: form.superficieM2 ? Number(form.superficieM2) : undefined,
        observation: form.observation || undefined,
        idTitreFoncier: form.idTitreFoncier,
      });
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Erreur'); setSaving(false); }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-200"><h2 className="text-lg font-bold text-gray-800">✏️ Modifier — {parcelle.numeroLot || parcelle.idParcelle?.substring(0, 8)}</h2></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm border border-red-200">{error}</div>}
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Numéro de lot</label><input type="text" value={form.numeroLot} onChange={(e) => set('numeroLot', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Superficie (m²)</label><input type="number" step="0.01" value={form.superficieM2} onChange={(e) => set('superficieM2', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Observation</label><input type="text" value={form.observation} onChange={(e) => set('observation', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre foncier *</label>
            <select value={form.idTitreFoncier} onChange={(e) => set('idTitreFoncier', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
              <option value="">— Sélectionner —</option>
              {titres.map((t) => <option key={t.idTitreFoncier} value={t.idTitreFoncier}>{t.numero}{t.nomPropriete ? ` (${t.nomPropriete})` : ''}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Annuler</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

function DeleteParcelleModal({ parcelle, onConfirm, onClose }: { parcelle: Parcelle; onConfirm: (id: string) => Promise<void>; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-red-200 bg-red-50"><h2 className="text-lg font-bold text-red-800">🗑️ Supprimer la parcelle</h2></div>
        <div className="p-6">
          <p className="text-sm text-gray-700">Êtes-vous sûr de vouloir supprimer la parcelle <strong>{parcelle.numeroLot || parcelle.idParcelle?.substring(0, 8)}</strong> ?</p>
          <p className="text-xs text-red-600 mt-2">Cette action est irréversible.</p>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Annuler</button>
            <button onClick={async () => { setSaving(true); try { await onConfirm(parcelle.idParcelle); } catch { setSaving(false); } }} disabled={saving} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors">
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
