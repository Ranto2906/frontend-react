import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../services/api';
import type { SessionDTO, PageResponse } from '../types';

type Toast = { msg: string; ok: boolean } | null;

export default function Sessions() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.roles?.some((r) => r.nomRole === 'Administrateur');

  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [page, setPage] = useState<PageResponse<SessionDTO> | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'revoked'>('all');
  const [confirmRevoke, setConfirmRevoke] = useState<number | null>(null);
  const [confirmClean, setConfirmClean] = useState(false);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      if (selectedUser !== null) {
        const data = await adminApi.sessionsUtilisateur(selectedUser);
        let filtered = data;
        if (filter === 'active') filtered = data.filter((s) => !s.revoque);
        if (filter === 'revoked') filtered = data.filter((s) => s.revoque);
        setSessions(filtered);
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
        const data = await adminApi.listerSessions(currentPage, 20);
        let filtered = data.content;
        if (filter === 'active') filtered = data.content.filter((s) => !s.revoque);
        if (filter === 'revoked') filtered = data.content.filter((s) => s.revoque);
        setSessions(filtered);
        setPage({ ...data, content: filtered });
      }
    } catch {
      showToast('Erreur lors du chargement des sessions', false);
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedUser, filter]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const handleRevoke = async (idUtilisateur: number) => {
    try {
      await adminApi.revoquerSessions(idUtilisateur);
      showToast('Sessions révoquées');
      setConfirmRevoke(null);
      loadSessions();
    } catch {
      showToast('Erreur lors de la révocation', false);
    }
  };

  const handleCleanExpired = async () => {
    try {
      await adminApi.nettoyerSessionsExpirees();
      showToast('Sessions expirées nettoyées');
      setConfirmClean(false);
      loadSessions();
    } catch {
      showToast('Erreur lors du nettoyage', false);
    }
  };

  const handleViewUser = (id: number, name: string) => {
    setSelectedUser(id);
    setSelectedUserName(name);
    setCurrentPage(0);
  };

  const handleBackToAll = () => {
    setSelectedUser(null);
    setSelectedUserName('');
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

  const totalEntries = page?.totalElements ?? 0;
  const activeCount = sessions.filter((s) => !s.revoque).length;
  const revokedCount = sessions.filter((s) => s.revoque).length;

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
          {selectedUser && (
            <button
              onClick={handleBackToAll}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-1"
            >
              ← Retour à toutes les sessions
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-800">🔐 Sessions</h1>
          <p className="text-gray-500 text-sm mt-1">
            {selectedUser
              ? `Sessions de ${selectedUserName} — ${totalEntries} session${totalEntries > 1 ? 's' : ''}`
              : `${totalEntries} session${totalEntries > 1 ? 's' : ''} au total`
            }
          </p>
        </div>
        <button
          onClick={() => setConfirmClean(true)}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
        >
          <span>🧹</span> Nettoyer les expirées
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-lg">📊</div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{totalEntries}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 text-lg">🟢</div>
            <div>
              <p className="text-2xl font-bold text-green-700">{activeCount}</p>
              <p className="text-xs text-gray-500">Actives</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600 text-lg">🔴</div>
            <div>
              <p className="text-2xl font-bold text-red-700">{revokedCount}</p>
              <p className="text-xs text-gray-500">Révoquées</p>
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
          Toutes
        </button>
        <button
          onClick={() => { setFilter('active'); setCurrentPage(0); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'active' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          🟢 Actives
        </button>
        <button
          onClick={() => { setFilter('revoked'); setCurrentPage(0); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'revoked' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          🔴 Révoquées
        </button>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            Chargement...
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-lg">Aucune session trouvée</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Utilisateur</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Appareil / Navigateur</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">IP</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Créée le</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Expire le</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sessions.map((s) => {
                const isExpired = s.dateExpiration ? new Date(s.dateExpiration) < new Date() : false;
                return (
                  <tr key={s.idSession} className={`hover:bg-gray-50 transition-colors ${
                    s.revoque ? 'bg-red-50/20' : ''
                  }`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          s.revoque ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {s.nomUtilisateur?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span className="font-medium text-gray-800">{s.nomUtilisateur || 'Inconnu'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs max-w-[250px] truncate" title={s.userAgent || ''}>
                      {parseUserAgent(s.userAgent)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.ipAdresse || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {s.dateCreation ? new Date(s.dateCreation).toLocaleString('fr-FR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {s.dateExpiration ? new Date(s.dateExpiration).toLocaleString('fr-FR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.revoque ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Révoquée
                        </span>
                      ) : isExpired ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Expirée
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {s.idUtilisateur && (
                          <button
                            onClick={() => handleViewUser(s.idUtilisateur!, s.nomUtilisateur || 'Inconnu')}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                          >
                            Voir →
                          </button>
                        )}
                        {!s.revoque && s.idUtilisateur && (
                          <button
                            onClick={() => setConfirmRevoke(s.idUtilisateur!)}
                            className="text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                          >
                            Révoquer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!selectedUser && page && page.totalPages > 1 && (
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

      {/* Modal confirmation révocation */}
      {confirmRevoke !== null && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={() => setConfirmRevoke(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">🔒 Révoquer les sessions</h3>
            <p className="text-sm text-gray-600">
              Forcer la déconnexion de cet utilisateur sur tous ses appareils ?
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setConfirmRevoke(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                Annuler
              </button>
              <button onClick={() => handleRevoke(confirmRevoke)}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors">
                Révoquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmation nettoyage */}
      {confirmClean && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={() => setConfirmClean(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">🧹 Nettoyer les sessions expirées</h3>
            <p className="text-sm text-gray-600">
              Supprimer définitivement toutes les sessions expirées de la base de données ?
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setConfirmClean(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                Annuler
              </button>
              <button onClick={handleCleanExpired}
                className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors">
                Nettoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Utilitaire : Parser le User-Agent ──
function parseUserAgent(ua?: string): string {
  if (!ua) return '—';

  // Navigateur
  let browser = 'Autre';
  if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';

  // OS
  let os = '';
  if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11';
  else if (ua.includes('Windows NT 6.3')) os = 'Windows 8.1';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return `${browser}${os ? ' — ' + os : ''}`;
}
