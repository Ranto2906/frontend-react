import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  assignationService,
  signalementService,
  notificationOccupationService,
  avertissementService,
} from '../../../services';
import type { Signalement, NotificationOccupation, Avertissement } from '../../../types';

type TypeCible = 'notification' | 'avertissement';

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function AssignationForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ── Sélection ──
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [notifications, setNotifications] = useState<NotificationOccupation[]>([]);
  const [avertissements, setAvertissements] = useState<Avertissement[]>([]);
  const [idSignalement, setIdSignalement] = useState<string | null>(searchParams.get('idSignalement'));
  const [typeCible, setTypeCible] = useState<TypeCible>('notification');
  const [idCible, setIdCible] = useState<string | null>(null);

  // ── Filtres locaux ──
  const [filtreSig, setFiltreSig] = useState('');
  const [filtreCible, setFiltreCible] = useState('');

  // ── États ──
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Chargement des données de sélection (200 plus récents de chaque liste)
  useEffect(() => {
    let annule = false;
    (async () => {
      setLoading(true);
      setErreur(null);
      try {
        const [sigPage, notifPage, avertPage] = await Promise.all([
          signalementService.lister(0, 200),
          notificationOccupationService.lister(0, 200),
          avertissementService.lister(0, 200),
        ]);
        if (annule) return;
        setSignalements(sigPage.content);
        setNotifications(notifPage.content);
        setAvertissements(avertPage.content);
      } catch {
        if (!annule) setErreur('Erreur lors du chargement des données. Vérifiez que le backend est démarré.');
      } finally {
        if (!annule) setLoading(false);
      }
    })();
    return () => {
      annule = true;
    };
  }, []);

  const signalementChoisi = useMemo(
    () => signalements.find((s) => s.idSignalement === idSignalement) ?? null,
    [signalements, idSignalement]
  );

  const ciblesFiltrees = useMemo(() => {
    const needle = filtreCible.trim().toLowerCase();
    if (typeCible === 'notification') {
      return notifications.filter(
        (n) =>
          !needle ||
          (n.numeroPropriete ?? '').toLowerCase().includes(needle) ||
          (n.numeroLot ?? '').toLowerCase().includes(needle) ||
          (n.statut ?? '').toLowerCase().includes(needle) ||
          String(n.annee ?? '').includes(needle)
      );
    }
    return avertissements.filter(
      (a) =>
        !needle ||
        (a.numeroPropriete ?? '').toLowerCase().includes(needle) ||
        (a.numeroLot ?? '').toLowerCase().includes(needle) ||
        (a.nomPersonne ?? '').toLowerCase().includes(needle) ||
        String(a.annee ?? '').includes(needle)
    );
  }, [typeCible, notifications, avertissements, filtreCible]);

  const signalementsFiltres = useMemo(() => {
    const needle = filtreSig.trim().toLowerCase();
    if (!needle) return signalements;
    return signalements.filter(
      (s) =>
        (s.reference ?? '').toLowerCase().includes(needle) ||
        (s.description ?? '').toLowerCase().includes(needle) ||
        (s.nomVille ?? '').toLowerCase().includes(needle) ||
        (s.numeroPropriete ?? '').toLowerCase().includes(needle)
    );
  }, [signalements, filtreSig]);

  const peutEnregistrer = Boolean(idSignalement && idCible);

  const handleEnregistrer = async () => {
    if (!peutEnregistrer) return;
    setSaving(true);
    setErreur(null);
    try {
      const cible = idCible as string;
      const res =
        typeCible === 'notification'
          ? await assignationService.assignerNotification(idSignalement as string, cible)
          : await assignationService.assignerAvertissement(idSignalement as string, cible);
      navigate(`/suivi-notifications/assignations/${res.idAssignation}`, {
        state: { toast: { msg: 'Assignation créée', ok: true } },
      });
    } catch (e) {
      const msg =
        e instanceof Error && e.message.includes('409')
          ? 'Cette assignation existe déjà.'
          : "Erreur lors de l'enregistrement de l'assignation.";
      setErreur(msg);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="p-12 text-center text-gray-500">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mb-3" />
          <p>Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Toast (retour de navigation) */}

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
        <span className="text-gray-700 font-medium">Nouvelle assignation</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-1">🔗 Nouvelle assignation</h1>
      <p className="text-gray-500 text-sm mb-6">
        Sélectionnez le signalement à traiter, puis la notification d'occupation ou l'avertissement à lui associer.
      </p>

      {erreur && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{erreur}</div>
      )}

      {/* ── Étape 1 : signalement ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">1️⃣ Signalement</h2>
          {signalementChoisi && (
            <span className="text-sm text-green-700 font-medium">✓ {signalementChoisi.reference}</span>
          )}
        </div>
        <div className="p-4">
          {!signalementChoisi && (
            <input
              type="text"
              value={filtreSig}
              onChange={(e) => setFiltreSig(e.target.value)}
              placeholder="Filtrer (référence, description, ville, propriété...)"
              className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          {signalementChoisi ? (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div>
                <p className="font-medium text-gray-800 text-sm">
                  {signalementChoisi.reference} — {signalementChoisi.libelleType ?? '—'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {signalementChoisi.nomVille ?? '—'} · {signalementChoisi.libelleStatut ?? '—'} ·{' '}
                  {formatDate(signalementChoisi.dateSignalement)}
                </p>
              </div>
              <button
                onClick={() => {
                  setIdSignalement(null);
                  setIdCible(null);
                }}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Changer
              </button>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
              {signalementsFiltres.length === 0 ? (
                <p className="p-4 text-sm text-gray-500 text-center">Aucun signalement trouvé</p>
              ) : (
                signalementsFiltres.map((s) => (
                  <button
                    key={s.idSignalement}
                    onClick={() => {
                      setIdSignalement(s.idSignalement);
                      setIdCible(null);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-800">{s.reference}</p>
                    <p className="text-xs text-gray-500">
                      {s.nomVille ?? '—'} · {s.libelleType ?? '—'} · {s.libelleStatut ?? '—'} ·{' '}
                      {formatDate(s.dateSignalement)}
                    </p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Étape 2 : cible ── */}
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${!idSignalement ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">2️⃣ Cible de l'assignation</h2>
          {idCible && <span className="text-sm text-green-700 font-medium">✓ Sélection faite</span>}
        </div>
        <div className="p-4">
          {/* Type */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => {
                setTypeCible('notification');
                setIdCible(null);
                setFiltreCible('');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                typeCible === 'notification'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🏠 Notification d'occupation
            </button>
            <button
              onClick={() => {
                setTypeCible('avertissement');
                setIdCible(null);
                setFiltreCible('');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                typeCible === 'avertissement'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ⚠️ Avertissement
            </button>
          </div>

          {!idCible && (
            <input
              type="text"
              value={filtreCible}
              onChange={(e) => setFiltreCible(e.target.value)}
              placeholder={
                typeCible === 'notification'
                  ? 'Filtrer (n° propriété, lot, statut, année...)'
                  : 'Filtrer (n° propriété, lot, personne, année...)'
              }
              className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          {idCible ? (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div>
                <p className="font-medium text-gray-800 text-sm">
                  {typeCible === 'notification' ? "Notification d'occupation" : 'Avertissement'} —{' '}
                  {ciblesFiltrees.find((c) =>
                    typeCible === 'notification'
                      ? (c as NotificationOccupation).idNotification === idCible
                      : (c as Avertissement).idAvertissement === idCible
                  )?.numeroPropriete ?? '—'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {(() => {
                    const c = ciblesFiltrees.find((c) =>
                      typeCible === 'notification'
                        ? (c as NotificationOccupation).idNotification === idCible
                        : (c as Avertissement).idAvertissement === idCible
                    ) as NotificationOccupation | Avertissement | undefined;
                    if (!c) return '—';
                    return typeCible === 'notification'
                      ? `Propriété ${(c as NotificationOccupation).numeroPropriete ?? '—'} · ${formatDate((c as NotificationOccupation).dateNotification)}`
                      : `Propriété ${(c as Avertissement).numeroPropriete ?? '—'} · ${formatDate((c as Avertissement).dateAvertissement)}`;
                  })()}
                </p>
              </div>
              <button
                onClick={() => setIdCible(null)}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Changer
              </button>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
              {ciblesFiltrees.length === 0 ? (
                <p className="p-4 text-sm text-gray-500 text-center">
                  Aucune {typeCible === 'notification' ? 'notification' : 'alerte'} trouvée
                </p>
              ) : (
                ciblesFiltrees.map((c) => {
                  const id = typeCible === 'notification'
                    ? (c as NotificationOccupation).idNotification
                    : (c as Avertissement).idAvertissement;
                  const numeroPropriete = (c as NotificationOccupation).numeroPropriete ?? '—';
                  const date = typeCible === 'notification'
                    ? formatDate((c as NotificationOccupation).dateNotification)
                    : formatDate((c as Avertissement).dateAvertissement);
                  const extra =
                    typeCible === 'notification'
                      ? (c as NotificationOccupation).statut
                      : (c as Avertissement).nomPersonne || '—';
                  return (
                    <button
                      key={id}
                      onClick={() => setIdCible(id)}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-800">
                        {typeCible === 'notification' ? '🏠' : '⚠️'} Propriété {numeroPropriete} · {date}
                      </p>
                      <p className="text-xs text-gray-500">
                        Lot {(c as NotificationOccupation).numeroLot || '—'} · {extra}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center justify-between mt-6">
        <Link
          to="/suivi-notifications/assignations"
          className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Annuler
        </Link>
        <button
          onClick={handleEnregistrer}
          disabled={!peutEnregistrer || saving}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
        >
          {saving && <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
          {saving ? 'Enregistrement...' : '🔗 Créer l\u2019assignation'}
        </button>
      </div>
    </div>
  );
}
