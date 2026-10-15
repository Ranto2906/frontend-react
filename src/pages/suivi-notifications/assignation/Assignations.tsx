import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { assignationService } from '../../../services';
import type { Assignation } from '../../../types';

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function Assignations() {
  const navigate = useNavigate();
  const [list, setList] = useState<Assignation[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await assignationService.lister(typeFilter, search.trim() || undefined);
      setList(data);
    } catch {
      showToast('Erreur lors du chargement des assignations', false);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  const nbNotifications = list.filter((a) => a.typeCible === 'notification').length;
  const nbAvertissements = list.filter((a) => a.typeCible === 'avertissement').length;

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
            <Link to="/suivi-notifications" className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
              ← Retour
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">🔗 Assigner notification et signalement</h1>
          <p className="text-gray-500 text-sm mt-1">
            {list.length} assignation{list.length > 1 ? 's' : ''} au total — {nbNotifications} notification
            {nbNotifications > 1 ? 's' : ''}, {nbAvertissements} avertissement{nbAvertissements > 1 ? 's' : ''}
          </p>
        </div>
        <Link
          to="/suivi-notifications/assignations/nouvelle"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
        >
          <span>➕</span> Nouvelle assignation
        </Link>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (référence signalement, n° propriété...)"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Tous les types</option>
          <option value="notification">🏠 Notification d'occupation</option>
          <option value="avertissement">⚠️ Avertissement</option>
        </select>
        {(search || typeFilter) && (
          <button
            onClick={() => {
              setSearch('');
              setTypeFilter('');
            }}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg transition-colors"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Liste */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mb-3" />
            <p>Chargement des assignations...</p>
          </div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-3xl mb-2">🔗</p>
            <p className="font-medium">Aucune assignation</p>
            <p className="text-sm mt-1">
              Assignez un signalement depuis sa fiche détaillée ou le détail d'une notification / d'un avertissement.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Signalement</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cible</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Propriété</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Assigné le</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Par</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.map((a) => (
                  <tr
                    key={a.idAssignation}
                    onClick={() => navigate(`/suivi-notifications/assignations/${a.idAssignation}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {a.typeCible === 'notification' ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          🏠 Notification
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          ⚠️ Avertissement
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      {a.referenceSignalement || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {a.typeCible === 'notification'
                        ? formatDate(a.dateNotification)
                        : formatDate(a.dateAvertissement)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {a.typeCible === 'notification'
                        ? a.numeroProprieteNotification || '—'
                        : a.numeroProprieteAvertissement || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(a.dateAssignation)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{a.nomUtilisateur || '—'}</td>
                    <td className="px-4 py-3 text-right text-sm text-blue-600 whitespace-nowrap">
                      Détail →
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
