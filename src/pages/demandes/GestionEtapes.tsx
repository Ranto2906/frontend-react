import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dossierService } from '../../services';
import type { Etape, EtapeRequest } from '../../types';
import { msgErreur } from '../../utils';

// ════════════════════════════════════════════════════════════
// Configuration des étapes du workflow de suivi de dossier :
// création, modification, réordonnancement et suppression
// des étapes du référentiel.
// ═════════════════════════════════════ GestionEtapes.tsx ════

export default function GestionEtapes() {
  const navigate = useNavigate();

  const [etapes, setEtapes] = useState<Etape[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [formOuvert, setFormOuvert] = useState(false);
  const [edition, setEdition] = useState<Etape | null>(null);
  const [suppression, setSuppression] = useState<Etape | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      setEtapes(await dossierService.listerEtapes());
    } catch {
      showToast('Erreur lors du chargement des étapes', false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const ouvrirCreation = () => { setEdition(null); setFormOuvert(true); };
  const ouvrirEdition = (e: Etape) => { setEdition(e); setFormOuvert(true); };

  const enregistrer = async (req: EtapeRequest) => {
    try {
      if (edition) {
        await dossierService.modifierEtape(edition.idEtape, req);
        showToast('Étape modifiée');
      } else {
        await dossierService.creerEtape(req);
        showToast('Étape ajoutée au workflow');
      }
      setFormOuvert(false);
      setEdition(null);
      await charger();
    } catch (err) {
      throw new Error(msgErreur(err, "Erreur lors de l'enregistrement de l'étape"));
    }
  };

  const supprimer = async (e: Etape) => {
    try {
      await dossierService.supprimerEtapeReferentiel(e.idEtape);
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
          <h1 className="text-2xl font-bold text-gray-800">⚙️ Configuration des étapes</h1>
          <p className="text-gray-500 text-sm mt-1">
            Workflow du suivi de dossier — {etapes.length} étape{etapes.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/demandes')}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ← Retour
          </button>
          <button
            onClick={ouvrirCreation}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
          >
            ➕ Nouvelle étape
          </button>
        </div>
      </div>

      {/* Tableau des étapes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            Chargement...
          </div>
        ) : etapes.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-lg">Aucune étape définie</p>
            <p className="text-sm mt-1">
              Créez les étapes du workflow (ex. : Dépôt, Instruction, Étude, Validation).
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-20">Ordre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Libellé</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Durée prév. (j)</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {etapes.map((e) => (
                <tr key={e.idEtape} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs">
                      {e.ordre}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{e.libelle}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.codeEtape}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{e.dureePrevisionnelle ?? '—'}</td>
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
                La suppression est refusée si cette étape est utilisée dans le suivi de dossiers.
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
  etape: Etape | null;
  ordreSuggere: number;
  onConfirm: (req: EtapeRequest) => Promise<void>;
  onClose: () => void;
}) {
  const [libelle, setLibelle] = useState(etape?.libelle ?? '');
  const [code, setCode] = useState(etape?.codeEtape ?? '');
  const [ordre, setOrdre] = useState(etape?.ordre ?? ordreSuggere);
  const [duree, setDuree] = useState(etape?.dureePrevisionnelle != null ? String(etape.dureePrevisionnelle) : '');
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setSaving(true);
    try {
      await onConfirm({
        libelle: libelle.trim(),
        codeEtape: code.trim() || undefined,
        ordre: Number(ordre),
        dureePrevisionnelle: duree ? Number(duree) : undefined,
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
            {etape ? '✏️ Modifier l\'étape' : '➕ Nouvelle étape'}
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
              placeholder="Ex. : Descente pour enquête « sans contact »"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Durée prév. (jours)</label>
              <input
                type="number"
                min={0}
                value={duree}
                onChange={(e) => setDuree(e.target.value)}
                placeholder="Ex. : 10"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Auto si vide"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
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
              {saving ? 'Enregistrement...' : etape ? 'Enregistrer' : 'Créer l\'étape'}
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
