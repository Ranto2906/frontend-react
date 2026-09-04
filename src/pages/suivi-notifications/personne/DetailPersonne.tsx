import { useState, useEffect, Fragment } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { personService } from '../../../services';
import type { Personne, AuditDTO } from '../../../types';

const ROLE_COLORS: Record<string, string> = {
  'Notifié': 'bg-blue-100 text-blue-800',
  'Averti': 'bg-red-100 text-red-800',
  'Avertis': 'bg-red-100 text-red-800',
  'Propriétaire': 'bg-purple-100 text-purple-800',
  'Occupant': 'bg-green-100 text-green-800',
  'Mandataire': 'bg-amber-100 text-amber-800',
  'Tiers': 'bg-gray-100 text-gray-800',
};

const FIELD_LABELS: Record<string, string> = {
  nom: 'Nom',
  contact: 'Contact',
  email: 'Email',
  adresse: 'Adresse',
  role: 'Rôle',
  typePersonne: 'Type',
};

const TYPE_COLORS: Record<string, string> = {
  'DEMANDEUR': 'bg-blue-100 text-blue-800',
  'NOTIFIE': 'bg-blue-100 text-blue-800',
  'AVERTI': 'bg-red-100 text-red-800',
  'OCCUPANT': 'bg-green-100 text-green-800',
  'PROPRIETAIRE': 'bg-purple-100 text-purple-800',
  'MANDATAIRE': 'bg-amber-100 text-amber-800',
};

export default function DetailPersonne() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [personne, setPersonne] = useState<Personne | null>(null);
  const [historique, setHistorique] = useState<AuditDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    const numId = Number(id);

    Promise.all([
      personService.trouverParId(numId),
      personService.historique(numId),
    ])
      .then(([p, hist]) => {
        setPersonne(p);
        setHistorique(hist);
      })
      .catch(() => setError('Personne introuvable'))
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
  if (error || !personne) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="p-12 text-center">
          <p className="text-lg text-gray-500 mb-4">{error || 'Personne introuvable'}</p>
          <Link
            to="/suivi-notifications/personnes"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ← Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  // ── Page complète ──
  return (
    <div className="flex-1 overflow-y-auto p-6">
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
          to="/suivi-notifications/personnes"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          Personnes
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">{personne.nom}</span>
      </div>

      
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          👤 {personne.nom}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/suivi-notifications/personnes/${personne.idPersonne}/edit`)}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            ✏️ Modifier
          </button>
          <Link
            to="/suivi-notifications/personnes"
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors"
          >
            ← Retour liste
          </Link>
        </div>
      </div>

      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">📋 Fiche actuelle</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nom</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Adresse</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                    {personne.nom?.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-800">{personne.nom}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-gray-600">{personne.contact || '—'}</td>
              <td className="px-4 py-3 text-gray-600">{personne.email || '—'}</td>
              <td className="px-4 py-3 text-gray-600 text-xs">{personne.adresse || '—'}</td>
              <td className="px-4 py-3 text-center">
                {personne.libelleTypePersonne ? (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      TYPE_COLORS[personne.codeTypePersonne || ''] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {personne.libelleTypePersonne}
                  </span>
                ) : personne.role ? (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      ROLE_COLORS[personne.role] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {personne.role}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 italic">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-600 text-xs">
                {personne.date
                  ? new Date(personne.date).toLocaleDateString('fr-FR')
                  : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

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
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nom</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Adresse</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {historique.map((entry, idx) => {
                  const anciennes = entry.anciennesValeurs
                    ? JSON.parse(entry.anciennesValeurs)
                    : null;
                  const isExpanded = expandedIdx === idx;

                  return (
                    <Fragment key={entry.idAudit}>
                      {/* Ligne principale : résumé */}
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                            className="p-1 rounded hover:bg-gray-200 transition-colors"
                            title={isExpanded ? 'Masquer' : 'Voir la fiche avant modification'}
                          >
                            <span
                              className={`w-2.5 h-2.5 rounded-full inline-block ${
                                idx === 0 ? 'bg-blue-500' : 'bg-gray-300'
                              }`}
                            ></span>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-xs font-bold">
                              {anciennes?.nom?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <span className="font-medium text-gray-700">
                              {anciennes?.nom || '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{anciennes?.contact || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{anciennes?.email || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{anciennes?.adresse || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          {anciennes?.typePersonne ? (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                            >
                              {anciennes.typePersonne}
                            </span>
                          ) : anciennes?.role ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                ROLE_COLORS[anciennes.role] || 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {anciennes.role}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {formatDate(entry.dateAction)}
                        </td>
                      </tr>

                      {/* Ligne expandable : fiche détaillée avant modif */}
                      {isExpanded && anciennes && (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="w-14 h-14 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-xl font-bold">
                                {anciennes.nom?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
                                  Fiche avant modification — {entry.action || 'Modification'}
                                </p>
                                <p className="text-lg font-bold text-gray-800">{anciennes.nom || '—'}</p>
                                {anciennes.role && (
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                                      ROLE_COLORS[anciennes.role] || 'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {anciennes.role}
                                  </span>
                                )}
                              </div>
                            </div>                              <div className="grid grid-cols-4 gap-4">
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Contact</p>
                                  <p className="text-sm text-gray-800">{anciennes.contact || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email</p>
                                  <p className="text-sm text-gray-800">{anciennes.email || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Adresse</p>
                                  <p className="text-sm text-gray-800">{anciennes.adresse || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Type</p>
                                  <p className="text-sm text-gray-800">{anciennes.typePersonne || '—'}</p>
                                </div>
                              </div>
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


