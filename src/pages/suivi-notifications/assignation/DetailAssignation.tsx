import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  assignationService,
  signalementService,
  notificationOccupationService,
  avertissementService,
} from '../../../services';
import type { Assignation, Signalement, NotificationOccupation, Avertissement } from '../../../types';

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateHeure(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatutBadge({ couleur, libelle }: { couleur?: string; libelle?: string }) {
  if (!libelle) return null;
  return (
    <span
      className="px-2 py-1 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: couleur || '#6b7280' }}
    >
      {libelle}
    </span>
  );
}

export default function DetailAssignation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [assignation, setAssignation] = useState<Assignation | null>(null);
  const [signalement, setSignalement] = useState<Signalement | null>(null);
  const [cibleNotification, setCibleNotification] = useState<NotificationOccupation | null>(null);
  const [cibleAvertissement, setCibleAvertissement] = useState<Avertissement | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [modalDelete, setModalDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // Toast transmis par une autre page
  useEffect(() => {
    const st = location.state as { toast?: { msg: string; ok?: boolean } } | null;
    if (st?.toast) showToast(st.toast.msg, st.toast.ok ?? true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErreur(null);
    try {
      const a = await assignationService.trouverParId(Number(id));
      setAssignation(a);

      // Signalement complet (best effort — le DTO assignation suffit sinon)
      if (a.idSignalement) {
        try {
          setSignalement(await signalementService.trouverParId(a.idSignalement));
        } catch {
          /* ignoré */
        }
      }
      // Cible complète
      if (a.typeCible === 'notification' && a.idNotification) {
        try {
          setCibleNotification(await notificationOccupationService.trouverParId(a.idNotification));
        } catch {
          /* ignoré */
        }
      } else if (a.typeCible === 'avertissement' && a.idAvertissement) {
        try {
          setCibleAvertissement(await avertissementService.trouverParId(a.idAvertissement));
        } catch {
          /* ignoré */
        }
      }
    } catch {
      setErreur("Impossible de charger l'assignation. Vérifiez que le backend est démarré.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!assignation) return;
    setDeleting(true);
    try {
      if (assignation.typeCible === 'notification' && assignation.idSignalement && assignation.idNotification) {
        await assignationService.desassignerNotification(assignation.idSignalement, assignation.idNotification);
      } else if (
        assignation.typeCible === 'avertissement' &&
        assignation.idSignalement &&
        assignation.idAvertissement
      ) {
        await assignationService.desassignerAvertissement(assignation.idSignalement, assignation.idAvertissement);
      }
      navigate('/suivi-notifications/assignations', {
        state: { toast: { msg: 'Assignation retirée', ok: true } },
      });
    } catch {
      showToast('Erreur lors de la suppression', false);
      setDeleting(false);
      setModalDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="p-12 text-center text-gray-500">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mb-3" />
          <p>Chargement de l'assignation...</p>
        </div>
      </div>
    );
  }

  if (erreur || !assignation) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="p-12 text-center">
          <p className="text-3xl mb-2">⚠️</p>
          <p className="text-red-600 font-medium">{erreur || 'Assignation introuvable'}</p>
          <Link
            to="/suivi-notifications/assignations"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
          >
            ← Retour aux assignations
          </Link>
        </div>
      </div>
    );
  }

  const estNotification = assignation.typeCible === 'notification';

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
      <div className="flex items-center gap-2 mb-4 text-sm">
        <Link to="/suivi-notifications" className="text-gray-400 hover:text-gray-600 transition-colors">
          🔔 Suivi des notifications
        </Link>
        <span className="text-gray-300">/</span>
        <Link to="/suivi-notifications/assignations" className="text-gray-400 hover:text-gray-600 transition-colors">
          Assignations
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">#{assignation.idAssignation}</span>
      </div>

      {/* En-tête */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-800">
              {estNotification ? "🏠 Assignation à une notification d'occupation" : '⚠️ Assignation à un avertissement'}
            </h1>
            {estNotification ? (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                Notification
              </span>
            ) : (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                Avertissement
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm">
            Assignation n° {assignation.idAssignation} — créée le {formatDateHeure(assignation.dateAssignation)}
            {assignation.nomUtilisateur ? ` par ${assignation.nomUtilisateur}` : ''}
          </p>
        </div>
        <button
          onClick={() => setModalDelete(true)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
        >
          🗑️ Retirer l'assignation
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Signalement ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">📍 Signalement</h2>
            {assignation.idSignalement && (
              <Link
                to={`/signalements/${assignation.idSignalement}`}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Voir la fiche →
              </Link>
            )}
          </div>
          <div className="p-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Référence</span>
              <span className="font-medium text-gray-800">{assignation.referenceSignalement || '—'}</span>
            </div>
            {signalement && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Type</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: signalement.couleurType || '#6b7280' }}
                  >
                    {signalement.libelleType || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Statut</span>
                  <StatutBadge couleur={signalement.couleurStatutHex} libelle={signalement.libelleStatut} />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Ville</span>
                  <span className="text-gray-800">{signalement.nomVille || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Propriété</span>
                  <span className="text-gray-800">{signalement.numeroPropriete || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Parcelle / lot</span>
                  <span className="text-gray-800">{signalement.numeroLot || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date du signalement</span>
                  <span className="text-gray-800">{formatDate(signalement.dateSignalement)}</span>
                </div>
                {signalement.description && (
                  <div>
                    <span className="text-gray-500">Description</span>
                    <p className="mt-1 text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                      {signalement.description}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Cible : notification ou avertissement ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">
              {estNotification ? "🏠 Notification d'occupation" : '⚠️ Avertissement'}
            </h2>
            {estNotification && assignation.idNotification && (
              <Link
                to={`/suivi-notifications/occupation/${assignation.idNotification}`}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Voir la fiche →
              </Link>
            )}
            {!estNotification && assignation.idAvertissement && (
              <Link
                to={`/suivi-notifications/avertissements/${assignation.idAvertissement}`}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Voir la fiche →
              </Link>
            )}
          </div>
          <div className="p-5 space-y-3 text-sm">
            {estNotification ? (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date de notification</span>
                  <span className="text-gray-800">{formatDate(cibleNotification?.dateNotification ?? assignation.dateNotification)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Année</span>
                  <span className="text-gray-800">{cibleNotification?.annee ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Statut</span>
                  <span className="text-gray-800">{cibleNotification?.statut || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Propriété</span>
                  <span className="text-gray-800">
                    {cibleNotification?.numeroPropriete ?? assignation.numeroProprieteNotification ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Parcelle / lot</span>
                  <span className="text-gray-800">{cibleNotification?.numeroLot || '—'}</span>
                </div>
                {cibleNotification?.dateConvocation && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Convocation</span>
                    <span className="text-gray-800">{formatDateHeure(cibleNotification.dateConvocation)}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date de l'avertissement</span>
                  <span className="text-gray-800">
                    {formatDate(cibleAvertissement?.dateAvertissement ?? assignation.dateAvertissement)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Année</span>
                  <span className="text-gray-800">{cibleAvertissement?.annee ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Propriété</span>
                  <span className="text-gray-800">
                    {cibleAvertissement?.numeroPropriete ?? assignation.numeroProprieteAvertissement ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Parcelle / lot</span>
                  <span className="text-gray-800">{cibleAvertissement?.numeroLot || '—'}</span>
                </div>
                {cibleAvertissement?.nomPersonne && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Personne visée</span>
                    <span className="text-gray-800">{cibleAvertissement.nomPersonne}</span>
                  </div>
                )}
                {cibleAvertissement?.mission && (
                  <div>
                    <span className="text-gray-500">Mission</span>
                    <p className="mt-1 text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                      {cibleAvertissement.mission}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Trace ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-4">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">🕒 Traçabilité</h2>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500 block mb-1">Date d'assignation</span>
            <span className="font-medium text-gray-800">{formatDateHeure(assignation.dateAssignation)}</span>
          </div>
          <div>
            <span className="text-gray-500 block mb-1">Effectuée par</span>
            <span className="font-medium text-gray-800">{assignation.nomUtilisateur || '—'}</span>
          </div>
          <div>
            <span className="text-gray-500 block mb-1">Identifiant interne</span>
            <span className="font-medium text-gray-800">#{assignation.idAssignation}</span>
          </div>
        </div>
      </div>

      {/* Modal confirmation suppression */}
      {modalDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Retirer l'assignation ?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Le lien entre le signalement{' '}
              <span className="font-medium">{assignation.referenceSignalement}</span> et{' '}
              {estNotification
                ? "la notification d'occupation"
                : "l'avertissement"}{' '}
              sera supprimé. Le signalement et la cible ne sont pas supprimés.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalDelete(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {deleting ? 'Suppression...' : 'Retirer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
