import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { descenteTerrainService } from '../../services';
import type { DescenteTerrainDTO, DescenteTerrainRequest, DossierDescenteResult, PageResponse } from '../../types';
import { msgErreur } from '../../utils';

type Modal = { type: 'delete'; d: DescenteTerrainDTO } | null;

/** Vrai si la descente n'est rattachée à aucun dossier (ex. descente hors ligne synchronisée). */
function estNonLiee(d: DescenteTerrainDTO): boolean {
  return !d.idDossierParcelle;
}

/** Couleurs des statuts de constat relevés sur le terrain. */
const COULEURS_CONSTAT: Record<string, string> = {
  faisable: '#059669',
  'non faisable': '#dc2626',
  'sous réserve': '#b7791f',
};

/** Couleurs des états de validation administrative. */
const COULEURS_VALIDATION: Record<string, string> = {
  "bon pour la suite": '#059669',
  "en instance": '#f59e0b',
};

const STATUTS_CONSTAT = ['Faisable', 'Non faisable', 'Sous réserve'];

const STATUTS_VALIDATION = ['Bon pour la suite', 'En instance'];

function couleur(couleurs: Record<string, string>, valeur?: string): string {
  return couleurs[(valeur || '').toLowerCase()] || '#6b7280';
}

function formatDate(d?: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR');
}

export default function DescentesTerrain() {
  const navigate = useNavigate();
  const location = useLocation();

  const [list, setList] = useState<DescenteTerrainDTO[]>([]);
  const [page, setPage] = useState<PageResponse<DescenteTerrainDTO> | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [associer, setAssocier] = useState<DescenteTerrainDTO | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Filtres
  const [search, setSearch] = useState('');
  const [filterConstat, setFilterConstat] = useState('');
  const [filterValidation, setFilterValidation] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [filtresVisibles, setFiltresVisibles] = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // Toast transmis par les pages formulaire / détail
  useEffect(() => {
    const st = location.state as { toast?: { msg: string; ok: boolean } } | null;
    if (st?.toast) showToast(st.toast.msg, st.toast.ok ?? true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // ── Chargement : recherche serveur puis affinage local ──
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const source: DescenteTerrainDTO[] = search.trim()
        ? (await descenteTerrainService.rechercher(search.trim(), 0, 500)).content
        : (await descenteTerrainService.lister(0, 500)).content;

      const resultat = source.filter((d) => {
        if (filterConstat && (d.statutConstat || '') !== filterConstat) return false;
        if (filterValidation && (d.validation || '') !== filterValidation) return false;
        if (dateDebut && (!d.dateDescente || d.dateDescente < dateDebut)) return false;
        if (dateFin && (!d.dateDescente || d.dateDescente > dateFin)) return false;
        return true;
      });

      const size = 15;
      const totalPages = Math.max(1, Math.ceil(resultat.length / size));
      const pageClampee = Math.min(currentPage, totalPages - 1);
      const slice = resultat.slice(pageClampee * size, pageClampee * size + size);
      setList(slice);
      setPage({
        content: slice,
        totalElements: resultat.length,
        totalPages,
        size,
        number: pageClampee,
        first: pageClampee === 0,
        last: pageClampee >= totalPages - 1,
        empty: resultat.length === 0,
      });
    } catch {
      showToast('Erreur lors du chargement des descentes', false);
    } finally {
      setLoading(false);
    }
  }, [search, filterConstat, filterValidation, dateDebut, dateFin, currentPage]);

  useEffect(() => { load(); }, [load]);

  // ── Suppression ──
  const handleDelete = async (id: string) => {
    try {
      await descenteTerrainService.supprimer(id);
      showToast('Descente supprimée');
      setModal(null);
      load();
    } catch (err) {
      showToast(msgErreur(err, 'Erreur lors de la suppression'), false);
      setModal(null);
    }
  };

  // ── Association à un dossier ──
  const handleAssocie = async (d: DescenteTerrainDTO, r: DossierDescenteResult) => {
    // Le PUT met à jour uniquement les champs fournis : on renvoie l'existant
    // + la liaison sélectionnée (ligne dossier_parcelle + demandeur principal).
    const payload: DescenteTerrainRequest = {
      dateDescente: d.dateDescente || new Date().toISOString().slice(0, 10),
      statutConstat: d.statutConstat,
      mode: d.mode,
      validation: d.validation,
      idPersonne: r.demandeurId,
      idDossierParcelle: r.idDossierParcelle,
    };
    try {
      await descenteTerrainService.modifier(d.idDescente, payload);
      showToast(`Descente ${d.reference || ''} associée au dossier ${r.numeroDossier || r.idDossierParcelle}`);
      setAssocier(null);
      setCurrentPage(0);
      load();
    } catch {
      showToast('Erreur lors de l\'association au dossier', false);
    }
  };

  const nbFiltresActifs = useMemo(
    () => [search, filterConstat, filterValidation, dateDebut, dateFin].filter((v) => v).length,
    [search, filterConstat, filterValidation, dateDebut, dateFin],
  );

  const reinitialiserFiltres = () => {
    setSearch(''); setFilterConstat(''); setFilterValidation('');
    setDateDebut(''); setDateFin(''); setCurrentPage(0);
  };

  const total = page?.totalElements ?? list.length;

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
          <h1 className="text-2xl font-bold text-gray-800">🥾 Descentes terrain</h1>
          <p className="text-gray-500 text-sm mt-1">
            {total} descente{total > 1 ? 's' : ''} — constats, observations et validations des sorties d'agents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/gestion-mobile"
            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 rounded-lg font-medium text-sm transition-colors"
          >
            ← Gestion mobile
          </Link>
          <button
            onClick={() => navigate('/descentes-terrain/nouveau')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
          >
            <span>➕</span> Nouvelle descente
          </button>
        </div>
      </div>

      {/* Barre de recherche + bouton filtres */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(0); }}
          placeholder="🔍 Rechercher (référence, observation, dossier, propriétaire, lot, agent...)"
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm"
        />
        <button
          onClick={() => setFiltresVisibles((v) => !v)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            filtresVisibles || nbFiltresActifs > 0
              ? 'bg-amber-100 text-amber-700 border border-amber-300'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          🎛️ Filtres
          {nbFiltresActifs > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-600 text-white text-xs">
              {nbFiltresActifs}
            </span>
          )}
        </button>
        {nbFiltresActifs > 0 && (
          <button
            onClick={reinitialiserFiltres}
            className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ✕ Réinitialiser
          </button>
        )}
      </div>

      {/* Filtres multicritères */}
      {filtresVisibles && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Constat</label>
            <select
              value={filterConstat}
              onChange={(e) => { setFilterConstat(e.target.value); setCurrentPage(0); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="">Tous les constats</option>
              {STATUTS_CONSTAT.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Validation</label>
            <select
              value={filterValidation}
              onChange={(e) => { setFilterValidation(e.target.value); setCurrentPage(0); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="">Toutes les validations</option>
              {STATUTS_VALIDATION.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Du</label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => { setDateDebut(e.target.value); setCurrentPage(0); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Au</label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => { setDateFin(e.target.value); setCurrentPage(0); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
        </div>
      )}

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-3"></div>
            Chargement...
          </div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-lg">Aucune descente trouvée</p>
            <p className="text-sm mt-1">
              {nbFiltresActifs > 0
                ? 'Ajustez vos filtres de recherche.'
                : 'Les sorties des agents sur le terrain apparaîtront ici — créez la première descente.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Référence</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Dossier</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Demandeur</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ville</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Constat</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Validation</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((d) => (
                <tr key={d.idDescente} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      to={`/descentes-terrain/${d.idDescente}`}
                      className="font-medium text-gray-800 hover:text-amber-600 hover:underline"
                    >
                      {d.reference || d.idDescente.slice(0, 8)}
                    </Link>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      {d.mode === 'offline' ? '📴 Hors ligne' : '🌐 En ligne'}
                      {d.observation && <span className="truncate max-w-[180px]">· {d.observation}</span>}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {d.numeroDossier || '—'}
                    {estNonLiee(d) && (
                      <button
                        onClick={() => setAssocier(d)}
                        className="mt-1 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-700 text-xs font-medium transition-colors"
                      >
                        🔗 Associer à un dossier
                      </button>
                    )}
                    {(d.numeroLot || d.numeroPropriete) && (
                      <p className="text-xs text-gray-400">
                        {d.numeroLot ? `Lot ${d.numeroLot}` : ''}
                        {d.numeroLot && d.numeroPropriete ? ' · ' : ''}
                        {d.numeroPropriete ? `Prop. ${d.numeroPropriete}` : ''}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{d.nomPersonne || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">🏙️ {d.nomVille || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(d.dateDescente)}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
                      style={{ background: couleur(COULEURS_CONSTAT, d.statutConstat) }}
                    >
                      {d.statutConstat || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
                      style={{ background: couleur(COULEURS_VALIDATION, d.validation) }}
                    >
                      {d.validation || '—'}
                    </span>
                    {d.dateValidation && (
                      <p className="text-[10px] text-gray-400 mt-1">{formatDate(d.dateValidation)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`/descentes-terrain/${d.idDescente}`}
                        title="Détail & validation"
                        className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"
                      >
                        📜
                      </Link>
                      <Link
                        to={`/descentes-terrain/${d.idDescente}/modifier`}
                        title="Modifier"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                      >
                        ✏️
                      </Link>
                      <button
                        onClick={() => setModal({ type: 'delete', d })}
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
              Page {page.number + 1} sur {page.totalPages} — {page.totalElements} résultat{page.totalElements > 1 ? 's' : ''}
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

      {/* ── Modal suppression ── */}
      {modal?.type === 'delete' && (
        <DeleteModal d={modal.d} onConfirm={handleDelete} onClose={() => setModal(null)} />
      )}

      {/* ── Modal association à un dossier ── */}
      {associer && (
        <AssocierDossierModal
          d={associer}
          onAssocier={handleAssocie}
          onClose={() => setAssocier(null)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MODAL : Confirmer la suppression
// ══════════════════════════════════════════════════════════════
function DeleteModal({
  d,
  onConfirm,
  onClose,
}: {
  d: DescenteTerrainDTO;
  onConfirm: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(d.idDescente);
    } catch {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
        <div className="px-6 py-4 border-b border-red-200 bg-red-50">
          <h2 className="text-lg font-bold text-red-800">🗑️ Supprimer la descente</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-700">
            Supprimer définitivement la descente{' '}
            <strong>{d.reference || d.idDescente.slice(0, 8)}</strong>
            {d.numeroDossier ? ` (dossier ${d.numeroDossier})` : ''} ?
          </p>
          <p className="text-xs text-red-600 mt-2">
            Cette information sera placer dans le corbeille. La géométrie GPS associée sera également supprimée.
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
// MODAL : Associer une descente non liée à un dossier existant
// ══════════════════════════════════════════════════════════════
const DEBOUNCE_MS = 300;

function AssocierDossierModal({
  d,
  onAssocier,
  onClose,
}: {
  d: DescenteTerrainDTO;
  onAssocier: (d: DescenteTerrainDTO, r: DossierDescenteResult) => Promise<void>;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<DossierDescenteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<DossierDescenteResult | null>(null);
  const [saving, setSaving] = useState(false);

  // Recherche avec debounce — pré-remplie avec le numéro saisi hors ligne
  // si l'utilisateur lance la recherche sans rien taper.
  const lancerRecherche = useCallback(async (term: string) => {
    setLoading(true);
    try {
      setResults(await descenteTerrainService.rechercherDossiers(term.trim()));
      setSearched(true);
    } catch {
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset local (résultats) dès que la saisie repasse sous 2 caractères —
  // l'effet ci-dessous ne gère que l'appel réseau différé.
  const changerRecherche = (v: string) => {
    setSearch(v);
    if (v.trim().length < 2) {
      setResults([]);
      setSearched(false);
    }
  };

  // Recherche différée — évite de charger toute la table au montage :
  // il faut au moins 2 caractères (n° de dossier, nom, lot, date...).
  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) return undefined;
    const t = setTimeout(() => {
      lancerRecherche(term);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search, lancerRecherche]);

  const handleAssocier = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await onAssocier(d, selected);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-auto max-h-[85vh] flex flex-col">
        {/* En-tête */}
        <div className="px-6 py-4 border-b border-amber-200 bg-amber-50">
          <h2 className="text-lg font-bold text-amber-800">🔗 Associer à un dossier</h2>
          <p className="text-xs text-amber-700 mt-0.5">
            Descente <strong>{d.reference || d.idDescente.slice(0, 8)}</strong>
            {d.dateDescente ? ` du ${formatDate(d.dateDescente)}` : ''} — aucun dossier rattaché.
          </p>
        </div>

        {/* Recherche */}
        <div className="p-5 pb-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Rechercher un dossier — n° de dossier, demandeur, propriété, parcelle, ville ou date de demande
          </label>
          <input
            type="text"
            autoFocus
            value={search}
            onChange={(e) => changerRecherche(e.target.value)}
            placeholder="Ex. DOS-2026-00125, nom du demandeur, n° de lot..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            Astuce : saisissez le numéro de dossier noté par l'agent pendant la descente hors ligne (2 caractères minimum).
          </p>
        </div>

        {/* Résultats */}
        <div className="px-5 pb-5 overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-gray-400 text-sm">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600 mx-auto mb-2"></div>
              Recherche...
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">
              {searched ? 'Aucun dossier trouvé pour cette recherche.' : 'Saisissez un terme pour rechercher un dossier.'}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
              {results.map((r) => {
                const actif = selected?.idDossierParcelle === r.idDossierParcelle;
                return (
                  <li key={r.idDossierParcelle}>
                    <button
                      onClick={() => setSelected(r)}
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        actif ? 'bg-amber-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-semibold text-gray-800 text-sm">
                          📁 {r.numeroDossier || r.idDossierParcelle.slice(0, 8)}
                        </span>
                        {r.dateDemande && (
                          <span className="text-[11px] text-gray-400">Demande du {formatDate(r.dateDemande)}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-3">
                        {r.demandeurNom && <span>👤 {r.demandeurNom}</span>}
                        {r.propriete && <span>🏠 Prop. {r.propriete}</span>}
                        {r.parcelle && <span>🗺️ Lot {r.parcelle}</span>}
                        {r.ville && <span>🏙️ {r.ville}</span>}
                        {r.superficie != null && <span>📐 {r.superficie} m²</span>}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500 truncate">
            {selected
              ? <>Dossier sélectionné : <strong>{selected.numeroDossier || selected.idDossierParcelle}</strong></>
              : 'Sélectionnez un dossier dans les résultats.'}
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleAssocier}
              disabled={!selected || saving}
              className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {saving ? 'Association...' : '🔗 Associer'}
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ══════════════════════════════════════════════════════════════
// Composant réutilisable
// ══════════════════════════════════════════════════════════════
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="relative z-50 w-full" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
