import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { descenteTerrainService } from '../../services';
import type {
  DescenteTerrainDTO,
  DescenteTerrainRequest,
  DossierDescenteResult,
} from '../../types';

const STATUTS_CONSTAT = ['Faisable', 'Non faisable', 'Sous réserve'];

const STATUTS_VALIDATION = ['Bon pour la suite', 'En instance'];

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none';

/**
 * Formulaire de création / modification d'une descente terrain.
 * Rattachement au dossier via recherche (`/dossiers/search`) : la ligne
 * dossier_parcelle et le demandeur principal sont embarqués dans la requête.
 */
export default function DescenteTerrainForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const estModification = Boolean(id);

  const [dateDescente, setDateDescente] = useState(() => new Date().toISOString().slice(0, 10));
  const [statutConstat, setStatutConstat] = useState('Faisable');
  const [mode, setMode] = useState('online');
  const [validation, setValidation] = useState('En instance');
  const [observation, setObservation] = useState('');

  // Rattachement au dossier
  const [requeteDossier, setRequeteDossier] = useState('');
  const [resultats, setResultats] = useState<DossierDescenteResult[]>([]);
  const [rechercheEnCours, setRechercheEnCours] = useState(false);
  const [dossierChoisi, setDossierChoisi] = useState<DossierDescenteResult | null>(null);
  const [dropdownOuvert, setDropdownOuvert] = useState(false);
  const boiteRecherche = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(estModification);
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState('');

  // ── Édition : pré-remplissage ──
  useEffect(() => {
    if (!id) return;
    let actif = true;
    (async () => {
      try {
        const d: DescenteTerrainDTO = await descenteTerrainService.trouverParId(id);
        if (!actif) return;
        setDateDescente(d.dateDescente || '');
        setStatutConstat(d.statutConstat || 'Faisable');
        setMode(d.mode || 'online');
        setValidation(d.validation || 'En instance');
        setObservation(d.observation || '');
        if (d.idDossierParcelle) {
          setDossierChoisi({
            idDossierParcelle: d.idDossierParcelle,
            numeroDossier: d.numeroDossier,
            superficie: d.superficieM2,
            parcelle: d.numeroLot,
            ville: d.nomVille,
            propriete: d.numeroPropriete,
            demandeurId: d.idPersonne,
            demandeurNom: d.nomPersonne,
            demandeurContact: d.contactPersonne,
          });
          setRequeteDossier(d.numeroDossier || d.numeroLot || d.numeroPropriete || '');
        }
      } catch {
        if (actif) setErreur('Descente introuvable.');
      } finally {
        if (actif) setLoading(false);
      }
    })();
    return () => { actif = false; };
  }, [id]);

  // ── Recherche de dossier (debounce 300 ms) ──
  useEffect(() => {
    if (!requeteDossier.trim() || dossierChoisi) {
      setResultats([]);
      return;
    }
    const t = setTimeout(async () => {
      setRechercheEnCours(true);
      try {
        const r = await descenteTerrainService.rechercherDossiers(requeteDossier.trim());
        setResultats(r);
        setDropdownOuvert(true);
      } catch {
        setResultats([]);
      } finally {
        setRechercheEnCours(false);
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requeteDossier]);

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boiteRecherche.current && !boiteRecherche.current.contains(e.target as Node)) {
        setDropdownOuvert(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const choisirDossier = useCallback((d: DossierDescenteResult) => {
    setDossierChoisi(d);
    setDropdownOuvert(false);
    setRequeteDossier(d.numeroDossier || '');
  }, []);

  // ── Soumission ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur('');

    if (!dateDescente) { setErreur('La date de la descente est obligatoire.'); return; }
    if (!statutConstat) { setErreur('Le statut du constat est obligatoire.'); return; }

    const payload: DescenteTerrainRequest = {
      dateDescente,
      statutConstat,
      observation: observation.trim() || undefined,
      mode,
      validation,
      idDossierParcelle: dossierChoisi?.idDossierParcelle,
      idPersonne: dossierChoisi?.demandeurId,
    };

    setSaving(true);
    try {
      const enregistree = estModification
        ? await descenteTerrainService.modifier(id!, payload)
        : await descenteTerrainService.creer(payload);
      navigate(`/descentes-terrain/${enregistree.idDescente}`, {
        state: { toast: { msg: estModification ? 'Descente mise à jour' : 'Descente créée', ok: true } },
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message ||
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.error ||
        "Échec de l'enregistrement de la descente";
      setErreur(msg);
      setSaving(false);
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

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            🥾 {estModification ? 'Modifier la descente' : 'Nouvelle descente terrain'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Constat relevé par les agents sur le terrain — date, constat, dossier rattaché et observation.
          </p>
        </div>
        <Link
          to="/descentes-terrain"
          className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 rounded-lg font-medium text-sm transition-colors"
        >
          ← Retour à la liste
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl">
        {erreur && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {erreur}
          </div>
        )}

        {/* 1 · Dossier rattaché */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">1 · Dossier rattaché</h2>

          {!dossierChoisi ? (
            <div ref={boiteRecherche} className="relative">
              <input
                type="text"
                value={requeteDossier}
                onChange={(e) => setRequeteDossier(e.target.value)}
                onFocus={() => resultats.length > 0 && setDropdownOuvert(true)}
                placeholder="🔍 Numéro de dossier, de propriété, de lot, ville ou nom du demandeur..."
                className={inputCls}
              />
              {rechercheEnCours && (
                <p className="text-xs text-gray-400 mt-1">Recherche en cours...</p>
              )}
              {dropdownOuvert && resultats.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                  {resultats.map((r) => (
                    <button
                      key={r.idDossierParcelle}
                      type="button"
                      onClick={() => choisirDossier(r)}
                      className="w-full text-left px-4 py-2.5 hover:bg-amber-50 border-b border-gray-100 last:border-0 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-800">
                        {r.numeroDossier || 'Dossier sans numéro'}
                        {r.propriete && <span className="text-gray-400 font-normal"> · {r.propriete}</span>}
                      </p>
                      <p className="text-xs text-gray-500">
                        {[r.parcelle && `Lot ${r.parcelle}`, r.ville, r.demandeurNom && `Demandeur : ${r.demandeurNom}`, r.superficie && `${r.superficie} m²`]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Optionnel : la descente peut être créée sans dossier rattaché.
              </p>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="text-sm">
                <p className="font-medium text-gray-800">
                  📁 {dossierChoisi.numeroDossier || 'Dossier'}
                  {dossierChoisi.propriete && <span className="text-gray-500 font-normal"> · Prop. {dossierChoisi.propriete}</span>}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {[
                    dossierChoisi.parcelle && `Lot ${dossierChoisi.parcelle}`,
                    dossierChoisi.ville,
                    dossierChoisi.demandeurNom && `Demandeur : ${dossierChoisi.demandeurNom}`,
                    dossierChoisi.demandeurContact,
                    dossierChoisi.superficie && `${dossierChoisi.superficie} m²`,
                  ].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setDossierChoisi(null); setRequeteDossier(''); }}
                className="text-xs text-red-600 hover:text-red-700 font-medium shrink-0"
              >
                ✕ Retirer
              </button>
            </div>
          )}
        </div>

        {/* 2 · Détails de la descente */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">2 · Détails de la descente</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Date de la descente *
              </label>
              <input
                type="date"
                value={dateDescente}
                onChange={(e) => setDateDescente(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Statut du constat *
              </label>
              <select
                value={statutConstat}
                onChange={(e) => setStatutConstat(e.target.value)}
                className={inputCls}
                required
              >
                {STATUTS_CONSTAT.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Mode</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)} className={inputCls}>
                <option value="online">🌐 En ligne</option>
                <option value="offline">📴 Hors ligne</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Validation</label>
              <select value={validation} onChange={(e) => setValidation(e.target.value)} className={inputCls}>
                {STATUTS_VALIDATION.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Observation / constat détaillé
              </label>
              <textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                rows={4}
                placeholder="Décrire ce qui a été relevé sur le terrain..."
                className={inputCls + ' resize-y'}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/descentes-terrain')}
            className="px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 text-sm bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg font-medium transition-colors"
          >
            {saving ? 'Enregistrement...' : estModification ? '💾 Enregistrer' : '➕ Créer la descente'}
          </button>
        </div>
      </form>
    </div>
  );
}
