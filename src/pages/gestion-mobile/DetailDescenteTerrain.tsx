import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { descenteTerrainService } from '../../services';
import PhotosSection from '../suivi-notifications/PhotosSection';
import type {
  DescenteTerrainDTO,
  DescenteTerrainRequest,
  DescenteStatutHistorique,
} from '../../types';
import { msgErreur } from '../../utils';

const COULEURS_CONSTAT: Record<string, string> = {
  faisable: '#059669',
  'non faisable': '#dc2626',
  'sous réserve': '#b7791f',
};

const COULEURS_VALIDATION: Record<string, string> = {
  "bon pour la suite": '#059669',
  "en instance": '#f59e0b',
};

const STATUTS_VALIDATION = ['Bon pour la suite', 'En instance'];

function couleur(couleurs: Record<string, string>, valeur?: string): string {
  return couleurs[(valeur || '').toLowerCase()] || '#6b7280';
}

function formatDate(d?: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(d?: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Montant en ariary « 35 351 000 Ar ». */
function montantAr(n?: string | number | null): string {
  const v = typeof n === 'string' ? Number(n) : (n ?? 0);
  return `${Math.round(v).toLocaleString('fr-FR')} Ar`;
}

/** % d'étapes réalisées du dossier (garde-fou division par zéro). */
function tauxEtapes(d: NonNullable<DescenteTerrainDTO['dossier']>): number {
  const total = d.suivi?.length ?? 0;
  if (total === 0) return d.statutFinal ? 100 : 0;
  return Math.round(((d.nombreEtapesRealisees ?? 0) / total) * 100);
}

/** Détail d'une descente : informations du dossier, constat et validation. */
export default function DetailDescenteTerrain() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [dt, setDt] = useState<DescenteTerrainDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirmSuppression, setConfirmSuppression] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Validation
  const [validationChoisie, setValidationChoisie] = useState('');
  const [savingValidation, setSavingValidation] = useState(false);

  // Historique des changements de statut (constat + validation)
  const [historiqueStatuts, setHistoriqueStatuts] = useState<DescenteStatutHistorique[]>([]);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  /** Historique des statuts — échec silencieux (section secondaire). */
  const chargerHistorique = useCallback(() => {
    if (!id) return;
    descenteTerrainService.historiqueStatuts(id)
      .then(setHistoriqueStatuts)
      .catch(() => setHistoriqueStatuts([]));
  }, [id]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const d = await descenteTerrainService.trouverParId(id);
      setDt(d);
      setValidationChoisie(d.validation || 'En instance');
      setErreur('');
      chargerHistorique();
    } catch {
      setErreur('Descente introuvable.');
    } finally {
      setLoading(false);
    }
  }, [id, chargerHistorique]);

  useEffect(() => { load(); }, [load]);

  // Toast transmis par la liste / le formulaire
  useEffect(() => {
    const st = location.state as { toast?: { msg: string; ok: boolean } } | null;
    if (st?.toast) showToast(st.toast.msg, st.toast.ok ?? true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // ── Export PDF de la fiche de descente (constat + photos) ──
  const exporterPdf = async () => {
    if (!dt) return;
    setExportingPdf(true);
    try {
      const blob = await descenteTerrainService.exporterPdf(dt.idDescente);
      const url = URL.createObjectURL(blob);
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = `descente-${dt.reference || dt.idDescente}.pdf`;
      lien.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('Export PDF impossible', false);
    } finally {
      setExportingPdf(false);
    }
  };

  // ── Validation ──
  const handleValidation = async () => {
    if (!dt) return;
    setSavingValidation(true);
    try {
      // Le PUT exige date + statut du constat → on renvoie l'existant.
      const payload: DescenteTerrainRequest = {
        dateDescente: dt.dateDescente || new Date().toISOString().slice(0, 10),
        statutConstat: dt.statutConstat,
        observation: dt.observation,
        mode: dt.mode,
        validation: validationChoisie,
        idPersonne: dt.idPersonne,
        idDossierParcelle: dt.idDossierParcelle,
      };
      const maj = await descenteTerrainService.modifier(dt.idDescente, payload);
      setDt(maj);
      setValidationChoisie(maj.validation || validationChoisie);
      chargerHistorique();
      showToast(`Validation enregistrée : ${maj.validation}`);
    } catch {
      showToast('Erreur lors de la validation', false);
    } finally {
      setSavingValidation(false);
    }
  };

  // ── Suppression ──
  const handleDelete = async () => {
    if (!dt) return;
    try {
      await descenteTerrainService.supprimer(dt.idDescente);
      navigate('/descentes-terrain', { state: { toast: { msg: 'Descente supprimée', ok: true } } });
    } catch (err) {
      showToast(msgErreur(err, 'Erreur lors de la suppression'), false);
      setConfirmSuppression(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="p-12 text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-3"></div>
          Chargement...
        </div>
      </div>
    );
  }

  if (!dt) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="p-12 text-center text-gray-400">
          <p className="text-lg">{erreur || 'Descente introuvable'}</p>
          <Link
            to="/descentes-terrain"
            className="inline-block mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm"
          >
            ← Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  const validationModifiee = validationChoisie !== (dt.validation || 'En instance');

  /** Dossier complet (statut, type, dates, demandeurs, parcelles, suivi). */
  const dossier = dt.dossier;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm transition-all ${
          toast.ok ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* En-tête */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-800">
              🥾 {dt.reference || dt.idDescente.slice(0, 8)}
            </h1>
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
              style={{ background: couleur(COULEURS_CONSTAT, dt.statutConstat) }}
            >
              {dt.statutConstat}
            </span>
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
              style={{ background: couleur(COULEURS_VALIDATION, dt.validation) }}
            >
              {dt.validation}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              {dt.mode === 'offline' ? '📴 Hors ligne' : '🌐 En ligne'}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Descente du {formatDate(dt.dateDescente)}
            {dt.nomVille ? ` · ${dt.nomVille}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/descentes-terrain"
            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 rounded-lg font-medium text-sm transition-colors"
          >
            ← Liste
          </Link>
          <button
            onClick={exporterPdf}
            disabled={exportingPdf}
            title="Télécharger la fiche de descente au format PDF"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 rounded-lg transition-colors"
          >
            {exportingPdf ? '⏳ Génération…' : '⬇ PDF'}
          </button>
          <Link
            to={`/descentes-terrain/${dt.idDescente}/modifier`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
          >
            ✏️ Modifier
          </Link>
          <button
            onClick={() => setConfirmSuppression(true)}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-medium text-sm transition-colors"
          >
            🗑️ Supprimer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Colonne principale ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Constat */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">📋 Constat relevé</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {dt.observation || <span className="text-gray-400">Aucune observation saisie.</span>}
            </p>
          </div>

          {/* Dossier rattaché — informations complètes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-gray-700">📁 Dossier rattaché</h2>
              {dossier && (
                <Link
                  to={`/demandes/${dossier.idDossier}`}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Ouvrir le dossier complet →
                </Link>
              )}
            </div>

            {!dt.numeroDossier && !dt.numeroLot && !dt.numeroPropriete ? (
              <p className="text-sm text-gray-400">Aucun dossier rattaché à cette descente.</p>
            ) : (
              <>
                {/* Identité + statut du dossier */}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className="text-base font-bold text-gray-800">{dt.numeroDossier || '—'}</span>
                  {dossier?.libelleStatut && (
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
                      style={{ background: dossier.couleurStatutHex || '#6b7280' }}
                    >
                      {dossier.libelleStatut}
                      {dossier.statutFinal ? ' ✔' : ''}
                    </span>
                  )}
                  {dossier?.libelleTypeDossier && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                      {dossier.libelleTypeDossier}
                    </span>
                  )}
                  {dossier?.libelleDossierFournie && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      {dossier.libelleDossierFournie}
                    </span>
                  )}
                </div>

                <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-gray-500">Date de demande</dt>
                    <dd className="font-medium text-gray-800">{formatDate(dossier?.dateDemande)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Année</dt>
                    <dd className="font-medium text-gray-800">{dossier?.annee ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Transmission</dt>
                    <dd className="font-medium text-gray-800">{dossier?.transmission || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Résultat d'étude</dt>
                    <dd className="font-medium text-gray-800">{dossier?.resultatEtude || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Validé le</dt>
                    <dd className="font-medium text-gray-800">{formatDate(dossier?.dateValidation)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Montant total</dt>
                    <dd className="font-medium text-gray-800">{montantAr(dossier?.montantTotal)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Propriété</dt>
                    <dd className="font-medium text-gray-800">{dt.numeroPropriete || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Parcelle (lot)</dt>
                    <dd className="font-medium text-gray-800">{dt.numeroLot || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Superficie</dt>
                    <dd className="font-medium text-gray-800">
                      {dt.superficieM2 != null ? `${dt.superficieM2} m²` : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Ville</dt>
                    <dd className="font-medium text-gray-800">{dossier?.nomVille || dt.nomVille || '—'}</dd>
                  </div>
                  {dossier?.observation && (
                    <div className="col-span-2 md:col-span-3">
                      <dt className="text-xs text-gray-500">Observation du dossier</dt>
                      <dd className="text-gray-700 whitespace-pre-wrap">{dossier.observation}</dd>
                    </div>
                  )}
                </dl>

                {/* Avancement du workflow */}
                {dossier && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500">
                        Avancement{dossier.etapeActuelleLibelle ? ` — étape : ${dossier.etapeActuelleLibelle}` : ''}
                      </span>
                      <span className="font-semibold text-gray-700">
                        {dossier.nombreEtapesRealisees ?? 0} étape(s) réalisée(s)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${tauxEtapes(dossier)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Demandeurs du dossier */}
                {(dossier?.demandeurs ?? []).length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">
                      Demandeurs ({dossier!.demandeurs!.length})
                    </p>
                    <ul className="space-y-1.5">
                      {dossier!.demandeurs!.map((d) => (
                        <li key={d.idPersonne} className="text-sm flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-800">{d.nom}</span>
                          {d.role && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{d.role}</span>
                          )}
                          {d.libelleTypePersonne && (
                            <span className="text-[11px] text-gray-400">{d.libelleTypePersonne}</span>
                          )}
                          {d.contact && <span className="text-xs text-gray-500">· {d.contact}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Parcelles du dossier */}
                {(dossier?.parcelles ?? []).length > 1 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">
                      Parcelles du dossier ({dossier!.parcelles!.length})
                    </p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-400 border-b border-gray-100">
                          <th className="text-left font-medium py-1.5">Lot</th>
                          <th className="text-left font-medium py-1.5">Propriété</th>
                          <th className="text-right font-medium py-1.5">Superficie</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dossier!.parcelles!.map((p, i) => (
                          <tr
                            key={p.idDossierParcelle ?? i}
                            className={`border-b border-gray-50 last:border-0 ${
                              p.idDossierParcelle === dt.idDossierParcelle ? 'bg-amber-50' : ''
                            }`}
                          >
                            <td className="py-1.5 text-gray-700">{p.numeroLot || '—'}</td>
                            <td className="py-1.5 text-gray-700">{p.numeroPropriete || p.nomPropriete || '—'}</td>
                            <td className="py-1.5 text-right text-gray-700">
                              {p.superficieM2 != null ? `${p.superficieM2} m²` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-[10px] text-gray-400 mt-1">La ligne de cette descente est surlignée.</p>
                  </div>
                )}

                {/* Étapes de suivi */}
                {(dossier?.suivi ?? []).length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">Étapes de suivi</p>
                    <ol className="space-y-1.5">
                      {dossier!.suivi!.map((s) => (
                        <li key={s.idSuivi} className="text-xs flex items-center gap-2 flex-wrap">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: s.dateRealisation ? (s.couleurStatutCouleurHex || '#16a34a') : '#e5e7eb' }}
                          />
                          <span className="text-gray-400 w-6">{s.ordreEtape}</span>
                          <span className="font-medium text-gray-700">{s.libelleEtape}</span>
                          {s.dateRealisation ? (
                            <span className="text-gray-500">— réalisée le {formatDate(s.dateRealisation)}</span>
                          ) : (
                            <span className="text-gray-400 italic">— en attente</span>
                          )}
                          {s.commentaire && <span className="text-gray-400">· {s.commentaire}</span>}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Photos prises sur le terrain (mobile) — type d'entité « descente_terrain » */}
          <PhotosSection entiteType="descente_terrain" entiteId={dt.idDescente} />

          {/* Demandeur */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">👤 Demandeur</h2>
            {dt.nomPersonne ? (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs text-gray-500">Nom</dt>
                  <dd className="font-medium text-gray-800">{dt.nomPersonne}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Contact</dt>
                  <dd className="font-medium text-gray-800">{dt.contactPersonne || '—'}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-gray-400">Aucun demandeur rattaché.</p>
            )}
          </div>

          {/* ── Historique des changements de statut ── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">🕘 Historique des statuts</h2>
              {historiqueStatuts.length > 0 && (
                <span className="text-xs text-gray-400">
                  {historiqueStatuts.length} changement{historiqueStatuts.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {historiqueStatuts.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun changement de statut enregistré.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left font-medium py-1.5 pr-3">Date de modification</th>
                      <th className="text-left font-medium py-1.5 pr-3">Statut</th>
                      <th className="text-left font-medium py-1.5">Par</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historiqueStatuts.map((h, i) => (
                      <tr key={`${h.champ}-${h.dateModification}-${i}`} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 pr-3 text-xs text-gray-500 whitespace-nowrap align-top">
                          {formatDateTime(h.dateModification)}
                        </td>
                        <td className="py-2 pr-3 align-top">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] text-gray-400">{h.libelleChamp}</span>
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium text-white"
                              style={{
                                background: couleur(
                                  h.champ === 'validation' ? COULEURS_VALIDATION : COULEURS_CONSTAT,
                                  h.nouveauStatut,
                                ),
                              }}
                            >
                              {h.nouveauStatut}
                            </span>
                            {h.ancienStatut && (
                              <span className="text-[11px] text-gray-400">← {h.ancienStatut}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 text-xs text-gray-600 align-top">
                          {h.nomUtilisateur || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Colonne latérale ── */}
        <div className="space-y-4">
          {/* Validation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">✅ Validation</h2>
            <label className="block text-xs font-medium text-gray-500 mb-1">Statut de validation</label>
            <select
              value={validationChoisie}
              onChange={(e) => setValidationChoisie(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none mb-3"
            >
              {STATUTS_VALIDATION.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={handleValidation}
              disabled={!validationModifiee || savingValidation}
              className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
            >
              {savingValidation ? 'Enregistrement...' : '💾 Enregistrer la validation'}
            </button>
            <dl className="mt-4 space-y-2 text-sm border-t border-gray-100 pt-3">
              <div>
                <dt className="text-xs text-gray-500">Validée le</dt>
                <dd className="text-gray-800">{formatDateTime(dt.dateValidation)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Validée par</dt>
                <dd className="text-gray-800">{dt.nomUtilisateurValidation || '—'}</dd>
              </div>
            </dl>
          </div>

          {/* Traçabilité */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">🕒 Traçabilité</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-gray-500">Créée le</dt>
                <dd className="text-gray-800">{formatDateTime(dt.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Créée par</dt>
                <dd className="text-gray-800">{dt.nomUtilisateurCreation || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Dernière modification</dt>
                <dd className="text-gray-800">{formatDateTime(dt.dateModification)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Synchronisée</dt>
                <dd className="text-gray-800">{dt.synchronise ? '✅ Oui' : '❌ Non'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Identifiant</dt>
                <dd className="text-gray-800 text-xs font-mono break-all">{dt.idDescente}</dd>
              </div>
            </dl>
          </div>

          {/* Géométrie — sur la carte */}
          <Link
            to="/carte"
            className="block bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:border-amber-300 hover:shadow-md transition-all"
          >
            <h2 className="text-sm font-semibold text-gray-700 mb-1">🗺️ Localisation</h2>
            <p className="text-xs text-gray-500">
              Les descentes sont affichées sur la carte interactive (couche « Descente terrain ») —
              y compris la géométrie GPS éventuellement relevée sur le terrain.
            </p>
          </Link>
        </div>
      </div>

      {/* ── Modal suppression ── */}
      {confirmSuppression && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setConfirmSuppression(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-red-200 bg-red-50">
              <h2 className="text-lg font-bold text-red-800">🗑️ Supprimer la descente</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700">
                Supprimer définitivement la descente{' '}
                <strong>{dt.reference || dt.idDescente.slice(0, 8)}</strong>
                {dt.numeroDossier ? ` (dossier ${dt.numeroDossier})` : ''} ?
              </p>
              <p className="text-xs text-red-600 mt-2">
                Cette information sera placer dans le corbeille. La géométrie GPS associée sera également supprimée.
              </p>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setConfirmSuppression(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
