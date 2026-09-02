import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services';
import type { JournalConnexionDTO, PageResponse } from '../../types';

type Toast = { msg: string; ok: boolean } | null;

export default function Journal() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.roles?.some((r) => r.nomRole === 'Administrateur');

  const [journal, setJournal] = useState<JournalConnexionDTO[]>([]);
  const [page, setPage] = useState<PageResponse<JournalConnexionDTO> | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'failure'>('all');
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [showUserDetail, setShowUserDetail] = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const loadJournal = useCallback(async () => {
    setLoading(true);
    try {
      if (selectedUser !== null) {
        const data = await adminService.journalUtilisateur(selectedUser);
        // Filter locally for user-specific view
        const filtered = filter === 'all'
          ? data
          : data.filter((j) => filter === 'success' ? j.succes : !j.succes);
        // Convert to page format for consistency
        setJournal(filtered);
        setPage({
          content: filtered,
          totalElements: filtered.length,
          totalPages: 1,
          size: filtered.length,
          number: 0,
          first: true,
          last: true,
          empty: filtered.length === 0,
        });
      } else {
        const data = await adminService.journal(currentPage, 20);
        let filtered = data.content;
        if (filter === 'success') filtered = data.content.filter((j) => j.succes);
        if (filter === 'failure') filtered = data.content.filter((j) => !j.succes);
        setJournal(filtered);
        setPage({ ...data, content: filtered });
      }
    } catch {
      showToast('Erreur lors du chargement du journal', false);
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedUser, filter]);

  useEffect(() => { loadJournal(); }, [loadJournal]);

  const handleViewUser = (id: number, name: string) => {
    setSelectedUser(id);
    setSelectedUserName(name);
    setShowUserDetail(true);
    setCurrentPage(0);
  };

  const handleBackToAll = () => {
    setSelectedUser(null);
    setSelectedUserName('');
    setShowUserDetail(false);
    setCurrentPage(0);
  };

  if (!isAdmin) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-semibold">Accès réservé aux administrateurs</p>
        </div>
      </div>
    );
  }

  // Stats
  const totalEntries = page?.totalElements ?? 0;
  const successCount = journal.filter((j) => j.succes).length;
  const failureCount = journal.filter((j) => !j.succes).length;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm transition-all ${
          toast.ok ? 'bg-green-600' : 'bg-red-600'
        }`}>{toast.msg}</div>
      )}

      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            {showUserDetail && (
              <button
                onClick={handleBackToAll}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                ← Retour à tous
              </button>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            📋 Journal des connexions
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {showUserDetail
              ? `Historique de ${selectedUserName} — ${totalEntries} entrée${totalEntries > 1 ? 's' : ''}`
              : `${totalEntries} entrée${totalEntries > 1 ? 's' : ''} au total`
            }
          </p>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-lg">
              📊
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{totalEntries}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 text-lg">
              ✅
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{successCount}</p>
              <p className="text-xs text-gray-500">Succès</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600 text-lg">
              ❌
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">{failureCount}</p>
              <p className="text-xs text-gray-500">Échecs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => { setFilter('all'); setCurrentPage(0); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Tous
        </button>
        <button
          onClick={() => { setFilter('success'); setCurrentPage(0); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'success' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          ✅ Succès
        </button>
        <button
          onClick={() => { setFilter('failure'); setCurrentPage(0); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'failure' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          ❌ Échecs
        </button>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            Chargement...
          </div>
        ) : journal.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-lg">Aucune entrée dans le journal</p>
            <p className="text-sm mt-1">Les connexions apparaîtront ici.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date & Heure</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Utilisateur</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Résultat</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Adresse IP</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {journal.map((entry) => (
                <tr key={entry.idJournal} className={`hover:bg-gray-50 transition-colors ${
                  !entry.succes ? 'bg-red-50/30' : ''
                }`}>
                  <td className="px-4 py-3">
                    <span className="text-gray-800">
                      {entry.dateConnexion
                        ? new Date(entry.dateConnexion).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })
                        : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        entry.succes ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {entry.nomUtilisateur?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <span className="font-medium text-gray-800">{entry.nomUtilisateur || 'Inconnu'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {entry.succes ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✅ Succès
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        ❌ Échec
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {entry.ipAdresse || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {entry.idUtilisateur && (
                      <button
                        onClick={() => handleViewUser(entry.idUtilisateur!, entry.nomUtilisateur || 'Inconnu')}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                      >
                        Voir tout →
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination (uniquement pour la vue globale) */}
        {!showUserDetail && page && page.totalPages > 1 && (
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
    </div>
  );
}
