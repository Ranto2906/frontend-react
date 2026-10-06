import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { signalementService, photoService, proprieteService } from '../../services';
import MiniMap from '../../components/MiniMap';
import type { Signalement, StatutSignalement, SignalementAudit, PhotoDTO, Parcelle, Propriete } from '../../types';
import type { GeometrieDTO } from '../../services/signalementService';
import { extraireProprieteManuelle } from '../../utils/proprieteManuelle';

// Couleurs de repli si le backend ne fournit pas couleurStatutHex
const COULEURS_STATUT: Record<string, string> = {
  nouveau: '#1a56db', 'en attente': '#b7791f', 'en cours': '#1a56db',
  traite: '#059669', 'traité': '#059669', rejete: '#dc2626', 'rejeté': '#dc2626',
  transforme: '#7c3aed', 'transformé': '#7c3aed',
};

function couleurStatut(sig: Signalement | null): string {
  if (sig?.couleurStatutHex) return sig.couleurStatutHex;
  return COULEURS_STATUT[(sig?.libelleStatut || '').toLowerCase()] || '#6b7280';
}

function formatDate(d?: string): string {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
}

function formatDateTime(d?: string): string {
  return d
    ? new Date(d).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '—';
}

const ACTION_LIBELLES: Record<string, string> = {
  CREATE: 'Création',
  READ: 'Consultation',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
  VALIDATE: 'Validation',
};

export default function DetailSignalement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [sig, setSig] = useState<Signalement | null>(null);
  const [statuts, setStatuts] = useState<StatutSignalement[]>([]);
  const [historique, setHistorique] = useState<SignalementAudit[]>([]);
  const [photos, setPhotos] = useState<PhotoDTO[]>([]);
  const [geometrie, setGeometrie] = useState<GeometrieDTO | null>(null);
  const [parcelle, setParcelle] = useState<Parcelle | null>(null);
  /** Propriété rattachée (le DTO ne porte que l'id et le n°) — enrichit l'affichage. */
  const [propriete, setPropriete] = useState<Propriete | null>(null);
  const [loading, setLoading] = useState(true);
  const [onglet, setOnglet] = useState<'infos' | 'validation' | 'historique'>('infos');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  // Validation (traitement)
  const [nouveauStatut, setNouveauStatut] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [validating, setValidating] = useState(false);
  const [expandedAudit, setExpandedAudit] = useState<number | null | undefined>(null);

  // Propriété saisie manuellement sur le mobile (hors-ligne) — tracée en
  // préfixe de la description (aucun champ serveur dédié). Affichée dans un
  // encart dédié, jamais mélangée à l'observation.
  const { proprieteManuelle, description: descriptionNettoyee } = sig
    ? extraireProprieteManuelle(sig.description)
    : { proprieteManuelle: '', description: '' };

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const charger = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [s, h, ph, geo] = await Promise.all([
        signalementService.trouverParId(id),
        signalementService.historique(id).catch(() => [] as SignalementAudit[]),
        signalementService.photos(id).catch(() => [] as PhotoDTO[]),
        signalementService.geometrie(id).catch(() => [] as GeometrieDTO[]),
      ]);
      setSig(s);
      setHistorique(h);
      setPhotos(ph);
      setGeometrie(geo.length > 0 ? geo[0] : null);
      // Parcelle enrichie (superficie, nom propriété, ville) si rattachée.
      if (s.idParcelle) {
        signalementService.parcelle(s.idParcelle).then(setParcelle).catch(() => setParcelle(null));
      } else {
        setParcelle(null);
      }
      // Propriété complète (nom, n°, zone, ville) — le DTO ne porte que id + n°.
      if (s.idPropriete) {
        proprieteService.trouverParId(s.idPropriete).then(setPropriete).catch(() => setPropriete(null));
      } else {
        setPropriete(null);
      }
    } catch {
      showToast('Signalement introuvable', false);
      setTimeout(() => navigate('/signalements'), 1500);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { charger(); }, [charger]);

  // Toast transmis depuis la page liste (retour après modification)
  useEffect(() => {
    const st = location.state as { toast?: { msg: string; ok?: boolean } } | null;
    if (st?.toast) showToast(st.toast.msg, st.toast.ok ?? true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const chargerStatuts = useCallback(async () => {
    try {
      const s = await signalementService.listerStatuts();
      setStatuts([...s].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)));
    } catch {
      // référentiels indisponibles : la validation restera bloquée
    }
  }, []);

  // Charge les statuts à l'ouverture de l'onglet validation
  useEffect(() => {
    if (onglet === 'validation' && statuts.length === 0) chargerStatuts();
  }, [onglet, statuts.length, chargerStatuts]);

  // ── Validation : changement de statut tracé (POST /traitement) ──
  const handleValider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !nouveauStatut) {
      showToast('Choisissez un statut', false);
      return;
    }
    setValidating(true);
    try {
      const maj = await signalementService.traiter(id, {
        idStatutSignalement: Number(nouveauStatut),
        commentaireTraitement: commentaire.trim() || undefined,
      });
      setSig(maj);
      setNouveauStatut('');
      setCommentaire('');
      showToast(`Statut mis à jour : ${maj.libelleStatut || '—'}`);
      setOnglet('historique'); // le changement apparaît dans l'historique
      charger();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erreur lors du changement de statut', false);
    } finally {
      setValidating(false);
    }
  };

  // ── Suppression ──
  const handleDelete = async () => {
    if (!id) return;
    try {
      await signalementService.supprimer(id);
      navigate('/signalements', {
        state: { toast: { msg: 'Signalement supprimé', ok: true } },
      });
    } catch {
      showToast('Erreur lors de la suppression', false);
      setShowDelete(false);
    }
  };

  const badgeStatut = useMemo(() => (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
      style={{ background: couleurStatut(sig) }}
    >
      {sig?.libelleStatut || 'Nouveau'}
    </span>
  ), [sig]);

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

  if (!sig) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          Signalement introuvable.
        </div>
      </div>
    );
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none';

  return (
    <div className="flex-1 min-h-0 w-full overflow-y-auto p-4 md:p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm transition-all ${
          toast.ok ? 'bg-green-600' : 'bg-red-600'
        }`}>{toast.msg}</div>
      )}

      {/* En-tête */}
      <div className="mb-6">
        <Link to="/signalements" className="text-gray-400 hover:text-gray-600 text-sm transition-colors">← Retour</Link>
        <div className="flex items-start justify-between mt-1 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-800">
                {sig.reference || sig.idSignalement.slice(0, 8)}
              </h1>
              {badgeStatut}
              {sig.libelleType && (
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
                  style={{ background: sig.couleurType || '#1a56db' }}
                >
                  {sig.libelleType}
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm mt-1">
              Créé le {formatDate(sig.dateSignalement)}{sig.nomUtilisateurCreation ? ` par ${sig.nomUtilisateurCreation}` : ''}
              {sig.dateModification ? ` · modifié le ${formatDateTime(sig.dateModification)}` : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to={`/signalements/${sig.idSignalement}/modifier`}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
            >
              ✏️ Modifier
            </Link>
            <button
              onClick={() => setShowDelete(true)}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-medium text-sm transition-colors"
            >
              🗑️ Supprimer
            </button>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {([
          ['infos', '📋 Informations'],
          ['validation', '✅ Validation'],
          ['historique', `📜 Historique (${historique.length})`],
        ] as const).map(([cle, libelle]) => (
          <button
            key={cle}
            onClick={() => setOnglet(cle)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              onglet === cle
                ? 'bg-white text-blue-700 border border-b-0 border-gray-200 -mb-px'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {libelle}
          </button>
        ))}
      </div>

      {/* ── Onglet Informations — fiche complète (équivalent mobile) ── */}
      {onglet === 'infos' && (
        <div className="space-y-4">
          {/* Propriété & ville — fiche complète du rattachement foncier */}
          {(propriete || sig.nomVille || proprieteManuelle) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">🏠 Propriété & ville</h2>
              {propriete ? (
                <div>
                  <p className="text-base font-semibold text-gray-800">
                    {propriete.nom || 'Propriété sans nom'}
                    {propriete.numero ? ` · n° ${propriete.numero}` : ''}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                    <Info label="Ville" value={[propriete.nomVille, sig.nomVille, parcelle?.nomVille].find(Boolean) || '—'} />
                    <Info label="Lieu" value={propriete.libelleLieu || '—'} />
                    {/* <Info label="Zone" value={propriete.zone || '—'} /> */}
                    <Info
                      label="Superficie totale"
                      value={propriete.superficieTotale != null ? `${Number(propriete.superficieTotale).toLocaleString('fr-FR')} m²` : '—'}
                    />
                  </div>
                  {propriete.localisation && (
                    <p className="text-sm text-gray-700 mt-3">
                      <span className="text-xs text-gray-400 uppercase">Localisation — </span>
                      {propriete.localisation}
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <Info label="Ville" value={[sig.nomVille, parcelle?.nomVille].find(Boolean) || '—'} />
                  {(sig.numeroPropriete || sig.idPropriete) && (
                    <Info label="Propriété" value={sig.numeroPropriete || `#${sig.idPropriete}`} />
                  )}
                </div>
              )}
              {proprieteManuelle && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    🏷️ Propriété saisie manuellement (mobile)
                  </p>
                  <p className="mt-1 text-sm font-medium text-amber-900 break-words">{proprieteManuelle}</p>
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Localisation & rattachements</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <Info label="Ville" value={sig.nomVille || parcelle?.nomVille ? `🏙️ ${sig.nomVille || parcelle?.nomVille}` : '—'} />
              <Info
                label="Propriété"
                value={
                  propriete
                    ? [propriete.numero ? `n° ${propriete.numero}` : null, propriete.nom].filter(Boolean).join(' · ') || '—'
                    : sig.numeroPropriete
                      ? `n° ${sig.numeroPropriete}`
                      : proprieteManuelle || '—'
                }
              />
              <Info label="Lot" value={sig.numeroLot ? `n° ${sig.numeroLot}` : '—'} />
              {/* <Info label="Dossier" value={sig.numeroDossier || '—'} /> */}
            </div>
          </div>

          {/* Position GPS du constat — carte + coordonnées (comme le mobile) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">📍 Position sur le terrain</h2>
            {geometrie?.geojson ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MiniMap geojson={geometrie.geojson} height={260} />
                <div className="space-y-3 text-sm">
                  <Coordonnees geojson={geometrie.geojson} />
                  <div className="grid grid-cols-2 gap-3">
                    {/* <Info label="Précision GPS" value={geometrie.precisionM != null ? `±${Math.round(Number(geometrie.precisionM))} m` : '—'} /> */}
                    {/* <Info label="Source" value={geometrie.source || '—'} /> */}
                    {/* <Info label="Type" value={geometrie.typeGeometrie || '—'} /> */}
                    {/* <Info
                      label="Superficie calculée"
                      value={geometrie.superficieCalculeeM2 != null ? `${Number(geometrie.superficieCalculeeM2).toLocaleString('fr-FR')} m²` : '—'}
                    /> */}
                  </div>
                  {/* <Info label="Relevé le" value={formatDateTime(geometrie.dateCreation)} /> */}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Aucun relevé GPS associé à ce signalement.</p>
            )}
          </div>

          {/* Parcelle / titre foncier — détail enrichi (comme le mobile) */}
          {(sig.idParcelle || sig.numeroLot || sig.numeroPropriete) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">🗺️ Parcelle & titre foncier</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <Info label="N° propriété" value={parcelle?.numeroPropriete || sig.numeroPropriete || propriete?.numero || '—'} />
                <Info label="Nom propriété" value={parcelle?.nomPropriete || propriete?.nom || '—'} />
                <Info label="Lot" value={parcelle?.numeroLot || sig.numeroLot || '—'} />
                <Info
                  label="Superficie lot"
                  value={parcelle?.superficieM2 != null ? `${Number(parcelle.superficieM2).toLocaleString('fr-FR')} m²` : '—'}
                />
                {/* <Info label="Zone" value={parcelle?.zonePropriete || '—'} /> */}
                <Info label="Localisation" value={parcelle?.localisationPropriete || '—'} />
                <Info label="Ville (propriété)" value={parcelle?.nomVille || '—'} />
              </div>
              {parcelle?.observation && (
                <p className="text-sm text-gray-600 mt-3 border-t border-gray-100 pt-3">
                  <span className="text-xs text-gray-400 uppercase">Observation parcelle — </span>
                  {parcelle.observation}
                </p>
              )}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Description / observation</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {descriptionNettoyee || <span className="text-gray-400 italic">Aucune description</span>}
            </p>
          </div>

          {/* Photos du constat — galerie (comme le mobile) */}
          <PhotosConstat photos={photos} />

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Traitement</h2>
            {sig.dateTraitement ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <Info label="Statut actuel" value={sig.libelleStatut || '—'} />
                <Info label="Traité le" value={formatDateTime(sig.dateTraitement)} />
                <Info label="Traité par" value={sig.nomUtilisateurTraitement || '—'} />
                <div className="col-span-2 md:col-span-3">
                  <Info label="Commentaire" value={sig.commentaireTraitement || '—'} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">
                Pas encore traité — passez par l'onglet « Validation » pour changer le statut.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Onglet Validation ── */}
      {onglet === 'validation' && (
        <div className="space-y-4">
          <form onSubmit={handleValider} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              ✅ Valider / traiter ce signalement
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nouveau statut *</label>
                <select
                  value={nouveauStatut}
                  onChange={(e) => setNouveauStatut(e.target.value)}
                  className={inputCls}
                  required
                >
                  <option value="" disabled>— Choisir un statut —</option>
                  {statuts.map((s) => (
                    <option key={s.idStatutSignalement} value={s.idStatutSignalement}>
                      {s.libelle}{s.estFinal ? ' (final)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Commentaire de traitement
                </label>
                <input
                  type="text"
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder="Ex. : constat vérifié sur place, dossier transmis..."
                  className={inputCls}
                />
              </div>
            </div>
            {nouveauStatut && statuts.find((s) => String(s.idStatutSignalement) === nouveauStatut)?.estFinal && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-3">
                ⚠️ Ce statut est <strong>final</strong> : le signalement sera considéré comme clos.
              </p>
            )}
            <div className="flex justify-end mt-4">
              <button
                type="submit"
                disabled={validating || !nouveauStatut}
                className="px-5 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors"
              >
                {validating ? 'Enregistrement...' : 'Valider le changement de statut'}
              </button>
            </div>
          </form>

          {sig.dateTraitement && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Dernier traitement</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <Info label="Statut" value={sig.libelleStatut || '—'} />
                <Info label="Date" value={formatDateTime(sig.dateTraitement)} />
                <Info label="Agent" value={sig.nomUtilisateurTraitement || '—'} />
                <div className="col-span-2 md:col-span-3">
                  <Info label="Commentaire" value={sig.commentaireTraitement || '—'} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Onglet Historique ── */}
      {onglet === 'historique' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {historique.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p className="text-lg">Aucune modification enregistrée</p>
              <p className="text-sm mt-1">
                Chaque création, modification ou changement de statut sera tracé ici.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="w-8 px-4 py-3"></th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Utilisateur</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {historique.map((h) => (
                  <AuditRow
                    key={h.idAudit}
                    audit={h}
                    expanded={expandedAudit === h.idAudit}
                    onToggle={() => setExpandedAudit(expandedAudit === h.idAudit ? null : h.idAudit)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Modal suppression ── */}
      {showDelete && (
        <ModalOverlay onClose={() => setShowDelete(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
            <div className="px-6 py-4 border-b border-red-200 bg-red-50">
              <h2 className="text-lg font-bold text-red-800">🗑️ Supprimer le signalement</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700">
                Supprimer définitivement <strong>{sig.reference || sig.idSignalement.slice(0, 8)}</strong>
                {sig.nomVille ? ` (${sig.nomVille})` : ''} ?
              </p>
              <p className="text-xs text-red-600 mt-2">Cette action est irréversible.</p>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowDelete(false)}
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
        </ModalOverlay>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Ligne d'audit avec détail expandable (anciennes/nouvelles valeurs)
// ══════════════════════════════════════════════════════════════
function AuditRow({
  audit,
  expanded,
  onToggle,
}: {
  audit: SignalementAudit;
  expanded: boolean;
  onToggle: () => void;
}) {
  const couleurAction =
    audit.action === 'CREATE' ? 'bg-green-100 text-green-800'
    : audit.action === 'DELETE' ? 'bg-red-100 text-red-800'
    : 'bg-yellow-100 text-yellow-800';

  return (
    <>
      <tr
        className="hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={onToggle}
      >
        <td className="px-4 py-3 text-gray-400 text-xs">{expanded ? '▼' : '▶'}</td>
        <td className="px-4 py-3 text-gray-700 text-xs">
          {formatDateTime(audit.dateAction)}
        </td>
        <td className="px-4 py-3 text-center">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${couleurAction}`}>
            {ACTION_LIBELLES[audit.action || ''] || audit.action || '—'}
          </span>
        </td>
        <td className="px-4 py-3 text-gray-700">{audit.nomUtilisateur || '—'}</td>
        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{audit.ipAdresse || '—'}</td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={5} className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">🔴 Valeurs précédentes</p>
                {audit.anciennesValeurs ? (
                  <pre className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 overflow-x-auto max-h-48">
                    {formatJson(audit.anciennesValeurs)}
                  </pre>
                ) : (
                  <p className="text-xs text-gray-400 italic">Aucune valeur précédente</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">🟢 Nouvelles valeurs</p>
                {audit.nouvellesValeurs ? (
                  <pre className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800 overflow-x-auto max-h-48">
                    {formatJson(audit.nouvellesValeurs)}
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
  );
}

// ══════════════════════════════════════════════════════════════
// Composants réutilisables
// ══════════════════════════════════════════════════════════════
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-gray-700 mt-0.5">{value}</p>
    </div>
  );
}

function formatJson(str: string): string {
  try {
    const obj = typeof str === 'string' ? JSON.parse(str) : str;
    return JSON.stringify(obj, null, 2);
  } catch {
    return str;
  }
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

/** Latitude / longitude extraites d'un GeoJSON Point (ordre GeoJSON : [lng, lat]). */
function Coordonnees({ geojson }: { geojson: string }) {
  const coords = useMemo(() => {
    try {
      const parsed = JSON.parse(geojson) as { type?: string; coordinates?: number[] };
      if (parsed.type === 'Point' && Array.isArray(parsed.coordinates)) {
        const [lng, lat] = parsed.coordinates;
        return { lat, lng };
      }
    } catch { /* GeoJSON invalide */ }
    return null;
  }, [geojson]);

  if (!coords) return null;
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-gray-50 rounded-lg p-2.5">
        <p className="text-xs text-gray-400 uppercase tracking-wide">Latitude</p>
        <p className="font-mono text-sm text-gray-800">{coords.lat.toFixed(6)}</p>
      </div>
      <div className="bg-gray-50 rounded-lg p-2.5">
        <p className="text-xs text-gray-400 uppercase tracking-wide">Longitude</p>
        <p className="font-mono text-sm text-gray-800">{coords.lng.toFixed(6)}</p>
      </div>
    </div>
  );
}

/** Galerie photos du constat (contenu binaire via JWT — même pattern que PhotosSection). */
function PhotosConstat({ photos }: { photos: PhotoDTO[] }) {
  if (photos.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">🖼️ Photos du constat</h2>
        <p className="text-sm text-gray-400 italic">Aucune photo associée à ce signalement.</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm font-semibold text-gray-700">🖼️ Photos du constat</h2>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
          {photos.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-4">
        {photos.map((p) => (
          <figure key={p.idPhoto} className="w-40">
            <PhotoMiniature idPhoto={p.idPhoto} typePhoto={p.typePhoto} />
            {p.observation && (
              <figcaption className="mt-1 text-[11px] leading-snug text-gray-500 break-words line-clamp-2" title={p.observation}>
                {p.observation}
              </figcaption>
            )}
            {p.datePrise && (
              <p className="text-[10px] text-gray-400 mt-0.5">Prise le {formatDate(p.datePrise)}</p>
            )}
          </figure>
        ))}
      </div>
    </div>
  );
}

function PhotoMiniature({ idPhoto, typePhoto }: { idPhoto: string; typePhoto?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [echec, setEchec] = useState(false);

  useEffect(() => {
    let annule = false;
    let objUrl: string | null = null;
    photoService
      .contenu(idPhoto)
      .then((blob) => {
        if (annule) return;
        objUrl = URL.createObjectURL(blob);
        setUrl(objUrl);
      })
      .catch(() => {
        if (!annule) setEchec(true);
      });
    return () => {
      annule = true;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [idPhoto]);

  if (echec) {
    return (
      <div className="w-40 h-32 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 text-xs">
        Photo illisible
      </div>
    );
  }
  if (!url) {
    return <div className="w-40 h-32 rounded-lg border border-gray-200 bg-gray-50 animate-pulse" />;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group relative block rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
      title="Ouvrir en grand"
    >
      <img
        src={url}
        alt={`Photo ${typePhoto || 'constat'}`}
        className="w-40 h-32 object-cover group-hover:scale-105 transition-transform"
      />
    </a>
  );
}
