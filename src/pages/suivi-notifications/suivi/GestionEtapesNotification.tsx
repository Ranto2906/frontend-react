import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { suiviNotificationService } from '../../../services';
import type { EtapeNotification } from '../../../types';

// ════════════════════════════════════════════════════════════
// Config Étapes — configuration du workflow du suivi des
// notifications : création, modification et suppression des
// étapes du référentiel (même modèle que les étapes de dossier).
// L'étape marquée « finale » clôture automatiquement la
// notification lorsqu'elle est enregistrée dans un suivi.
// ════════════════════════════════════════════════════════════

function msgErreur(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message || fallback;
}

export default function GestionEtapesNotification() {
  const navigate = useNavigate();

  const [etapes, setEtapes] = useState<EtapeNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [formOuvert, setFormOuvert] = useState(false);
  const [edition, setEdition] = useState<EtapeNotification | null>(null);
  const [suppression, setSuppression] = useState<EtapeNotification | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      setEtapes(await suiviNotificationService.listerEtapes());
    } catch {
      showToast('Erreur lors du chargement des étapes', false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const ouvrirCreation = () => { setEdition(null); setFormOuvert(true); };
  const ouvrirEdition = (e: EtapeNotification) => { setEdition(e); setFormOuvert(true); };

  const enregistrer = async (req: { codeEtape: string; libelle: string; ordre: number; estFinal?: boolean }) => {
    try {
      if (edition) {
        await suiviNotificationService.modifierEtape(edition.idEtapeNotification, req);
        showToast('Étape modifiée');
      } else {
        await suiviNotificationService.creerEtape(req);
        showToast('Étape ajoutée au workflow');
      }
      setFormOuvert(false);
      setEdition(null);
      await charger();
    } catch (err) {
      throw new Error(msgErreur(err, "Erreur lors de l'enregistrement de l'étape"));
    }
  };

  const supprimer = async (e: EtapeNotification) => {
    try {
      await suiviNotificationService.supprimerEtapeReferentiel(e.idEtapeNotification);
      showToast('Étape supprimée');
      setSuppression(null);
      await charger();
    } catch (err) {
      showToast(msgErreur(err, 'Erreur lors de la suppression'), false);
      setSuppression(null);
    }
  };

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => navigate('/suivi-notifications')}
              className="text-gray-400 hover:text-gray-600 text-sm transition-colors"
            >
              ← Retour
            </button>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">⚙️ Config Étapes</h1>
          <p className="text-gray-500 text-sm mt-1">
            Workflow des notifications — {etapes.length} étape{etapes.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={ouvrirCreation}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
        >
          ➕ Nouvelle étape
        </button>
      </div>

      <p className="mb-4 text-xs text-gray-500">
        ℹ️ L'étape marquée <strong>« Étape finale »</strong> fait passer automatiquement la notification
        en « Clôturée » lorsqu'elle est enregistrée dans son suivi.
      </p>

      {/* Tableau des étapes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-3"></div>
            Chargement...
          </div>
        ) : etapes.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-lg">Aucune étape définie</p>
            <p className="text-sm mt-1">
              Créez les étapes du workflow (ex. : Notification d'occupation, Convocation, Constat sur site…).
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-20">Ordre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Libellé</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Étape finale</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {etapes.map((e) => (
                <tr key={e.idEtapeNotification} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-xs">
                      {e.ordre}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{e.libelle}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.codeEtape}</td>
                  <td className="px-4 py-3 text-center">
                    {e.estFinal ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ Finale
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => ouvrirEdition(e)}
                        title="Modifier"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setSuppression(e)}
                        title="Supprimer"
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal formulaire (création / édition) ── */}
      {formOuvert && (
        <EtapeFormModal
          etape={edition}
          ordreSuggere={etapes.length + 1}
          onConfirm={enregistrer}
          onClose={() => { setFormOuvert(false); setEdition(null); }}
        />
      )}

      {/* ── Modal suppression ── */}
      {suppression && (
        <ModalOverlay onClose={() => setSuppression(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
            <div className="px-6 py-4 border-b border-red-200 bg-red-50">
              <h2 className="text-lg font-bold text-red-800">🗑️ Supprimer l'étape</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700">
                Supprimer définitivement l'étape <strong>{suppression.libelle}</strong> (ordre {suppression.ordre}) ?
              </p>
              <p className="text-xs text-red-600 mt-2">
                La suppression est refusée si cette étape est utilisée dans le suivi de notifications.
              </p>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setSuppression(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => supprimer(suppression)}
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
// MODAL : Création / modification d'une étape
// ══════════════════════════════════════════════════════════════
function EtapeFormModal({
  etape,
  ordreSuggere,
  onConfirm,
  onClose,
}: {
  etape: EtapeNotification | null;
  ordreSuggere: number;
  onConfirm: (req: { codeEtape: string; libelle: string; ordre: number; estFinal?: boolean }) => Promise<void>;
  onClose: () => void;
}) {
  const [libelle, setLibelle] = useState(etape?.libelle ?? '');
  const [code, setCode] = useState(etape?.codeEtape ?? '');
  const [ordre, setOrdre] = useState(etape?.ordre ?? ordreSuggere);
  const [estFinal, setEstFinal] = useState(Boolean(etape?.estFinal));
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setSaving(true);
    try {
      await onConfirm({
        libelle: libelle.trim(),
        codeEtape: code.trim() || 'ETAPE',
        ordre: Number(ordre),
        estFinal,
      });
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-auto">
        <div className={`px-6 py-4 border-b ${etape ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'}`}>
          <h2 className={`text-lg font-bold ${etape ? 'text-blue-800' : 'text-green-800'}`}>
            {etape ? "✏️ Modifier l'étape" : '➕ Nouvelle étape'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Libellé <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder="Ex. : Convocation de l'occupant"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Ordre <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min={1}
                value={ordre}
                onChange={(e) => setOrdre(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex. : CONVOCATION"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={estFinal}
              onChange={(e) => setEstFinal(e.target.checked)}
              className="w-4 h-4 accent-emerald-600"
            />
            <span className="text-sm text-gray-700">
              Étape finale — enregistre la notification en « Clôturée »
            </span>
          </label>
          {erreur && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erreur}</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-4 py-2 text-sm text-white rounded-lg font-medium transition-colors disabled:opacity-60 ${
                etape ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {saving ? 'Enregistrement...' : etape ? 'Enregistrer' : "Créer l'étape"}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

// ══════════════════════════════════════════════════════════════
// Composant réutilisable
// ══════════════════════════════════════════════════════════════
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="relative z-50 w-full" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
