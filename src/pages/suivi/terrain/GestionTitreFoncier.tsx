import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { titreFoncierService, proprieteService } from '../../../services';
import type { TitreFoncier, Propriete, PageResponse } from '../../../types';

type Modal =
  | { type: 'create' }
  | { type: 'edit'; titre: TitreFoncier }
  | { type: 'delete'; titre: TitreFoncier }
  | null;

export default function GestionTitreFoncier() {
  const [titres, setTitres] = useState<TitreFoncier[]>([]);
  const [proprietes, setProprietes] = useState<Propriete[]>([]);
  const [page, setPage] = useState<PageResponse<TitreFoncier> | null>(null);
  const [search, setSearch] = useState('');
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
      const [data, propData] = await Promise.all([
        titreFoncierService.lister(currentPage, 15),
        proprieteService.lister(0, 200),
      ]);
      setPage(data);
      setTitres(data.content);
      setProprietes(propData.content);
    } catch {
      showToast('Erreur lors du chargement', false);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async (data: { numero: string; typeTitre?: string; zone?: string; localisation?: string; superficieTotale?: number; idPropriete: number }) => {
    try {
      await titreFoncierService.creer(data);
      showToast('Titre foncier créé avec succès');
      setModal(null);
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de la création', false);
    }
  };

  const handleUpdate = async (id: string, data: { numero: string; typeTitre?: string; zone?: string; localisation?: string; superficieTotale?: number; idPropriete: number }) => {
    try {
      await titreFoncierService.modifier(id, data);
      showToast('Titre foncier mis à jour');
      setModal(null);
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de la mise à jour', false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await titreFoncierService.supprimer(id);
      showToast('Titre foncier supprimé');
      setModal(null);
      loadData();
    } catch {
      showToast('Erreur lors de la suppression', false);
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-800">📄 Gestion des Titres Fonciers</h1>
          <p className="text-gray-500 text-sm mt-1">{page?.totalElements ?? 0} titre{(page?.totalElements ?? 0) > 1 ? 's' : ''} au total</p>
        </div>
        <button onClick={() => setModal({ type: 'create' })} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors">
          <span>➕</span> Nouveau titre
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            Chargement...
          </div>
        ) : titres.length === 0 ? (
          <div className="p-12 text-center text-gray-400"><p className="text-lg">Aucun titre foncier trouvé</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Numéro</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Zone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Localisation</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Superficie</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Propriété</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {titres.map((t) => (
                <tr key={t.idTitreFoncier} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{t.numero}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {t.typeTitre ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{t.typeTitre}</span> : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.zone || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{t.localisation || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-right">{t.superficieTotale ? `${t.superficieTotale} m²` : '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{t.nomPropriete || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setModal({ type: 'edit', titre: t })} title="Modifier" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">✏️</button>
                      <button onClick={() => setModal({ type: 'delete', titre: t })} title="Supprimer" className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors">🗑️</button>
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

      {modal?.type === 'create' && <CreateTitreModal proprietes={proprietes} onSave={handleCreate} onClose={() => setModal(null)} />}
      {modal?.type === 'edit' && <EditTitreModal titre={modal.titre} proprietes={proprietes} onSave={handleUpdate} onClose={() => setModal(null)} />}
      {modal?.type === 'delete' && <DeleteTitreModal titre={modal.titre} onConfirm={handleDelete} onClose={() => setModal(null)} />}
    </div>
  );
}

function CreateTitreModal({ proprietes, onSave, onClose }: { proprietes: Propriete[]; onSave: (data: { numero: string; typeTitre?: string; zone?: string; localisation?: string; superficieTotale?: number; idPropriete: number }) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState({ numero: '', typeTitre: '', zone: '', localisation: '', superficieTotale: '', idPropriete: 0 });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.numero.trim()) return setError('Le numéro est requis');
    if (!form.idPropriete) return setError('La propriété est requise');
    setSaving(true);
    try {
      await onSave({
        numero: form.numero.trim(),
        typeTitre: form.typeTitre || undefined,
        zone: form.zone || undefined,
        localisation: form.localisation || undefined,
        superficieTotale: form.superficieTotale ? Number(form.superficieTotale) : undefined,
        idPropriete: form.idPropriete,
      });
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Erreur'); setSaving(false); }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200"><h2 className="text-lg font-bold text-gray-800">➕ Nouveau titre foncier</h2></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm border border-red-200">{error}</div>}
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Numéro *</label><input type="text" value={form.numero} onChange={(e) => set('numero', e.target.value)} placeholder="ex: TF-2024-001" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Type de titre</label><input type="text" value={form.typeTitre} onChange={(e) => set('typeTitre', e.target.value)} placeholder="ex: Certificat foncier" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Zone</label><input type="text" value={form.zone} onChange={(e) => set('zone', e.target.value)} placeholder="ex: Zone résidentielle" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label><input type="text" value={form.localisation} onChange={(e) => set('localisation', e.target.value)} placeholder="ex: Analakely" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Superficie totale (m²)</label><input type="number" value={form.superficieTotale} onChange={(e) => set('superficieTotale', e.target.value)} placeholder="ex: 5000" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Propriété *</label>
            <select value={form.idPropriete || ''} onChange={(e) => setForm((f) => ({ ...f, idPropriete: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
              <option value="">— Sélectionner —</option>
              {proprietes.map((p) => <option key={p.idPropriete} value={p.idPropriete}>{p.nom}</option>)}
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

function EditTitreModal({ titre, proprietes, onSave, onClose }: { titre: TitreFoncier; proprietes: Propriete[]; onSave: (id: string, data: { numero: string; typeTitre?: string; zone?: string; localisation?: string; superficieTotale?: number; idPropriete: number }) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState({ numero: titre.numero, typeTitre: titre.typeTitre || '', zone: titre.zone || '', localisation: titre.localisation || '', superficieTotale: titre.superficieTotale?.toString() || '', idPropriete: titre.idPropriete });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.numero.trim()) return setError('Le numéro est requis');
    if (!form.idPropriete) return setError('La propriété est requise');
    setSaving(true);
    try {
      await onSave(titre.idTitreFoncier, {
        numero: form.numero.trim(),
        typeTitre: form.typeTitre || undefined,
        zone: form.zone || undefined,
        localisation: form.localisation || undefined,
        superficieTotale: form.superficieTotale ? Number(form.superficieTotale) : undefined,
        idPropriete: form.idPropriete,
      });
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Erreur'); setSaving(false); }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200"><h2 className="text-lg font-bold text-gray-800">✏️ Modifier — {titre.numero}</h2></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm border border-red-200">{error}</div>}
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Numéro *</label><input type="text" value={form.numero} onChange={(e) => set('numero', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Type de titre</label><input type="text" value={form.typeTitre} onChange={(e) => set('typeTitre', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Zone</label><input type="text" value={form.zone} onChange={(e) => set('zone', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label><input type="text" value={form.localisation} onChange={(e) => set('localisation', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Superficie totale (m²)</label><input type="number" value={form.superficieTotale} onChange={(e) => set('superficieTotale', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Propriété *</label>
            <select value={form.idPropriete || ''} onChange={(e) => setForm((f) => ({ ...f, idPropriete: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
              <option value="">— Sélectionner —</option>
              {proprietes.map((p) => <option key={p.idPropriete} value={p.idPropriete}>{p.nom}</option>)}
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

function DeleteTitreModal({ titre, onConfirm, onClose }: { titre: TitreFoncier; onConfirm: (id: string) => Promise<void>; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-red-200 bg-red-50"><h2 className="text-lg font-bold text-red-800">🗑️ Supprimer le titre foncier</h2></div>
        <div className="p-6">
          <p className="text-sm text-gray-700">Êtes-vous sûr de vouloir supprimer le titre foncier <strong>{titre.numero}</strong> ?</p>
          <p className="text-xs text-red-600 mt-2">Cette action est irréversible.</p>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Annuler</button>
            <button onClick={async () => { setSaving(true); try { await onConfirm(titre.idTitreFoncier); } catch { setSaving(false); } }} disabled={saving} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors">
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
