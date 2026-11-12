import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { signalementService, villeService } from '../../services';
import type { Signalement, Ville, PageResponse } from '../../types';
import { extraireProprieteManuelle } from '../../utils/proprieteManuelle';
import { msgErreur } from '../../utils';

type Modal = { type: 'delete'; sig: Signalement } | null;

// Couleurs de repli si le backend ne fournit pas couleurStatutHex
const COULEURS_STATUT: Record<string, string> = {
  nouveau: '#1a56db', 'en attente': '#b7791f', 'en cours': '#1a56db',
  traite: '#059669', 'traité': '#059669', rejete: '#dc2626', 'rejeté': '#dc2626',
  transforme: '#7c3aed', 'transformé': '#7c3aed',
};

function couleurStatut(sig: Signalement): string {
  if (sig.couleurStatutHex) return sig.couleurStatutHex;
  return COULEURS_STATUT[(sig.libelleStatut || '').toLowerCase()] || '#6b7280';
}

function formatDate(d?: string): string {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
}

export default function Signalements() {
  const navigate = useNavigate();
  const location = useLocation();

  const [list, setList] = useState<Signalement[]>([]);
  const [page, setPage] = useState<PageResponse<Signalement> | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Filtres multicritères
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterVille, setFilterVille] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [filtresVisibles, setFiltresVisibles] = useState(false);

  // Référentiels
  const [statuts, setStatuts] = useState<Array<{ idStatutSignalement: number; libelle: string; couleurHex?: string }>>([]);
  const [types, setTypes] = useState<Array<{ idTypeSignalement: number; libelle: string; couleur?: string }>>([]);
  const [villes, setVilles] = useState<Ville[]>([]);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // Toast transmis par les pages formulaire / détail
  useEffect(() => {
    const st = location.state as { toast?: { msg: string; ok?: boolean } } | null;
    if (st?.toast) showToast(st.toast.msg, st.toast.ok ?? true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // Charger les référentiels une fois
  useEffect(() => {
    (async () => {
      try {
        const [s, t, v] = await Promise.all([
          signalementService.listerStatuts(),
          signalementService.listerTypes(),
          villeService.listerToutes(),
        ]);
        setStatuts([...s].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)));
        setTypes(t);
        setVilles(v);
      } catch {
        // Les filtres resteront vides si les référentiels sont indisponibles
      }
    })();
  }, []);

  // ── Chargement : recherche/filtre serveur puis filtres locaux ──
  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Le backend filtre par UN critère à la fois → on charge la base la plus
      // large possible puis on affine localement (recherche + statut + type +
      // ville + dates simultanés). Pagination locale sur le résultat filtré.
      const filtreServeurActif = !search.trim();
      const source: Signalement[] = filtreServeurActif && !filterStatut && !filterType && !filterVille
        ? (await signalementService.lister(0, 500)).content
        : search.trim()
          ? (await signalementService.rechercher(search.trim(), 0, 500)).content
          : filterStatut
            ? await signalementService.listerParStatut(Number(filterStatut))
            : filterType
              ? await signalementService.listerParType(Number(filterType))
              : filterVille
                ? await signalementService.listerParVille(Number(filterVille))
                : (await signalementService.lister(0, 500)).content;

      // Affinage local multicritère
      const resultat = source.filter((s) => {
        if (filterStatut && String(s.idStatutSignalement ?? '') !== filterStatut) return false;
        if (filterType && String(s.idTypeSignalement ?? '') !== filterType) return false;
        if (filterVille && String(s.idVille ?? '') !== filterVille) return false;
        if (dateDebut && (!s.dateSignalement || s.dateSignalement < `${dateDebut}T00:00:00`)) return false;
        if (dateFin && (!s.dateSignalement || s.dateSignalement > `${dateFin}T23:59:59`)) return false;
        return true;
      });

      const size = 15;
      const totalPages = Math.max(1, Math.ceil(resultat.length / size));
      const slice = resultat.slice(currentPage * size, currentPage * size + size);
      setList(slice);
      setPage({
        content: slice,
        totalElements: resultat.length,
        totalPages,
        size,
        number: currentPage,
        first: currentPage === 0,
        last: currentPage >= totalPages - 1,
        empty: resultat.length === 0,
      });
    } catch {
      showToast("Erreur lors du chargement des signalements", false);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatut, filterType, filterVille, dateDebut, dateFin, currentPage]);

  useEffect(() => { load(); }, [load]);

  // ── Suppression ──
  const handleDelete = async (id: string) => {
    try {
      await signalementService.supprimer(id);
      showToast('Signalement supprimé');
      setModal(null);
      load();
    } catch (err) {
      showToast(msgErreur(err, 'Erreur lors de la suppression'), false);
      setModal(null);
    }
  };

  const nbFiltresActifs = useMemo(
    () => [search, filterStatut, filterType, filterVille, dateDebut, dateFin].filter((v) => v).length,
    [search, filterStatut, filterType, filterVille, dateDebut, dateFin],
  );

  const reinitialiserFiltres = () => {
    setSearch(''); setFilterStatut(''); setFilterType(''); setFilterVille('');
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
          <h1 className="text-2xl font-bold text-gray-800">📢 Signalements terrain</h1>
          <p className="text-gray-500 text-sm mt-1">
            {total} signalement{total > 1 ? 's' : ''} — consultation, validation et suivi
          </p>
        </div>
        <button
          onClick={() => navigate('/signalements/nouveau')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
        >
          <span>➕</span> Nouveau signalement
        </button>
      </div>

      {/* Barre de recherche + bouton filtres */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(0); }}
          placeholder="🔍 Rechercher (référence, description, ville, lot, TF...)"
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
        />
        <button
          onClick={() => setFiltresVisibles((v) => !v)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            filtresVisibles || nbFiltresActifs > 0
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          🎛️ Filtres
          {nbFiltresActifs > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs">
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Statut</label>
            <select
              value={filterStatut}
              onChange={(e) => { setFilterStatut(e.target.value); setCurrentPage(0); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Tous les statuts</option>
              {statuts.map((s) => (
                <option key={s.idStatutSignalement} value={s.idStatutSignalement}>{s.libelle}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setCurrentPage(0); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Tous les types</option>
              {types.map((t) => (
                <option key={t.idTypeSignalement} value={t.idTypeSignalement}>{t.libelle}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Ville</label>
            <select
              value={filterVille}
              onChange={(e) => { setFilterVille(e.target.value); setCurrentPage(0); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Toutes les villes</option>
              {villes.map((v) => (
                <option key={v.idVille} value={v.idVille}>{v.nomVille}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Du</label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => { setDateDebut(e.target.value); setCurrentPage(0); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Au</label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => { setDateFin(e.target.value); setCurrentPage(0); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      )}

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            Chargement...
          </div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-lg">Aucun signalement trouvé</p>
            <p className="text-sm mt-1">
              {nbFiltresActifs > 0 ? 'Ajustez vos filtres de recherche.' : 'Les constats du terrain apparaîtront ici.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Référence</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ville</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Agent</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((s) => (
                <tr key={s.idSignalement} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      to={`/signalements/${s.idSignalement}`}
                      className="font-medium text-gray-800 hover:text-blue-600 hover:underline"
                    >
                      {s.reference || '—'}
                    </Link>
                    {s.description && (
                      <p className="text-xs text-gray-500 max-w-[220px] truncate">
                        {/* Propriété saisie manuellement (préfixe mobile) : affichée en badge, pas dans l'extrait. */}
                        {extraireProprieteManuelle(s.description).description || '(sans observation)'}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.libelleType ? (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ background: s.couleurType || '#1a56db' }}
                      >
                        {s.libelleType}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">🏙️ {s.nomVille || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(s.dateSignalement)}</td>
                  <td className="px-4 py-3 text-gray-600">{s.nomUtilisateurCreation || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
                      style={{ background: couleurStatut(s) }}
                    >
                      {s.libelleStatut || 'Nouveau'}
                    </span>
                    {s.statutFinal && s.dateTraitement && (
                      <p className="text-[10px] text-gray-400 mt-1">{formatDate(s.dateTraitement)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`/signalements/${s.idSignalement}`}
                        title="Détail & validation"
                        className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"
                      >
                        📜
                      </Link>
                      <Link
                        to={`/signalements/${s.idSignalement}/modifier`}
                        title="Modifier"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                      >
                        ✏️
                      </Link>
                      <button
                        onClick={() => setModal({ type: 'delete', sig: s })}
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
        <DeleteModal sig={modal.sig} onConfirm={handleDelete} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MODAL : Confirmer la suppression
// ══════════════════════════════════════════════════════════════
function DeleteModal({
  sig,
  onConfirm,
  onClose,
}: {
  sig: Signalement;
  onConfirm: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(sig.idSignalement);
    } catch {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
        <div className="px-6 py-4 border-b border-red-200 bg-red-50">
          <h2 className="text-lg font-bold text-red-800">🗑️ Supprimer le signalement</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-700">
            Supprimer définitivement le signalement{' '}
            <strong>{sig.reference || sig.idSignalement.slice(0, 8)}</strong>
            {sig.nomVille ? ` (${sig.nomVille})` : ''} ?
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
