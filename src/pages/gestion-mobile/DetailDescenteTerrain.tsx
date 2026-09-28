import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { descenteTerrainService } from '../../services';
import type { DescenteTerrainDTO, DescenteTerrainRequest } from '../../types';

const COULEURS_CONSTAT: Record<string, string> = {
  conforme: '#059669',
  'non conforme': '#dc2626',
  'en attente': '#b7791f',
  'occupation illicite': '#7c3aed',
  'construction illegale': '#e11d48',
};

const COULEURS_VALIDATION: Record<string, string> = {
  'en attente': '#b7791f',
  valide: '#059669',
  rejete: '#dc2626',
  'complement demande': '#1a56db',
};

const STATUTS_VALIDATION = ['En attente', 'Valide', 'Rejete', 'Complement demande'];

function couleur(couleurs: Record<string, string>, valeur?: string): string {
  return couleurs[(valeur || '').toLowerCase()] || '#6b7280';
}

function formatDate(d?: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(d?: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
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

  // Validation
  const [validationChoisie, setValidationChoisie] = useState('');
  const [savingValidation, setSavingValidation] = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const d = await descenteTerrainService.trouverParId(id);
      setDt(d);
      setValidationChoisie(d.validation || 'En attente');
      setErreur('');
    } catch {
      setErreur('Descente introuvable.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Toast transmis par la liste / le formulaire
  useEffect(() => {
    const st = location.state as { toast?: { msg: string; ok: boolean } } | null;
    if (st?.toast) showToast(st.toast.msg, st.toast.ok ?? true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

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
    } catch {
      showToast('Erreur lors de la suppression', false);
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

  const validationModifiee = validationChoisie !== (dt.validation || 'En attente');

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

          {/* Dossier rattaché */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">📁 Dossier rattaché</h2>
            {dt.numeroDossier || dt.numeroLot || dt.numeroPropriete ? (
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs text-gray-500">Dossier</dt>
                  <dd className="font-medium text-gray-800">{dt.numeroDossier || '—'}</dd>
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
                  <dd className="font-medium text-gray-800">{dt.nomVille || '—'}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-gray-400">Aucun dossier rattaché à cette descente.</p>
            )}
          </div>

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
                Cette action est irréversible. La géométrie GPS associée sera également supprimée.
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
