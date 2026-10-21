import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { dossierService, prixM2Service, proprieteService } from '../../services';
import DocumentsDemandeur from './DocumentsDemandeur';
import type { DemandeDossier, ParcelleDemandee, PrixM2, SuiviEtape, Etape, StatutCouleur, AuditEntry } from '../../types';

function formatDate(d?: string | null): string {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
}

// ════════════════════════════════════════════════════════════
// Détail d'une demande : informations, demandeurs et suivi
// (changement d'étape du workflow).
// ════════════════════════════════════════════════════════════
export default function DetailDemande() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [dos, setDos] = useState<DemandeDossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [lieuxProprietes, setLieuxProprietes] = useState<Record<number, string>>({});
  // Prix au m² de la ville du dossier (calcul TTC/HT à la volée)
  const [prixVille, setPrixVille] = useState<PrixM2 | null>(null);

  // Suivi : formulaire de changement d'étape
  const [etapes, setEtapes] = useState<Etape[]>([]);
  const [statutsCouleur, setStatutsCouleur] = useState<StatutCouleur[]>([]);
  const [etapeChoisie, setEtapeChoisie] = useState('');
  const [dateRealisation, setDateRealisation] = useState(new Date().toISOString().slice(0, 10));
  const [couleurChoisie, setCouleurChoisie] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [savingEtape, setSavingEtape] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [etapeSuppression, setEtapeSuppression] = useState<SuiviEtape | null>(null);

  // Historique des modifications (audit)
  const [historique, setHistorique] = useState<AuditEntry[]>([]);
  const [expandedHistoriqueIdx, setExpandedHistoriqueIdx] = useState<number | null>(0);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Export PDF officiel de la demande (document A4 généré par le backend) ──
  const exporterPdf = async () => {
    if (!dos) return;
    setExportingPdf(true);
    try {
      const blob = await dossierService.exporterPdf(dos.idDossier);
      const url = URL.createObjectURL(blob);
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = `demande-${dos.numeroDossier}.pdf`;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      URL.revokeObjectURL(url);
      showToast('Document PDF généré');
    } catch {
      showToast("Export PDF impossible", false);
    } finally {
      setExportingPdf(false);
    }
  };

  const charger = useCallback(async () => {
    if (!id) return;
    try {
      const [d, e, sc] = await Promise.all([
        dossierService.trouverParId(Number(id)),
        dossierService.listerEtapes(),
        dossierService.listerStatutsCouleur(),
      ]);
      setDos(d);
      setEtapes(e);
      setStatutsCouleur(sc);
      try {
        const idsProprietes = [...new Set(
          (d.parcelles ?? [])
            .map((parcelle) => parcelle.idPropriete)
            .filter((idPropriete): idPropriete is number => idPropriete != null),
        )];
        const proprietes = await Promise.all(
          idsProprietes.map(async (idPropriete) => {
            try {
              return await proprieteService.trouverParId(idPropriete);
            } catch {
              return null;
            }
          }),
        );
        setLieuxProprietes(Object.fromEntries(
          proprietes
            .filter((propriete): propriete is NonNullable<typeof propriete> => propriete != null && Boolean(propriete.libelleLieu))
            .map((propriete) => [propriete.idPropriete, propriete.libelleLieu as string]),
        ));
      } catch {
        setLieuxProprietes({});
      }
      // Historique des modifications (échec silencieux : section secondaire)
      dossierService.listerModifications(Number(id))
        .then((h) => setHistorique(h))
        .catch(() => setHistorique([]));
      // Prix au m² de la ville du dossier (pour calculer les montants par parcelle)
      if (d.idVille != null) {
        prixM2Service.listerParVille(d.idVille)
          .then((liste) => setPrixVille(liste.length > 0 ? liste[0] : null))
          .catch(() => setPrixVille(null));
      } else {
        setPrixVille(null);
      }
      // Pré-sélectionne la prochaine étape non réalisée
      const realisees = new Set((d.suivi ?? []).filter((s) => s.dateRealisation).map((s) => s.idEtape));
      const prochaine = e.find((et) => !realisees.has(et.idEtape));
      setEtapeChoisie((prev) => prev || (prochaine ? String(prochaine.idEtape) : ''));
    } catch {
      showToast('Dossier introuvable', false);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { charger(); }, [charger]);

  // ── Montant calculé d'une parcelle demandée : superficie × prix au m² de la ville ──
  const montantParcelle = (p: ParcelleDemandee, ttc: boolean): number | null => {
    if (p.superficieM2 == null || !prixVille) return null;
    const prix = ttc ? prixVille.prixTtc : prixVille.prixHt;
    if (prix == null) return null;
    return Number(p.superficieM2) * Number(prix);
  };
  const montantParcelleTtc = (p: ParcelleDemandee) => montantParcelle(p, true);

  // Total TTC = somme des montants calculés par parcelle (null si incomplet)
  const totalTtcCalcule = useMemo<number | null>(() => {
    if (!dos?.parcelles || dos.parcelles.length === 0) return null;
    const details = dos.parcelles.map((p) => montantParcelleTtc(p));
    if (details.some((m) => m == null)) return null;
    return details.reduce<number>((sum, amount) => sum + (amount ?? 0), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dos, prixVille]);

  const formatAr = (n: number) =>
    n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const lieux = [...new Set(
    (dos?.parcelles ?? [])
      .map((p) => p.libelleLieu || p.nomLieu || (p.idPropriete != null ? lieuxProprietes[p.idPropriete] : undefined))
      .filter((lieu): lieu is string => Boolean(lieu)),
  )].join(', ');

  // Toast transmis par le formulaire
  useEffect(() => {
    const st = location.state as { toast?: { msg: string; ok?: boolean } } | null;
    if (st?.toast) showToast(st.toast.msg, st.toast.ok ?? true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // ── Changement d'étape ──
  const enregistrerEtape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dos || !etapeChoisie) return;
    setSavingEtape(true);
    try {
      await dossierService.enregistrerEtape(dos.idDossier, {
        idEtape: Number(etapeChoisie),
        dateRealisation: dateRealisation || undefined,
        idStatutCouleur: couleurChoisie ? Number(couleurChoisie) : undefined,
        commentaire: commentaire.trim() || undefined,
      });
      showToast('Étape enregistrée — avancement mis à jour');
      setCommentaire('');
      setCouleurChoisie('');
      await charger();
    } catch {
      showToast('Erreur lors de l\'enregistrement de l\'étape', false);
    } finally {
      setSavingEtape(false);
    }
  };

  const supprimerEtape = async (s: SuiviEtape) => {
    if (!dos) return;
    try {
      await dossierService.supprimerEtape(dos.idDossier, s.idSuivi);
      showToast('Étape retirée du suivi');
      setEtapeSuppression(null);
      await charger();
    } catch {
      showToast('Erreur lors de la suppression', false);
    }
  };

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

  if (!dos) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="p-12 text-center text-gray-400">
          <p className="text-lg">Dossier introuvable</p>
          <Link to="/demandes/liste" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
            ← Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  const suivi = dos.suivi ?? [];
  const realisees = suivi.filter((s) => s.dateRealisation);
  const etapesRestantes = etapes.filter(
    (et) => !suivi.some((s) => s.idEtape === et.idEtape && s.dateRealisation),
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${
          toast.ok ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* En-tête */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">📁 {dos.numeroDossier}</h1>
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
              style={{ background: dos.couleurStatutHex || '#6b7280' }}
            >
              {dos.libelleStatut || 'Sans statut'}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {lieux || 'Lieu non renseigné'} — demande du {formatDate(dos.dateDemande ?? null)}
            {dos.annee ? ` · année ${dos.annee}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ← Retour
          </button>
          <button
            onClick={exporterPdf}
            disabled={exportingPdf}
            title="Télécharger la fiche officielle de la demande au format PDF"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 rounded-lg transition-colors"
          >
            {exportingPdf ? '⏳ Génération…' : '⬇ PDF'}
          </button>
          <Link
            to={`/demandes/${dos.idDossier}/modifier`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
          >
            ✏️ Modifier
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Colonne gauche : informations ── */}
        <div className="lg:col-span-3 space-y-6">
          {/* Informations */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-4">📋 Informations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <Info label="Numéro de dossier" value={dos.numeroDossier} />
              <Info label="Type de dossier" value={dos.libelleTypeDossier} />
              <Info label="Lieu" value={lieux || null} />
              <Info label="Date de la demande" value={formatDate(dos.dateDemande ?? null)} />
              <Info label="Date de validation" value={formatDate(dos.dateValidation ?? null)} />
              <Info label="Transmission" value={dos.transmission} />
              <Info label="Dossier fournie" value={dos.libelleDossierFournie} />
              <Info label="Montant total" value={dos.montantTotal != null ? `${dos.montantTotal} Ar` : null} />
              <Info label="Résultat de l'étude" value={dos.resultatEtude} />
              <Info label="Créé le" value={formatDate(dos.dateCreation ?? null)} />
            </div>
            {dos.observation && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-1">Observation</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{dos.observation}</p>
              </div>
            )}
          </div>

          {/* Parcelles demandées */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-4">🗺️ Parcelles demandées ({dos.parcelles?.length ?? 0})</h2>
            {(dos.parcelles?.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-400 italic">Aucune parcelle rattachée à ce dossier.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                      <th className="py-2 pr-4 font-medium">Propriété</th>
                      <th className="py-2 pr-4 font-medium">Parcelle</th>
                      <th className="py-2 pr-4 font-medium text-right">Superficie (m²)</th>
                      <th className="py-2 font-medium text-right">Montant TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dos.parcelles!.map((p) => (
                      <tr key={p.idDossierParcelle ?? `${p.idPropriete}-${p.idParcelle ?? ''}`}>
                        <td className="py-2 pr-4">
                          <p className="text-gray-800 font-medium">{p.nomPropriete || '—'}</p>
                          {p.numeroPropriete && <p className="text-[10px] text-gray-400">n° {p.numeroPropriete}</p>}
                        </td>
                        <td className="py-2 pr-4 text-gray-600">{p.numeroLot || '—'}</td>
                        <td className="py-2 pr-4 text-right text-gray-600">{p.superficieM2 ?? '—'}</td>
                        <td className="py-2 text-right font-medium text-gray-800">
                          {montantParcelleTtc(p) != null ? `${formatAr(montantParcelleTtc(p)!)} Ar` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {totalTtcCalcule != null && dos.parcelles && dos.parcelles.length > 0 && (
              <p className="text-sm text-right mt-3 pt-3 border-t border-gray-100">
                <span className="text-gray-500">Montant total (calculé) : </span>
                <strong className="text-blue-700">{formatAr(totalTtcCalcule)} Ar</strong>
              </p>
            )}
          </div>

          {/* Demandeurs */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-4">👤 Demandeurs ({dos.demandeurs?.length ?? 0})</h2>
            {(dos.demandeurs?.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-400 italic">Aucun demandeur rattaché.</p>
            ) : (
              <div className="space-y-3">
                {dos.demandeurs!.map((dm) => (
                  <div key={dm.idPersonne} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm shrink-0">
                        {dm.nom.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">
                          {dm.nom}
                          {dm.role && (
                            <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">
                              {dm.role}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          {[dm.contact, dm.email, dm.adresse].filter(Boolean).join(' · ') || 'Aucun contact'}
                          {dm.libelleTypePersonne ? ` · ${dm.libelleTypePersonne}` : ''}
                        </p>
                      </div>
                    </div>
                    {/* ── Documents / photos du demandeur ── */}
                    <DocumentsDemandeur idPersonne={dm.idPersonne} nom={dm.nom} compact />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Colonne droite : suivi / étapes ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Changement d'étape */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-4">🔄 Changement d'étape</h2>
            <form onSubmit={enregistrerEtape} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Étape réalisée</label>
                <select
                  required
                  value={etapeChoisie}
                  onChange={(e) => setEtapeChoisie(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">— Choisir —</option>
                  {etapes.map((et) => (
                    <option key={et.idEtape} value={et.idEtape}>
                      {et.ordre}. {et.libelle}
                      {suivi.some((s) => s.idEtape === et.idEtape && s.dateRealisation) ? ' ✓' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date de réalisation</label>
                <input
                  type="date"
                  value={dateRealisation}
                  onChange={(e) => setDateRealisation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Avancement (couleur)</label>
                <select
                  value={couleurChoisie}
                  onChange={(e) => setCouleurChoisie(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">— Aucun —</option>
                  {statutsCouleur.map((sc) => (
                    <option key={sc.idStatutCouleur} value={sc.idStatutCouleur}>{sc.libelle}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Commentaire</label>
                <textarea
                  rows={2}
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder="Note sur cette étape..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!etapeChoisie || savingEtape}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-lg font-medium text-sm transition-colors"
              >
                {savingEtape ? 'Enregistrement...' : '✓ Enregistrer l\'étape'}
              </button>
              {etapesRestantes.length === 0 && realisees.length > 0 && (
                <p className="text-xs text-green-600 text-center font-medium">
                  Toutes les étapes du workflow sont réalisées.
                </p>
              )}
            </form>
          </div>

          {/* Timeline du suivi */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-4">
              📈 Suivi du dossier ({realisees.length}/{etapes.length || '…'})
            </h2>
            {suivi.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Aucune étape enregistrée.</p>
            ) : (
              <div className="relative pl-4">
                <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-gray-200"></div>
                <div className="space-y-4">
                  {suivi.map((s) => (
                    <div key={s.idSuivi} className="relative">
                      <span
                        className="absolute -left-4 top-1 w-4 h-4 rounded-full border-2 border-white shadow"
                        style={{ background: s.dateRealisation ? (s.couleurStatutCouleurHex || '#22c55e') : '#d1d5db' }}
                      ></span>
                      <div className="group">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-800">
                            {s.ordreEtape}. {s.libelleEtape}
                          </p>
                          <button
                            onClick={() => setEtapeSuppression(s)}
                            title="Retirer du suivi"
                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 rounded px-1 text-xs transition-all"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">
                          {s.dateRealisation
                            ? `Réalisée le ${formatDate(s.dateRealisation)}`
                            : 'Non réalisée'}
                          {s.libelleStatutCouleur ? ` · ${s.libelleStatutCouleur}` : ''}
                        </p>
                        {s.commentaire && (
                          <p className="text-xs text-gray-600 mt-1 italic">« {s.commentaire} »</p>
                        )}
                        {s.nomUtilisateur && (
                          <p className="text-[10px] text-gray-400 mt-0.5">par {s.nomUtilisateur}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Historique des modifications (audit), en bas de la page ── */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">🕘 Historique des modifications</h2>
          {historique.length > 0 && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
              {historique.length} modification{historique.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {historique.length === 0 ? (
          <p className="p-8 text-center text-gray-400 text-sm italic">Aucune modification enregistrée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-8"></th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type / Ville</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date demande</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Quand</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {historique.map((entry, idx) => {
                  const anciennes = parseJsonSafe(entry.anciennesValeurs);
                  const nouvelles = parseJsonSafe(entry.nouvellesValeurs);
                  const resume = anciennes || nouvelles;
                  const isExpanded = expandedHistoriqueIdx === idx;
                  const isCreate = entry.action === 'CREATE';
                  const isDelete = entry.action === 'DELETE' || entry.action === 'SUPPRESSION';
                  const isUpdate = entry.action === 'UPDATE' || entry.action === 'MODIFICATION';

                  return (
                    <Fragment key={entry.idAudit}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setExpandedHistoriqueIdx(isExpanded ? null : idx)}
                            className="p-1 rounded hover:bg-gray-200 transition-colors"
                            title={isExpanded ? 'Masquer les détails' : 'Voir les détails'}
                          >
                            <span className={`w-2.5 h-2.5 rounded-full inline-block ${idx === 0 ? 'bg-blue-500' : 'bg-gray-300'}`} />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            isCreate ? 'bg-green-100 text-green-800'
                              : isUpdate ? 'bg-blue-100 text-blue-800'
                              : isDelete ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {isCreate ? 'Création' : isUpdate ? 'Modification' : isDelete ? 'Suppression' : entry.action || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {formatAuditValue(resume?.libelleStatut || resume?.statut)}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {[resume?.typeDossier || resume?.libelleTypeDossier, resume?.ville || resume?.nomVille]
                            .filter(Boolean).map(formatAuditValue).join(' · ') || '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {formatAuditValue(resume?.dateDemande)}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {formatAuditDate(entry.dateAction)}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">
                              {isCreate ? 'Données créées' : isDelete ? 'Données supprimées' : 'Détail de la modification'}
                              {' '}— {formatAuditDate(entry.dateAction)}
                            </p>
                            {(anciennes || nouvelles) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {anciennes && <AuditValues title="Avant" values={anciennes} />}
                                {nouvelles && <AuditValues title="Après" values={nouvelles} after={anciennes} />}
                              </div>
                            )}
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

      {/* ── Modal suppression étape ── */}
      {etapeSuppression && (
        <ModalOverlay onClose={() => setEtapeSuppression(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
            <div className="px-6 py-4 border-b border-red-200 bg-red-50">
              <h2 className="text-lg font-bold text-red-800">✕ Retirer l'étape du suivi</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700">
                Retirer <strong>{etapeSuppression.libelleEtape}</strong> du suivi du dossier{' '}
                <strong>{dos.numeroDossier}</strong> ?
              </p>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setEtapeSuppression(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => supprimerEtape(etapeSuppression)}
                  className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Retirer
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Historique des modifications — une entrée d'audit lisible
// ══════════════════════════════════════════════════════════════
const LIBELLES_CHAMPS: Record<string, string> = {
  numeroDossier: 'Numéro de dossier',
  dateDemande: 'Date de la demande',
  transmission: 'Transmission',
  resultatEtude: 'Résultat de l\'étude',
  observation: 'Observation',
  dateValidation: 'Date de validation',
  montantTotal: 'Montant total',
  statut: 'Statut',
  typeDossier: 'Type de dossier',
  dossierFournie: 'Dossier fournie',
  ville: 'Ville',
  etape: 'Étape',
  dateRealisation: 'Date de réalisation',
  statutCouleur: 'Statut de l\'étape',
  commentaire: 'Commentaire',
};

function parseJsonSafe(s?: string | null): Record<string, unknown> | null {
  if (!s) return null;
  try {
    const v = JSON.parse(s);
    return typeof v === 'object' && v !== null ? v : null;
  } catch {
    return null;
  }
}

function formatAuditDate(date?: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR');
    }
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return formatAuditDate(value);
    return value;
  }
  if (typeof value === 'number') return value.toLocaleString('fr-FR');
  return String(value);
}

function AuditValues({
  title,
  values,
  after,
}: {
  title: string;
  values: Record<string, unknown>;
  after?: Record<string, unknown> | null;
}) {
  return (
    <div>
      <p className={`text-xs font-medium uppercase tracking-wide mb-2 ${title === 'Après' ? 'text-blue-500' : 'text-gray-500'}`}>
        {title}
      </p>
      <div className={`space-y-2 bg-white border rounded-lg p-4 ${title === 'Après' ? 'border-blue-200' : 'border-gray-200'}`}>
        {Object.keys(values).map((key) => (
          <div key={key}>
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
              {LIBELLES_CHAMPS[key] ?? key}
            </p>
            <p className={`text-sm break-words whitespace-pre-wrap ${
              after && JSON.stringify(after[key]) !== JSON.stringify(values[key])
                ? 'text-blue-700 font-medium'
                : 'text-gray-800'
            }`}>
              {formatAuditValue(values[key])}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Composants réutilisables
// ══════════════════════════════════════════════════════════════
function Info({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-sm text-gray-800">{value || '—'}</p>
    </div>
  );
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="relative z-50 w-full" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
