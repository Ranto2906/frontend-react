import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { corbeilleService } from '../../services';
import type { CorbeilleDTO, CorbeilleStatistique, PageResponse } from '../../types';

type Toast = { msg: string; ok: boolean } | null;

const ICONES: Record<string, string> = {
  DOSSIER: '📁',
  SUIVI_DOSSIER: '📌',
  DOSSIER_PARCELLE: '📐',
  DOSSIER_DEMANDEUR: '👤',
  DOSSIER_FOURNIE: '📄',
  ETAPE_DOSSIER: '🧩',
  TYPE_DOSSIER: '🏷️',
  PERSONNE: '👤',
  NOTIFICATION: '🔔',
  NOTIFICATION_PERSONNE: '👥',
  AVERTISSEMENT: '⚠️',
  SUIVI_NOTIFICATION: '📌',
  ETAPE_NOTIFICATION: '🧩',
  SIGNALEMENT: '🚩',
  ASSIGNATION: '🔗',
  DESCENTE_TERRAIN: '🥾',
  DOCUMENT_DEMANDEUR: '📄',
  PROPRIETE: '🏠',
  PARCELLE: '📐',
  VILLE: '🏙️',
  LIEU: '📍',
  PRIX_M2: '💰',
  TYPE_PROPRIETE: '🏷️',
  UTILISATEUR: '🧑',
  ROLE: '🔑',
  GEOMETRIE: '🗺️',
};

export default function Corbeille() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.some((r) => r.nomRole === 'Administrateur');

  const [entrees, setEntrees] = useState<CorbeilleDTO[]>([]);
  const [page, setPage] = useState<PageResponse<CorbeilleDTO> | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [stats, setStats] = useState<CorbeilleStatistique[]>([]);
  const [entite, setEntite] = useState('');
  const [recherche, setRecherche] = useState('');
  const [rechercheAppliquee, setRechercheAppliquee] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);
  const [detail, setDetail] = useState<CorbeilleDTO | null>(null);
  const [aPurger, setAPurger] = useState<CorbeilleDTO | null>(null);
  const [viderOuvert, setViderOuvert] = useState(false);
  const [busy, setBusy] = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const data = await corbeilleService.lister(
        { entite, q: rechercheAppliquee },
        pageIndex,
        20,
      );
      setEntrees(data.content);
      setPage(data);
      setStats(await corbeilleService.statistiques());
      // Le compteur du menu (Layout) doit suivre les restaurations / purges
      window.dispatchEvent(new Event('corbeille:refresh'));
    } catch {
      showToast('Erreur lors du chargement de la corbeille', false);
    } finally {
      setLoading(false);
    }
  }, [entite, rechercheAppliquee, pageIndex]);

  useEffect(() => {
    charger();
  }, [charger]);

  /** Ouvre la fiche : le détail des lignes vient de /api/corbeille/{id}. */
  const ouvrirDetail = async (e: CorbeilleDTO) => {
    setDetail(e);
    try {
      setDetail(await corbeilleService.detail(e.id));
    } catch {
      showToast('Détail indisponible', false);
    }
  };

  const restaurer = async (e: CorbeilleDTO) => {
    setBusy(true);
    try {
      await corbeilleService.restaurer(e.id);
      showToast(`« ${e.libelle || e.entiteLibelle} » restauré`);
      setDetail(null);
      await charger();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg || 'Restauration impossible', false);
    } finally {
      setBusy(false);
    }
  };

  const purger = async () => {
    if (!aPurger) return;
    setBusy(true);
    try {
      await corbeilleService.purger(aPurger.id);
      showToast('Élément supprimé définitivement');
      setAPurger(null);
      setDetail(null);
      await charger();
    } catch {
      showToast('Suppression impossible', false);
    } finally {
      setBusy(false);
    }
  };

  const vider = async () => {
    setBusy(true);
    try {
      const { supprimes } = await corbeilleService.vider(entite || undefined);
      showToast(`Corbeille vidée (${supprimes} ligne${supprimes > 1 ? 's' : ''})`);
      setViderOuvert(false);
      setPageIndex(0);
      await charger();
    } catch {
      showToast('Impossible de vider la corbeille', false);
    } finally {
      setBusy(false);
    }
  };

  const total = page?.totalElements ?? 0;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${
          toast.ok ? 'bg-green-600' : 'bg-red-600'
        }`}>{toast.msg}</div>
      )}

      {/* En-tête */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🗑️ Corbeille</h1>
          <p className="text-gray-500 text-sm mt-1">
            Tous les éléments supprimés restent ici : vous pouvez les restaurer
            à l'identique ou les supprimer définitivement.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setViderOuvert(true)}
            disabled={total === 0}
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg font-medium transition-colors"
          >
            Vider la corbeille{entite ? ' (filtrée)' : ''}
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2">
          <span className="text-gray-400">🔎</span>
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPageIndex(0);
                setRechercheAppliquee(recherche);
              }
            }}
            placeholder="Nom, référence, identifiant..."
            className="text-sm outline-none w-64"
          />
          {recherche && (
            <button
              onClick={() => { setRecherche(''); setRechercheAppliquee(''); setPageIndex(0); }}
              className="text-gray-400 hover:text-gray-600"
            >✕</button>
          )}
        </div>
        <select
          value={entite}
          onChange={(e) => { setEntite(e.target.value); setPageIndex(0); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none"
        >
          <option value="">Tous les types</option>
          {stats.filter((s) => s.entite !== 'TOTAL').map((s) => (
            <option key={s.entite} value={s.entite}>
              {ICONES[s.entite] || '•'} {s.entiteLibelle} ({s.total})
            </option>
          ))}
        </select>
        <button
          onClick={() => { setPageIndex(0); setRechercheAppliquee(recherche); }}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Rechercher
        </button>
        <span className="text-xs text-gray-500 ml-auto">
          {total} suppression{total > 1 ? 's' : ''} conservée{total > 1 ? 's' : ''}
        </span>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            Chargement...
          </div>
        ) : entrees.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">🗑️</p>
            <p className="text-lg">La corbeille est vide</p>
            <p className="text-sm mt-1">
              Les éléments supprimés dans l'application apparaîtront ici.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Élément supprimé</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Lignes</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Supprimé le</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Par</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entrees.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <span className="text-lg">{ICONES[e.entite] || '🗂️'}</span>
                      <span className="text-gray-700">{e.entiteLibelle}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => ouvrirDetail(e)}
                      className="text-left font-medium text-gray-800 hover:text-blue-700"
                    >
                      {e.libelle || `#${e.id}`}
                    </button>
                    {e.elements > 1 && (
                      <p className="text-[11px] text-gray-400">
                        + {e.elements - 1} ligne{e.elements > 2 ? 's' : ''} liée{e.elements > 2 ? 's' : ''}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{e.elements}</td>
                  <td className="px-4 py-3 text-gray-600">{e.supprimeLe || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{e.supprimePar || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => restaurer(e)}
                        disabled={busy}
                        className="px-2.5 py-1 text-xs rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium transition-colors"
                      >
                        ↺ Restaurer
                      </button>
                      <button
                        onClick={() => setAPurger(e)}
                        disabled={busy}
                        className="px-2.5 py-1 text-xs rounded-lg border border-red-300 text-red-600 hover:bg-red-50 font-medium transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {page && page.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              Page {page.number + 1} sur {page.totalPages}
            </p>
            <div className="flex gap-1">
              <button
                disabled={page.first}
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                className="px-3 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Précédent
              </button>
              <button
                disabled={page.last}
                onClick={() => setPageIndex((p) => p + 1)}
                className="px-3 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Suivant →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Détail */}
      {detail && (
        <ModalOverlay onClose={() => setDetail(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  {ICONES[detail.entite] || '🗂️'} {detail.libelle || detail.entiteLibelle}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {detail.entiteLibelle} · supprimé le {detail.supprimeLe || '—'}
                  {detail.supprimePar ? ` par ${detail.supprimePar}` : ''}
                </p>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 overflow-y-auto">
              <p className="text-sm text-gray-600 mb-3">
                {detail.elements} ligne{detail.elements > 1 ? 's' : ''} conservée
                {detail.elements > 1 ? 's' : ''} pour cette suppression :
              </p>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-y border-gray-200">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Type</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Fiche</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Identifiant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(detail.contenu || []).map((l, i) => (
                    <tr key={`${l.table}-${l.idEntite}-${i}`}>
                      <td className="px-3 py-2 text-gray-700">{l.entite}</td>
                      <td className="px-3 py-2 text-gray-500">{l.libelle || '—'}</td>
                      <td className="px-3 py-2 text-gray-400 font-mono text-xs">{l.idEntite || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setDetail(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                Fermer
              </button>
              <button onClick={() => setAPurger(detail)} disabled={busy}
                className="px-4 py-2 text-sm border border-red-300 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors">
                Supprimer définitivement
              </button>
              <button onClick={() => restaurer(detail)} disabled={busy}
                className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors">
                {busy ? 'Restauration...' : '↺ Restaurer'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Confirmation de purge unitaire */}
      {aPurger && (
        <ModalOverlay onClose={() => setAPurger(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-red-200 bg-red-50">
              <h2 className="text-lg font-bold text-red-800">🗑️ Supprimer définitivement</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700">
                <strong>{aPurger.libelle || aPurger.entiteLibelle}</strong>
                {aPurger.elements > 1
                  ? ` et ${aPurger.elements - 1} ligne${aPurger.elements > 2 ? 's' : ''} liée${aPurger.elements > 2 ? 's' : ''}`
                  : ' et ses données'}{' '}
                {aPurger.elements > 1 ? 'seront effacés' : 'sera effacé'} de la corbeille.
              </p>
              <p className="text-xs text-red-600 mt-2">
                cette action est irreversible : l'élément ne pourra plus être restauré.
              </p>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setAPurger(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  Annuler
                </button>
                <button onClick={purger} disabled={busy}
                  className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors">
                  {busy ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Confirmation de vidage */}
      {viderOuvert && (
        <ModalOverlay onClose={() => setViderOuvert(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-red-200 bg-red-50">
              <h2 className="text-lg font-bold text-red-800">Vider la corbeille</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700">
                Les {total} entrée{total > 1 ? 's' : ''} affichée{total > 1 ? 's' : ''}
                {entite ? ` (type : ${entite})` : ''} seront supprimées définitivement.
              </p>
              <p className="text-xs text-red-600 mt-2">
                Aucune restauration ne sera plus possible ensuite.
              </p>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setViderOuvert(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  Annuler
                </button>
                <button onClick={vider} disabled={busy}
                  className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors">
                  {busy ? 'Suppression...' : 'Vider'}
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full flex justify-center">
        {children}
      </div>
    </div>
  );
}
