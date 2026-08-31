import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { auditApi } from '../services/api';
import type { AuditDTO, PageResponse } from '../types';

type Toast = { msg: string; ok: boolean } | null;

const ENTITE_TYPES = [
  { value: '', label: 'Toutes' },
  { value: 'dossier', label: '📁 Dossier' },
  { value: 'utilisateur', label: '👤 Utilisateur' },
  { value: 'parcelle', label: '🗺️ Parcelle' },
  { value: 'titre_foncier', label: '📄 Titre foncier' },
  { value: 'propriete', label: '🏘️ Propriété' },
  { value: 'geometrie', label: '📍 Géométrie' },
  { value: 'signalement', label: '📢 Signalement' },
  { value: 'notification_occupation', label: '🔔 Notification' },
  { value: 'avertissement', label: '⚠️ Avertissement' },
  { value: 'descente_terrain', label: '🥾 Descente terrain' },
];

const ACTION_TYPES = [
  { value: '', label: 'Toutes' },
  { value: 'CREATE', label: 'Création', color: 'green' },
  { value: 'READ', label: 'Lecture', color: 'blue' },
  { value: 'UPDATE', label: 'Modification', color: 'yellow' },
  { value: 'DELETE', label: 'Suppression', color: 'red' },
];

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  READ: 'bg-blue-100 text-blue-800',
  UPDATE: 'bg-yellow-100 text-yellow-800',
  DELETE: 'bg-red-100 text-red-800',
  VALIDATE: 'bg-purple-100 text-purple-800',
  EXPORT: 'bg-cyan-100 text-cyan-800',
};

const ENTITE_ICONS: Record<string, string> = {
  dossier: '📁',
  utilisateur: '👤',
  parcelle: '🗺️',
  titre_foncier: '📄',
  propriete: '🏘️',
  geometrie: '📍',
  signalement: '📢',
  notification_occupation: '🔔',
  avertissement: '⚠️',
  descente_terrain: '🥾',
};

export default function Audit() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.roles?.some((r) => r.nomRole === 'Administrateur');

  const [entries, setEntries] = useState<AuditDTO[]>([]);
  const [page, setPage] = useState<PageResponse<AuditDTO> | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);
  const [filterEntite, setFilterEntite] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const loadAudit = useCallback(async () => {
    setLoading(true);
    try {
      const data = await auditApi.rechercher(
        filterEntite || undefined,
        filterAction || undefined,
        search || undefined,
        currentPage,
        20,
      );
      setEntries(data.content);
      setPage(data);
    } catch {
      showToast('Erreur lors du chargement de l\'audit', false);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterEntite, filterAction, search]);

  const loadStats = useCallback(async () => {
    try {
      const data = await auditApi.stats();
      setStats(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => { loadAudit(); }, [loadAudit]);
  useEffect(() => { loadStats(); }, [loadStats]);

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

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm transition-all ${
          toast.ok ? 'bg-green-600' : 'bg-red-600'
        }`}>{toast.msg}</div>
      )}

      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📊 Audit</h1>
        <p className="text-gray-500 text-sm mt-1">
          Traçabilité des actions — {totalEntries} entrée{totalEntries > 1 ? 's' : ''}
        </p>
      </div>

      {/* Stats par entité */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {Object.entries(stats).filter(([, v]) => v > 0).map(([key, value]) => (
          <div key={key} className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 text-center">
            <p className="text-lg">{ENTITE_ICONS[key] || '📋'}</p>
            <p className="text-lg font-bold text-gray-800">{value}</p>
            <p className="text-xs text-gray-500 capitalize">{key.replace('_', ' ')}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Recherche */}
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(0); }}
          placeholder="🔍 Rechercher par ID..."
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition w-48"
        />

        {/* Filtre entité */}
        <select
          value={filterEntite}
          onChange={(e) => { setFilterEntite(e.target.value); setCurrentPage(0); }}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
        >
          {ENTITE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {/* Filtre action */}
        <div className="flex items-center gap-1">
          {ACTION_TYPES.map((a) => (
            <button
              key={a.value}
              onClick={() => { setFilterAction(a.value); setCurrentPage(0); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterAction === a.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            Chargement...
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-lg">Aucune entrée d'audit</p>
            <p className="text-sm mt-1">Les actions seront tracées ici.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-8 px-4 py-3"></th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Entité</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Action</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Utilisateur</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((entry) => (
                <>
                  <tr
                    key={entry.idAudit}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === entry.idAudit ? null : entry.idAudit)}
                  >
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {expandedId === entry.idAudit ? '▼' : '▶'}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">
                      {entry.dateAction
                        ? new Date(entry.dateAction).toLocaleString('fr-FR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', second: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span>{ENTITE_ICONS[entry.entiteType] || '📋'}</span>
                        <span className="text-gray-700 capitalize">{entry.entiteType?.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{entry.entiteId}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        ACTION_COLORS[entry.action || ''] || 'bg-gray-100 text-gray-800'
                      }`}>
                        {entry.action || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{entry.nomUtilisateur || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{entry.ipAdresse || '—'}</td>
                  </tr>

                  {/* Détail expandable */}
                  {expandedId === entry.idAudit && (
                    <tr key={`detail-${entry.idAudit}`}>
                      <td colSpan={7} className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <div className="grid grid-cols-2 gap-4">
                          {/* Anciennes valeurs */}
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">🔴 Valeurs précédentes</p>
                            {entry.anciennesValeurs ? (
                              <pre className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 overflow-x-auto max-h-48">
                                {formatJson(entry.anciennesValeurs)}
                              </pre>
                            ) : (
                              <p className="text-xs text-gray-400 italic">Aucune valeur précédente</p>
                            )}
                          </div>

                          {/* Nouvelles valeurs */}
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">🟢 Nouvelles valeurs</p>
                            {entry.nouvellesValeurs ? (
                              <pre className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800 overflow-x-auto max-h-48">
                                {formatJson(entry.nouvellesValeurs)}
                              </pre>
                            ) : (
                              <p className="text-xs text-gray-400 italic">Aucune nouvelle valeur</p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
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
    </div>
  );
}

// ── Utilitaire : formater le JSON ──
function formatJson(str: string): string {
  try {
    const obj = typeof str === 'string' ? JSON.parse(str) : str;
    return JSON.stringify(obj, null, 2);
  } catch {
    return str;
  }
}
