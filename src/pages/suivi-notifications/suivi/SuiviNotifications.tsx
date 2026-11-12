import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { suiviNotificationService } from '../../../services';
import type { SuiviNotification, PageResponse } from '../../../types';
import { msgErreur } from '../../../utils';

const STATUT_COLORS: Record<string, string> = {
  'En cours': 'bg-yellow-100 text-yellow-800',
  'Traité': 'bg-blue-100 text-blue-800',
  'Clôturée': 'bg-green-100 text-green-800',
};

// ── Types modaux (suppression uniquement — création/édition sur page dédiée) ──
type Modal = { type: 'delete'; suivi: SuiviNotification } | null;

export default function SuiviNotifications() {
  const navigate = useNavigate();
  const location = useLocation();
  const [list, setList] = useState<SuiviNotification[]>([]);
  const [page, setPage] = useState<PageResponse<SuiviNotification> | null>(null);
  const [search, setSearch] = useState('');
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

  // ── Charger les suivis ──
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = search.trim()
        ? await suiviNotificationService.rechercher(search.trim(), currentPage, 15)
        : await suiviNotificationService.lister(currentPage, 15);
      setPage(data);
      setList(data.content);
    } catch {
      showToast('Erreur lors du chargement des suivis', false);
    } finally {
      setLoading(false);
    }
  }, [search, currentPage]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Suppression ──
  const handleDelete = async (id: string) => {
    try {
      await suiviNotificationService.supprimer(id);
      showToast('Suivi supprimé');
      setModal(null);
      load();
    } catch (err) {
      showToast(msgErreur(err, 'Erreur lors de la suppression'), false);
      // La fenêtre de confirmation reste sinon bloquée sur « Suppression... »
      setModal(null);
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
          <h1 className="text-2xl font-bold text-gray-800">📋 Suivi des Notifications</h1>
          <p className="text-gray-500 text-sm mt-1">
            {total} suivi{total > 1 ? 's' : ''} au total
          </p>
        </div>
        <button
          onClick={() => navigate('/suivi-notifications/suivi/nouvelle')}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
        >
          <span>➕</span> Nouveau suivi
        </button>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(0);
          }}
          placeholder="🔍 Rechercher (constats, actions, n° titre, n° lot...)"
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
        />
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-3"></div>
            Chargement...
          </div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-lg">Aucun suivi trouvé</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Suivi</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Notification</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Constats</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions à suivre</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((s) => (
                <tr key={s.idSuivi} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/suivi-notifications/suivi/${s.idSuivi}`)}
                      className="text-left"
                      title="Voir la fiche & l'historique"
                    >
                      <span className="block font-medium text-gray-800 hover:text-green-600">
                        Suivi n° {s.ordre ?? '—'}
                      </span>
                      <span className="block text-xs text-gray-500">
                        {s.dateSuivi
                          ? new Date(s.dateSuivi + 'T00:00:00').toLocaleDateString('fr-FR')
                          : 'Date non renseignée'}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {s.idNotification ? (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/suivi-notifications/occupation/${s.idNotification}`)
                        }
                        className="text-left"
                        title="Voir la notification"
                      >
                        <span className="block font-medium text-gray-800 hover:text-blue-600">
                          Propriété n° {s.numeroPropriete || '—'}
                        </span>
                        <span className="block text-xs text-gray-500">
                          Lot n° {s.numeroLot || '—'}
                          {s.dateNotification
                            ? ` · ${new Date(s.dateNotification + 'T00:00:00').toLocaleDateString('fr-FR')}`
                            : ''}
                        </span>
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-[240px] truncate">
                    {s.constats || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-[200px] truncate">
                    {s.actionsASuivre || '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUT_COLORS[s.statut || ''] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {s.statut || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => navigate(`/suivi-notifications/suivi/${s.idSuivi}`)}
                        title="Voir la fiche & l'historique"
                        className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"
                      >
                        📜
                      </button>
                      <button
                        onClick={() => navigate(`/suivi-notifications/suivi/${s.idSuivi}/modifier`)}
                        title="Modifier"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setModal({ type: 'delete', suivi: s })}
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

      {/* ── Modal suppression ── */}
      {modal?.type === 'delete' && (
        <DeleteModal suivi={modal.suivi} onConfirm={handleDelete} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MODAL : Confirmer la suppression
// ══════════════════════════════════════════════════════════════
function DeleteModal({
  suivi,
  onConfirm,
  onClose,
}: {
  suivi: SuiviNotification;
  onConfirm: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(suivi.idSuivi);
    } catch {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
        <div className="px-6 py-4 border-b border-red-200 bg-red-50">
          <h2 className="text-lg font-bold text-red-800">🗑️ Supprimer le suivi</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-700">
            Êtes-vous sûr de vouloir supprimer le{' '}
            <strong>
              suivi n° {suivi.ordre ?? '—'} de la propriété n° {suivi.numeroPropriete || '—'}
            </strong>{' '}
            ?
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
