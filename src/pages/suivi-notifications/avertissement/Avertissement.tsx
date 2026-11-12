import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { avertissementService } from '../../../services';
import type { Avertissement, PageResponse } from '../../../types';
import { msgErreur } from '../../../utils';

// ── Types modaux (suppression uniquement — création/édition sur page dédiée) ──
type Modal = { type: 'delete'; avert: Avertissement } | null;

export default function Avertissement() {
  const navigate = useNavigate();
  const location = useLocation();
  const [list, setList] = useState<Avertissement[]>([]);
  const [page, setPage] = useState<PageResponse<Avertissement> | null>(null);
  const [search, setSearch] = useState('');
  const [anneeFilter, setAnneeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // Toast transmis par la page création / modification
  useEffect(() => {
    const st = location.state as { toast?: { msg: string; ok?: boolean } } | null;
    if (st?.toast) {
      showToast(st.toast.msg, st.toast.ok ?? true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // ── Charger les avertissements ──
  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (anneeFilter.trim()) {
        const data = await avertissementService.listerParAnnee(Number(anneeFilter.trim()));
        setPage(null);
        setList(data);
      } else if (search.trim()) {
        const data = await avertissementService.rechercher(search.trim(), currentPage, 15);
        setPage(data);
        setList(data.content);
      } else {
        const data = await avertissementService.lister(currentPage, 15);
        setPage(data);
        setList(data.content);
      }
    } catch {
      showToast('Erreur lors du chargement des avertissements', false);
    } finally {
      setLoading(false);
    }
  }, [search, anneeFilter, currentPage]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Suppression ──
  const handleDelete = async (id: string) => {
    try {
      await avertissementService.supprimer(id);
      showToast('Avertissement supprimé');
      setModal(null);
      load();
    } catch (err) {
      showToast(msgErreur(err, 'Erreur lors de la suppression'), false);
    }
  };

  const total = page?.totalElements ?? list.length;

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
          <h1 className="text-2xl font-bold text-gray-800">⚠️ Avertissements</h1>
          <p className="text-gray-500 text-sm mt-1">
            {total} avertissement{total > 1 ? 's' : ''} au total
          </p>
        </div>
        <button
          onClick={() => navigate('/suivi-notifications/avertissements/nouvelle')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
        >
          <span>➕</span> Nouvel avertissement
        </button>
      </div>

      {/* Cadre métier de la rubrique non notifié */}
      <section className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-6 py-5 shadow-sm">
        <h2 className="text-2xl font-bold text-amber-900">Non notifié</h2>
        <p className="mt-2 max-w-5xl text-sm leading-6 text-amber-900/80">
          Cette section regroupe les personnes prévenues à la suite d’une descente inopinée de l’équipe du
          département du patrimoine, alors que celle-ci n’était pas munie du carnet de notification. L’objectif
          de cette descente n’est pas de notifier les activités illicites, mais de formuler un avertissement verbal,
          toujours dans le cadre de la sécurisation foncière, en profitant de ce passage inopiné sur site.
        </p>
      </section>

      {/* Filtres */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(0);
          }}
          placeholder="🔍 Rechercher (constats, mission, contenu...)"
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
        />
        <input
          type="number"
          value={anneeFilter}
          onChange={(e) => {
            setAnneeFilter(e.target.value);
            setCurrentPage(0);
          }}
          placeholder="Année (ex: 2026)"
          className="w-40 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
        />
        {anneeFilter.trim() && (
          <button
            onClick={() => setAnneeFilter('')}
            className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ✕ Effacer filtre
          </button>
        )}
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            Chargement...
          </div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-lg">Aucun avertissement trouvé</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Personne</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Propriété / Lot</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date avertissement</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Année</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Mission</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((a) => (
                <tr key={a.idAvertissement} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    {a.idPersonne ? (
                      <Link
                        to={`/suivi-notifications/personnes/${a.idPersonne}`}
                        className="flex items-center gap-3 group"
                      >
                        <div className="w-8 h-8 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-xs font-bold">
                          {a.nomPersonne?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span className="font-medium text-gray-800 group-hover:text-red-600 group-hover:underline">
                          {a.nomPersonne || `Personne #${a.idPersonne}`}
                        </span>
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-400 italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/suivi-notifications/avertissements/${a.idAvertissement}`)}
                      className="text-left"
                      title="Voir la fiche & l'historique"
                    >
                      <span className="block font-medium text-gray-800 hover:text-blue-600">
                        Propriété n° {a.numeroPropriete || a.idPropriete || '—'}
                      </span>
                      <span className="block text-xs text-gray-500">Lot n° {a.numeroLot || '—'}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {a.dateAvertissement
                      ? new Date(a.dateAvertissement + 'T00:00:00').toLocaleDateString('fr-FR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{a.annee ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-[220px] truncate">
                    {a.mission || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => navigate(`/suivi-notifications/avertissements/${a.idAvertissement}`)}
                        title="Voir la fiche & l'historique"
                        className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"
                      >
                        📜
                      </button>
                      <Link
                        to={`/suivi-notifications/avertissements/${encodeURIComponent(a.idAvertissement)}/modifier`}
                        title="Modifier"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                      >
                        ✏️
                      </Link>
                      <button
                        onClick={() => setModal({ type: 'delete', avert: a })}
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
        {!anneeFilter.trim() && page && page.totalPages > 1 && (
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

      {/* ── Modal suppression ── */}
      {modal?.type === 'delete' && (
        <DeleteModal avert={modal.avert} onConfirm={handleDelete} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MODAL : Confirmer la suppression
// ══════════════════════════════════════════════════════════════
function DeleteModal({
  avert,
  onConfirm,
  onClose,
}: {
  avert: Avertissement;
  onConfirm: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(avert.idAvertissement);
    } catch {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
        <div className="px-6 py-4 border-b border-red-200 bg-red-50">
          <h2 className="text-lg font-bold text-red-800">🗑️ Supprimer l'avertissement</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-700">
            Êtes-vous sûr de vouloir supprimer l'avertissement de{' '}
            <strong>{avert.nomPersonne || `Personne #${avert.idPersonne}`}</strong> pour le{' '}
            <strong>Propriété n° {avert.numeroPropriete || avert.idPropriete || '—'} · Lot n° {avert.numeroLot || '—'}</strong> ?
          </p>
          <p className="text-xs text-red-600 mt-2">Cette information sera placer dans le corbeille.</p>
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="relative z-50 w-full" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
