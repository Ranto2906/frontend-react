import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { proprieteService, lieuService, villeService } from '../../../services';
import type { Propriete, Lieu, Ville, PageResponse } from '../../../types';

type Modal =
  | { type: 'create' }
  | { type: 'edit'; propriete: Propriete }
  | { type: 'delete'; propriete: Propriete }
  | null;

export default function GestionPropriete() {
  const [proprietes, setProprietes] = useState<Propriete[]>([]);
  const [lieux, setLieux] = useState<Lieu[]>([]);
  const [villes, setVilles] = useState<Ville[]>([]);
  const [page, setPage] = useState<PageResponse<Propriete> | null>(null);
  const [search, setSearch] = useState('');
  const [selectedVille, setSelectedVille] = useState('');
  const [numero, setNumero] = useState('');
  const [localisation, setLocalisation] = useState('');
  const [selectedLieu, setSelectedLieu] = useState('');
  const [superficieMin, setSuperficieMin] = useState('');
  const [superficieMax, setSuperficieMax] = useState('');
  const [filtresVisibles, setFiltresVisibles] = useState(false);
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
      const filtresActifs = Boolean(
        search.trim() || selectedVille || numero.trim() || localisation.trim()
        || selectedLieu || superficieMin || superficieMax,
      );
      const [data, lieuxData, villesData] = await Promise.all([
        filtresActifs
          ? (selectedVille ? proprieteService.listerParVille(Number(selectedVille)) : proprieteService.lister(0, 500).then((result) => result.content)).then((items) => {
            const normalizedSearch = search.trim().toLowerCase();
            const normalizedNumero = numero.trim().toLowerCase();
            const normalizedLocalisation = localisation.trim().toLowerCase();
            const minimum = superficieMin ? Number(superficieMin) : undefined;
            const maximum = superficieMax ? Number(superficieMax) : undefined;
            const filteredItems = items.filter((item) => {
              const texte = [item.nom, item.numero, item.localisation, item.libelleLieu, item.nomVille]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
              if (normalizedSearch && !texte.includes(normalizedSearch)) return false;
              if (normalizedNumero && !(item.numero ?? '').toLowerCase().includes(normalizedNumero)) return false;
              if (normalizedLocalisation && !(item.localisation ?? '').toLowerCase().includes(normalizedLocalisation)) return false;
              if (selectedLieu && String(item.idLieu ?? '') !== selectedLieu) return false;
              if (minimum !== undefined && (!Number.isFinite(minimum) || (item.superficieTotale ?? -1) < minimum)) return false;
              if (maximum !== undefined && (!Number.isFinite(maximum) || (item.superficieTotale ?? Number.MAX_VALUE) > maximum)) return false;
              return true;
            });
            const size = 15;
            const start = currentPage * size;
            const content = filteredItems.slice(start, start + size);
            return {
              content,
              totalElements: filteredItems.length,
              totalPages: Math.ceil(filteredItems.length / size),
              size,
              number: currentPage,
              first: currentPage === 0,
              last: start + size >= filteredItems.length,
              empty: content.length === 0,
            };
          })
          : proprieteService.lister(currentPage, 15),
        lieuService.lister(),
        villeService.listerToutes(),
      ]);
      setPage(data);
      setProprietes(Array.isArray(data.content) ? data.content : []);
      setLieux(lieuxData);
      setVilles(villesData);
    } catch {
      showToast('Erreur lors du chargement des propriétés', false);
    } finally {
      setLoading(false);
    }
  }, [search, selectedVille, numero, localisation, selectedLieu, superficieMin, superficieMax, currentPage]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSearch = (value: string) => { setSearch(value); setCurrentPage(0); };
  const handleVilleChange = (value: string) => { setSelectedVille(value); setCurrentPage(0); };
  const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(0);
  };

  const handleCreate = async (data: { nom: string; numero?: string; localisation?: string; superficieTotale?: number; idLieu?: number }) => {
    try {
      await proprieteService.creer(data);
      showToast('Propriété créée avec succès');
      setModal(null);
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de la création', false);
    }
  };

  const handleUpdate = async (id: number, data: { nom: string; numero?: string; localisation?: string; superficieTotale?: number; idLieu?: number }) => {
    try {
      await proprieteService.modifier(id, data);
      showToast('Propriété mise à jour');
      setModal(null);
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de la mise à jour', false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await proprieteService.supprimer(id);
      showToast('Propriété supprimée');
      setModal(null);
      loadData();
    } catch {
      showToast('Erreur lors de la suppression', false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm transition-all ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/suivi" className="text-gray-400 hover:text-gray-600 text-sm transition-colors">← Retour</Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">🏘️ Gestion des Propriétés</h1>
          <p className="text-gray-500 text-sm mt-1">
            {page?.totalElements ?? 0} propriété{(page?.totalElements ?? 0) > 1 ? 's' : ''} au total
          </p>
        </div>
        <button onClick={() => setModal({ type: 'create' })} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors">
          <span>➕</span> Nouvelle propriété
        </button>
      </div>

      <div className="mb-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)} placeholder="🔍 Nom, numéro, lieu, localisation..." className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" />
          <select value={selectedVille} onChange={(e) => handleVilleChange(e.target.value)} className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm">
            <option value="">Toutes les villes</option>
            {villes.map((ville) => <option key={ville.idVille} value={ville.idVille}>{ville.nomVille}</option>)}
          </select>
          <button type="button" onClick={() => setFiltresVisibles((visible) => !visible)} className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-sm text-gray-700">
            {filtresVisibles ? 'Masquer les critères' : 'Plus de critères'}
          </button>
        </div>
        {filtresVisibles && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <input type="text" value={numero} onChange={(e) => handleFilterChange(setNumero)(e.target.value)} placeholder="Numéro" className="px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm" />
            <input type="text" value={localisation} onChange={(e) => handleFilterChange(setLocalisation)(e.target.value)} placeholder="Localisation" className="px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm" />
            <select value={selectedLieu} onChange={(e) => handleFilterChange(setSelectedLieu)(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm">
              <option value="">Tous les lieux</option>
              {lieux.map((lieu) => <option key={lieu.idLieu} value={lieu.idLieu}>{lieu.libelle}</option>)}
            </select>
            <div className="flex gap-2">
              <input type="number" min="0" value={superficieMin} onChange={(e) => handleFilterChange(setSuperficieMin)(e.target.value)} placeholder="Superficie min" className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm" />
              <input type="number" min="0" value={superficieMax} onChange={(e) => handleFilterChange(setSuperficieMax)(e.target.value)} placeholder="Superficie max" className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm" />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            Chargement...
          </div>
        ) : proprietes.length === 0 ? (
          <div className="p-12 text-center text-gray-400"><p className="text-lg">Aucune propriété trouvée</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nom</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Numéro</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ville</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Superficie</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Lieu</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Créé le</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {proprietes.map((p) => (
                <tr key={p.idPropriete} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.idPropriete}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-xs font-bold">{p.nom?.charAt(0).toUpperCase()}</div>
                      <span className="font-medium text-gray-800">{p.nom}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.numero || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{p.nomVille || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-right">{p.superficieTotale != null ? `${p.superficieTotale.toLocaleString('fr-FR')} m²` : '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.libelleLieu || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/suivi/proprietes/${p.idPropriete}`} title="Voir le détail" className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-600 transition-colors">👁️</Link>
                      <button onClick={() => setModal({ type: 'edit', propriete: p })} title="Modifier" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">✏️</button>
                      <button onClick={() => setModal({ type: 'delete', propriete: p })} title="Supprimer" className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors">🗑️</button>
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

      {modal?.type === 'create' && <CreateProprieteModal lieux={lieux} onSave={handleCreate} onClose={() => setModal(null)} />}
      {modal?.type === 'edit' && <EditProprieteModal propriete={modal.propriete} lieux={lieux} onSave={handleUpdate} onClose={() => setModal(null)} />}
      {modal?.type === 'delete' && <DeleteProprieteModal propriete={modal.propriete} onConfirm={handleDelete} onClose={() => setModal(null)} />}
    </div>
  );
}

function CreateProprieteModal({ lieux, onSave, onClose }: { lieux: Lieu[]; onSave: (data: { nom: string; numero?: string; localisation?: string; superficieTotale?: number; idLieu?: number }) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState({ nom: '', numero: '', localisation: '', superficieTotale: '', idLieu: 0 });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.nom.trim()) return setError('Le nom est requis');
    const superficieTotale = form.superficieTotale ? Number(form.superficieTotale) : undefined;
    if (superficieTotale !== undefined && (!Number.isFinite(superficieTotale) || superficieTotale < 0)) {
      return setError('La superficie doit être un nombre positif');
    }
    setSaving(true);
    try {
      await onSave({
        nom: form.nom.trim(),
        numero: form.numero.trim() || undefined,
        localisation: form.localisation.trim() || undefined,
        superficieTotale,
        idLieu: form.idLieu || undefined,
      });
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Erreur'); setSaving(false); }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-200"><h2 className="text-lg font-bold text-gray-800">➕ Nouvelle propriété</h2></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm border border-red-200">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input type="text" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} placeholder="ex: Terrain Anosizato" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Numéro</label><input type="text" value={form.numero} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} placeholder="ex: PR-001" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label><input type="text" value={form.localisation} onChange={(e) => setForm((f) => ({ ...f, localisation: e.target.value }))} placeholder="ex: Anosizato" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Superficie totale (m²)</label><input type="number" step="0.001" value={form.superficieTotale} onChange={(e) => setForm((f) => ({ ...f, superficieTotale: e.target.value }))} placeholder="ex: 1250.5" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lieu</label>
            <select value={form.idLieu || ''} onChange={(e) => setForm((f) => ({ ...f, idLieu: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
              <option value="">— Sélectionner —</option>
              {lieux.map((l) => <option key={l.idLieu} value={l.idLieu}>{l.libelle}{l.nomVille ? ` (${l.nomVille})` : ''}</option>)}
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

function EditProprieteModal({ propriete, lieux, onSave, onClose }: { propriete: Propriete; lieux: Lieu[]; onSave: (id: number, data: { nom: string; numero?: string; localisation?: string; superficieTotale?: number; idLieu?: number }) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState({ nom: propriete.nom, numero: propriete.numero || '', localisation: propriete.localisation || '', superficieTotale: propriete.superficieTotale?.toString() || '', idLieu: propriete.idLieu || 0 });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.nom.trim()) return setError('Le nom est requis');
    const superficieTotale = form.superficieTotale ? Number(form.superficieTotale) : undefined;
    if (superficieTotale !== undefined && (!Number.isFinite(superficieTotale) || superficieTotale < 0)) {
      return setError('La superficie doit être un nombre positif');
    }
    setSaving(true);
    try {
      await onSave(propriete.idPropriete, {
        nom: form.nom.trim(),
        numero: form.numero.trim() || undefined,
        localisation: form.localisation.trim() || undefined,
        superficieTotale,
        idLieu: form.idLieu || undefined,
      });
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Erreur'); setSaving(false); }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-200"><h2 className="text-lg font-bold text-gray-800">✏️ Modifier — {propriete.nom}</h2></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm border border-red-200">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input type="text" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Numéro</label><input type="text" value={form.numero} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label><input type="text" value={form.localisation} onChange={(e) => setForm((f) => ({ ...f, localisation: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Superficie totale (m²)</label><input type="number" step="0.001" value={form.superficieTotale} onChange={(e) => setForm((f) => ({ ...f, superficieTotale: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lieu</label>
            <select value={form.idLieu || ''} onChange={(e) => setForm((f) => ({ ...f, idLieu: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
              <option value="">— Sélectionner —</option>
              {lieux.map((l) => <option key={l.idLieu} value={l.idLieu}>{l.libelle}{l.nomVille ? ` (${l.nomVille})` : ''}</option>)}
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

function DeleteProprieteModal({ propriete, onConfirm, onClose }: { propriete: Propriete; onConfirm: (id: number) => Promise<void>; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-red-200 bg-red-50"><h2 className="text-lg font-bold text-red-800">🗑️ Supprimer la propriété</h2></div>
        <div className="p-6">
          <p className="text-sm text-gray-700">Êtes-vous sûr de vouloir supprimer la propriété <strong>{propriete.nom}</strong> ?</p>
          <p className="text-xs text-red-600 mt-2">Cette action est irréversible.</p>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Annuler</button>
            <button onClick={async () => { setSaving(true); try { await onConfirm(propriete.idPropriete); } catch { setSaving(false); } }} disabled={saving} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors">
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
