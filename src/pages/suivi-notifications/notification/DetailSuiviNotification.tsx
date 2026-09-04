import { useState, useEffect, Fragment } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { suiviNotificationService } from '../../../services';
import type { SuiviNotification, AuditDTO } from '../../../types';

const STATUT_COLORS: Record<string, string> = {
  'En cours': 'bg-yellow-100 text-yellow-800',
  'Traité': 'bg-blue-100 text-blue-800',
  'Clôturée': 'bg-green-100 text-green-800',
};

// Champs affichés dans l'historique (ordre + libellés français)
const FIELDS: { key: string; label: string }[] = [
  { key: 'statut', label: 'Statut notification' },
  { key: 'numeroTitre', label: 'N° titre foncier' },
  { key: 'numeroLot', label: 'N° lot' },
  { key: 'dateNotification', label: 'Date notification' },
  { key: 'ordre', label: 'N° du suivi' },
  { key: 'dateSuivi', label: 'Date du suivi' },
  { key: 'constats', label: 'Constats' },
  { key: 'actionsASuivre', label: 'Actions à suivre' },
];

function formatAuditValue(key: string, val: unknown): string {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      return new Date(val + 'T00:00:00').toLocaleDateString('fr-FR');
    }
    if (/^\d{4}-\d{2}-\d{2}T/.test(val)) {
      return new Date(val).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return val;
  }
  if (typeof val === 'number') return val.toLocaleString('fr-FR');
  return String(val);
}

export default function DetailSuiviNotification() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [suivi, setSuivi] = useState<SuiviNotification | null>(null);
  const [historique, setHistorique] = useState<AuditDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Toast transmis par le formulaire
  useEffect(() => {
    const st = location.state as { toast?: { msg: string; ok?: boolean } } | null;
    if (st?.toast) {
      setToast({ msg: st.toast.msg, ok: st.toast.ok ?? true });
      setTimeout(() => setToast(null), 4000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      suiviNotificationService.trouverParId(id),
      suiviNotificationService.historique(id),
    ])
      .then(([s, hist]) => {
        setSuivi(s);
        setHistorique(hist);
      })
      .catch(() => setError('Suivi introuvable'))
      .finally(() => setLoading(false));
  }, [id]);

  const fmtDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const fmtDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="p-12 text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-3"></div>
          Chargement...
        </div>
      </div>
    );
  }

  if (error || !suivi) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="p-12 text-center">
          <p className="text-lg text-gray-500 mb-4">{error || 'Suivi introuvable'}</p>
          <Link
            to="/suivi-notifications/suivi"
            className="text-green-600 hover:text-green-700 text-sm font-medium"
          >
            ← Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

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

      {/* Fil d'Ariane */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link
          to="/suivi-notifications"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          Suivi & Notifications
        </Link>
        <span className="text-gray-300">/</span>
        <Link
          to="/suivi-notifications/suivi"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          Suivi des Notifications
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">Suivi n° {suivi.ordre ?? '—'}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          📋 Suivi n° {suivi.ordre ?? '—'}{' '}
          <span className="text-gray-400 font-normal text-lg">
            — TF n° {suivi.numeroTitre || '—'} · Lot n° {suivi.numeroLot || '—'}
          </span>
        </h1>
        <div className="flex items-center gap-2">
          <Link
            to={`/suivi-notifications/suivi/${suivi.idSuivi}/modifier`}
            className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
          >
            ✏️ Modifier
          </Link>
          <Link
            to="/suivi-notifications/suivi"
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors"
          >
            ← Retour liste
          </Link>
        </div>
      </div>

      {/* ── Fiche actuelle ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-800">📋 Fiche du suivi</h2>
          {suivi.statut && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                STATUT_COLORS[suivi.statut] || 'bg-gray-100 text-gray-800'
              }`}
            >
              {suivi.statut}
            </span>
          )}
        </div>

        <div className="p-6">
          {/* Contexte & dates */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Notification
              </p>
              {suivi.idNotification ? (
                <Link
                  to={`/suivi-notifications/occupation/${suivi.idNotification}`}
                  className="text-sm font-medium text-gray-800 hover:text-blue-600 hover:underline"
                >
                  TF n° {suivi.numeroTitre || '—'} · Lot n° {suivi.numeroLot || '—'}
                </Link>
              ) : (
                <p className="text-sm text-gray-800">—</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Date notification
              </p>
              <p className="text-sm text-gray-800">
                {suivi.dateNotification ? fmtDate(suivi.dateNotification) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                N° du suivi
              </p>
              <p className="text-sm text-gray-800">{suivi.ordre ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Date du suivi
              </p>
              <p className="text-sm text-gray-800">{suivi.dateSuivi ? fmtDate(suivi.dateSuivi) : '—'}</p>
            </div>
          </div>

          {/* Constats & actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Constats
              </p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{suivi.constats || '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Actions à suivre
              </p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {suivi.actionsASuivre || '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Historique des modifications ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-800">📜 Historique des modifications</h2>
          {historique.length > 0 && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
              {historique.length} modification{historique.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {historique.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm italic">Aucune modification enregistrée.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-8"></th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">N° suivi</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date du suivi</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Quand</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {historique.map((entry, idx) => {
                  const anciennes = entry.anciennesValeurs ? JSON.parse(entry.anciennesValeurs) : null;
                  const nouvelles = entry.nouvellesValeurs ? JSON.parse(entry.nouvellesValeurs) : null;
                  const avant = anciennes || nouvelles;
                  const isExpanded = expandedIdx === idx;

                  return (
                    <Fragment key={entry.idAudit}>
                      {/* Ligne principale : résumé */}
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                            className="p-1 rounded hover:bg-gray-200 transition-colors"
                            title={isExpanded ? 'Masquer les détails' : 'Voir les détails'}
                          >
                            <span
                              className={`w-2.5 h-2.5 rounded-full inline-block ${
                                idx === 0 ? 'bg-green-500' : 'bg-gray-300'
                              }`}
                            ></span>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              entry.action === 'CREATE'
                                ? 'bg-green-100 text-green-800'
                                : entry.action === 'UPDATE' || entry.action === 'MODIFICATION'
                                ? 'bg-blue-100 text-blue-800'
                                : entry.action === 'DELETE' || entry.action === 'SUPPRESSION'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {entry.action === 'CREATE'
                              ? 'Création'
                              : entry.action === 'UPDATE' || entry.action === 'MODIFICATION'
                              ? 'Modification'
                              : entry.action === 'DELETE' || entry.action === 'SUPPRESSION'
                              ? 'Suppression'
                              : entry.action || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">Suivi n° {avant?.ordre ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {avant?.dateSuivi
                            ? new Date(avant.dateSuivi + 'T00:00:00').toLocaleDateString('fr-FR')
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{fmtDateTime(entry.dateAction)}</td>
                      </tr>

                      {/* Ligne détaillée expandable : avant / après */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">
                              {entry.action === 'CREATE'
                                ? 'Données créées'
                                : entry.action === 'DELETE' || entry.action === 'SUPPRESSION'
                                ? 'Données supprimées'
                                : 'Détail de la modification'}{' '}
                              — {fmtDateTime(entry.dateAction)}
                            </p>

                            {(anciennes || nouvelles) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {anciennes && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                      Avant
                                    </p>
                                    <div className="space-y-2 bg-white border border-gray-200 rounded-lg p-4">
                                      {FIELDS.map((f) => (
                                        <div key={f.key}>
                                          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                                            {f.label}
                                          </p>
                                          <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                                            {formatAuditValue(f.key, anciennes[f.key])}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {nouvelles && (
                                  <div>
                                    <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-2">
                                      Après
                                    </p>
                                    <div className="space-y-2 bg-white border border-green-200 rounded-lg p-4">
                                      {FIELDS.map((f) => (
                                        <div key={f.key}>
                                          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                                            {f.label}
                                          </p>
                                          <p
                                            className={`text-sm break-words whitespace-pre-wrap ${
                                              anciennes &&
                                              JSON.stringify(anciennes[f.key]) !==
                                                JSON.stringify(nouvelles[f.key])
                                                ? 'text-green-700 font-medium'
                                                : 'text-gray-800'
                                            }`}
                                          >
                                            {formatAuditValue(f.key, nouvelles[f.key])}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {entry.nomUtilisateur && (
                              <p className="text-xs text-gray-400 mt-3">
                                Par{' '}
                                <span className="font-medium text-gray-600">
                                  {entry.nomUtilisateur}
                                </span>
                                {entry.ipAdresse && (
                                  <span className="ml-2">(IP: {entry.ipAdresse})</span>
                                )}
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
