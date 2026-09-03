import { useState, useEffect, Fragment } from 'react';
import { useParams, Link } from 'react-router-dom';
import { prixM2Service, villeService } from '../../../services';
import type { PrixM2, Ville, AuditDTO } from '../../../types';

function calcTvaPct(prixHt?: number, prixTtc?: number): number | null {
  if (prixHt && prixTtc && prixHt > 0) {
    return Math.round(((prixTtc / prixHt) - 1) * 100 * 100) / 100;
  }
  return null;
}

export default function DetailPrixM2() {
  const { id } = useParams<{ id: string }>();
  const [prix, setPrix] = useState<PrixM2 | null>(null);
  const [ville, setVille] = useState<Ville | null>(null);
  const [historique, setHistorique] = useState<AuditDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    const numId = Number(id);

    Promise.all([
      prixM2Service.trouverParId(numId),
      prixM2Service.historique(numId),
    ])
      .then(([p, hist]) => {
        setPrix(p);
        setHistorique(hist);
        if (p?.idVille) {
          villeService.trouverParId(p.idVille).then(setVille).catch(() => {});
        }
      })
      .catch(() => setError('Prix introuvable'))
      .finally(() => setLoading(false));
  }, [id]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const fmtAr = (v?: number) => (v != null ? `${v.toLocaleString('fr-FR')} Ar` : '—');

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="p-12 text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          Chargement...
        </div>
      </div>
    );
  }

  // ── Erreur ──
  if (error || !prix) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="p-12 text-center">
          <p className="text-lg text-gray-500 mb-4">{error || 'Prix introuvable'}</p>
          <Link to="/suivi/prix-m2" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            ← Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Fil d'Ariane */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link to="/suivi" className="text-gray-400 hover:text-gray-600 transition-colors">Suivi terrain</Link>
        <span className="text-gray-300">/</span>
        <Link to="/suivi/prix-m2" className="text-gray-400 hover:text-gray-600 transition-colors">Prix au m²</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">#{prix.idPrix}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          💰 Prix au M² — {prix.nomVille || '—'}
        </h1>
        <Link
          to="/suivi/prix-m2"
          className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors"
        >
          ← Retour liste
        </Link>
      </div>

      {/* Fiche actuelle */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">📋 Fiche actuelle</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Ville</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Prix HT</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">TVA</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Prix TTC</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Observation</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date MAJ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">🏘️</div>
                  <span className="font-medium text-gray-800">{ville?.nomVille || prix.nomVille || '—'}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-gray-600 text-right font-medium">{fmtAr(prix.prixHt)}</td>
              <td className="px-4 py-3 text-center"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{(() => { const tv = calcTvaPct(prix.prixHt, prix.prixTtc); return tv != null ? `${tv} %` : '—'; })()}</span></td>
              <td className="px-4 py-3 text-gray-800 text-right font-semibold">{fmtAr(prix.prixTtc)}</td>
              <td className="px-4 py-3 text-gray-600 text-xs max-w-[200px] truncate">{prix.observation || '—'}</td>
              <td className="px-4 py-3 text-gray-600 text-xs">
                {prix.dateMaj ? new Date(prix.dateMaj).toLocaleDateString('fr-FR') : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Historique */}
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
            <p className="text-gray-400 text-sm italic">
              Aucune modification enregistrée.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-8"></th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Ancien HT</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Ancien TTC</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Ville</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Observation</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {historique.map((entry, idx) => {
                  const anciennes = entry.anciennesValeurs ? JSON.parse(entry.anciennesValeurs) : null;
                  const nouvelles = entry.nouvellesValeurs ? JSON.parse(entry.nouvellesValeurs) : null;
                  const isExpanded = expandedIdx === idx;

                  return (
                    <Fragment key={entry.idAudit}>
                      {/* Ligne principale */}
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                            className="p-1 rounded hover:bg-gray-200 transition-colors"
                            title={isExpanded ? 'Masquer' : 'Voir les détails'}
                          >
                            <span className={`w-2.5 h-2.5 rounded-full inline-block ${idx === 0 ? 'bg-blue-500' : 'bg-gray-300'}`}></span>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            entry.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                            entry.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                            entry.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {entry.action || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-right text-xs">{anciennes?.prixHt != null ? fmtAr(anciennes.prixHt) : '—'}</td>
                        <td className="px-4 py-3 text-gray-800 text-right text-xs font-medium">{anciennes?.prixTtc != null ? fmtAr(anciennes.prixTtc) : '—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{anciennes?.ville || anciennes?.nomVille || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs max-w-[160px] truncate">{anciennes?.observation || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(entry.dateAction)}</td>
                      </tr>

                      {/* Ligne détaillée expandable */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">
                              {entry.action === 'CREATE' ? 'Données créées' : entry.action === 'DELETE' ? 'Données supprimées' : 'Valeurs avant modification'} — {entry.action || 'Modification'}
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {entry.action !== 'CREATE' && anciennes && (
                                <>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Ancien HT</p>
                                    <p className="text-sm text-gray-800">{fmtAr(anciennes.prixHt)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Ancien TTC</p>
                                    <p className="text-sm text-gray-800 font-medium">{fmtAr(anciennes.prixTtc)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Observation</p>
                                    <p className="text-sm text-gray-800">{anciennes.observation || '—'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Ville</p>
                                    <p className="text-sm text-gray-800">{anciennes.ville || anciennes.nomVille || '—'}</p>
                                  </div>
                                </>
                              )}
                              {nouvelles && (
                                <>
                                  <div className="border-t border-gray-200 pt-3 mt-1 col-span-full">
                                    <p className="text-xs font-medium text-blue-500 uppercase tracking-wide mb-1">Nouvelles valeurs</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Nouveau HT</p>
                                    <p className="text-sm text-blue-700">{fmtAr(nouvelles.prixHt)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Nouveau TTC</p>
                                    <p className="text-sm text-blue-700 font-medium">{fmtAr(nouvelles.prixTtc)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Observation</p>
                                    <p className="text-sm text-blue-700">{nouvelles.observation || '—'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Ville</p>
                                    <p className="text-sm text-blue-700">{nouvelles.ville || nouvelles.nomVille || '—'}</p>
                                  </div>
                                </>
                              )}
                            </div>
                            {entry.nomUtilisateur && (
                              <p className="text-xs text-gray-400 mt-3">
                                Par <span className="font-medium text-gray-600">{entry.nomUtilisateur}</span>
                                {entry.ipAdresse && <span className="ml-2">(IP: {entry.ipAdresse})</span>}
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
