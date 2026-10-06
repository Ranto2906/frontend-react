import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dossierService, villeService, importService, proprieteService } from '../../services';
import type { DemandeDossier, Ville, Etape, PageResponse, StatistiquesDossier, ImportSituationDemandesResult } from '../../types';

function formatDate(d?: string | null): string {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
}

function lieuxDuDossier(dossier: DemandeDossier, lieuxParPropriete: Record<number, string>): string {
  const lieux = (dossier.parcelles ?? [])
    .map((parcelle) => parcelle.libelleLieu || parcelle.nomLieu || (parcelle.idPropriete != null ? lieuxParPropriete[parcelle.idPropriete] : undefined))
    .filter((lieu): lieu is string => Boolean(lieu));
  return [...new Set(lieux)].join(', ') || '—';
}

export default function Demandes() {
  const navigate = useNavigate();

  const [list, setList] = useState<DemandeDossier[]>([]);
  const [lieuxParPropriete, setLieuxParPropriete] = useState<Record<number, string>>({});
  const [page, setPage] = useState<PageResponse<DemandeDossier> | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<DemandeDossier | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Filtres (recherche serveur multi-critères)
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterVille, setFilterVille] = useState('');
  const [annee, setAnnee] = useState('');
  const [du, setDu] = useState('');
  const [au, setAu] = useState('');
  const [filtresVisibles, setFiltresVisibles] = useState(false);

  // Changement d'étape rapide depuis la liste
  const [etapeModal, setEtapeModal] = useState<DemandeDossier | null>(null);

  // Import Excel « Situation des demandes Patrimoines »
  const [importOuvert, setImportOuvert] = useState(false);
  const [fichierImport, setFichierImport] = useState<File | null>(null);
  const [importEnCours, setImportEnCours] = useState(false);
  const [importResultat, setImportResultat] = useState<ImportSituationDemandesResult | null>(null);
  const inputFichierRef = useRef<HTMLInputElement>(null);

  // Référentiels
  const [statuts, setStatuts] = useState<Array<{ idStatutDossier: number; libelle: string }>>([]);
  const [villes, setVilles] = useState<Ville[]>([]);
  const [stats, setStats] = useState<StatistiquesDossier | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // Référentiels + stats
  useEffect(() => {
    (async () => {
      try {
        const [s, v] = await Promise.all([dossierService.listerStatuts(), villeService.listerToutes()]);
        setStatuts(s);
        setVilles(v);
      } catch { /* référentiels indisponibles */ }
      try {
        setStats(await dossierService.statistiques());
      } catch { /* stats indisponibles */ }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await dossierService.rechercher(
        {
          search: search.trim() || undefined,
          idStatut: filterStatut ? Number(filterStatut) : undefined,
          idVille: filterVille ? Number(filterVille) : undefined,
          annee: annee ? Number(annee) : undefined,
          du: du || undefined,
          au: au || undefined,
        },
        currentPage,
        15,
      );
      setList(p.content);
      setPage(p);

      const idsProprietes = [...new Set(
        p.content.flatMap((dossier) => (dossier.parcelles ?? [])
          .map((parcelle) => parcelle.idPropriete)
          .filter((id): id is number => id != null)),
      )];
      if (idsProprietes.length > 0) {
        const proprietes = await Promise.all(
          idsProprietes.map(async (idPropriete) => {
            try {
              return await proprieteService.trouverParId(idPropriete);
            } catch {
              return null;
            }
          }),
        );
        setLieuxParPropriete((precedents) => ({
          ...precedents,
          ...Object.fromEntries(
            proprietes
              .filter((propriete): propriete is NonNullable<typeof propriete> => propriete != null && Boolean(propriete.libelleLieu))
              .map((propriete) => [propriete.idPropriete, propriete.libelleLieu as string]),
          ),
        }));
      }
    } catch {
      showToast('Erreur lors du chargement des dossiers', false);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatut, filterVille, annee, du, au, currentPage]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    try {
      await dossierService.supprimer(id);
      showToast('Dossier supprimé');
      setModal(null);
      load();
    } catch {
      showToast('Erreur lors de la suppression', false);
      setModal(null);
    }
  };

  const nbFiltresActifs = useMemo(
    () => [search, filterStatut, filterVille, annee, du, au].filter((v) => v).length,
    [search, filterStatut, filterVille, annee, du, au],
  );

  const reinitialiserFiltres = () => {
    setSearch(''); setFilterStatut(''); setFilterVille(''); setAnnee(''); setDu(''); setAu('');
    setCurrentPage(0);
  };

  const total = page?.totalElements ?? list.length;

  // ── Import Excel « Situation des demandes Patrimoines » ──
  const lancerImport = async () => {
    if (!fichierImport || importEnCours) return;
    setImportEnCours(true);
    setImportResultat(null);
    try {
      const res = await importService.importerSituationDemandes(fichierImport);
      setImportResultat(res);
      showToast(`Import terminé : ${res.dossiersImportes} dossier(s) créé(s), ${res.dossiersMisAJour} mis à jour`);
      load();
    } catch (err: unknown) {
      const status = err instanceof Error && 'response' in err
        ? (err as { response?: { status?: number } }).response?.status
        : undefined;
      const data = err instanceof Error && 'response' in err
        ? (err as { response?: { data?: { message?: string; erreur?: string } } }).response?.data
        : undefined;
      let msg: string;
      if (status === 401 || status === 403) {
        msg = "Accès refusé : votre session a peut-être expiré — reconnectez-vous puis réessayez.";
      } else if (status === 502) {
        msg = "Serveur indisponible : le backend est peut-être en redémarrage, réessayez.";
      } else {
        msg = data?.message || data?.erreur || "Erreur lors de l'import";
      }
      showToast(msg, false);
    } finally {
      setImportEnCours(false);
    }
  };

  const fermerImport = () => {
    setImportOuvert(false);
    setFichierImport(null);
    setImportResultat(null);
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
          <h1 className="text-2xl font-bold text-gray-800">📁 Liste des dossier</h1>
          <p className="text-gray-500 text-sm mt-1">
            {total} demande{total > 1 ? 's' : ''} — demandeurs, étapes et avancement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/demandes')}
            title="Configurer les étapes du workflow"
            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
          >
            <span>←</span> Retour
          </button>
          <button
            onClick={() => setImportOuvert(true)}
            title="Importer le fichier Excel « Situation des demandes Patrimoines »"
            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
          >
            <span>📥</span> Importer Excel
          </button>
          <button
            onClick={() => navigate('/demandes/nouveau')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
          >
            <span>➕</span> Nouvelle demande
          </button>
        </div>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium">Total dossiers</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium">En cours</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.enCours}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium">Finalisés</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.finalises}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium">Année {new Date().getFullYear()}</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.anneeEnCours}</p>
          </div>
        </div>
      )}

      {/* Barre de recherche + bouton filtres */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(0); }}
          placeholder="🔍 Rechercher (numéro, demandeur, ville, résultat, observation...)"
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
        />
        <button
          onClick={() => setFiltresVisibles((v) => !v)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            filtresVisibles || nbFiltresActifs > 0
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          🎛️ Filtres
          {nbFiltresActifs > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs">
              {nbFiltresActifs}
            </span>
          )}
        </button>
        {nbFiltresActifs > 0 && (
          <button
            onClick={reinitialiserFiltres}
            className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ✕ Réinitialiser
          </button>
        )}
      </div>

      {/* Filtres multicritères */}
      {filtresVisibles && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4 grid grid-cols-2 md:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Statut</label>
            <select
              value={filterStatut}
              onChange={(e) => { setFilterStatut(e.target.value); setCurrentPage(0); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Tous les statuts</option>
              {statuts.map((s) => (
                <option key={s.idStatutDossier} value={s.idStatutDossier}>{s.libelle}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Ville</label>
            <select
              value={filterVille}
              onChange={(e) => { setFilterVille(e.target.value); setCurrentPage(0); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Toutes les villes</option>
              {villes.map((v) => (
                <option key={v.idVille} value={v.idVille}>{v.nomVille}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Année</label>
            <input
              type="number"
              value={annee}
              onChange={(e) => { setAnnee(e.target.value); setCurrentPage(0); }}
              placeholder="2026"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Du</label>
            <input
              type="date"
              value={du}
              onChange={(e) => { setDu(e.target.value); setCurrentPage(0); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Au</label>
            <input
              type="date"
              value={au}
              onChange={(e) => { setAu(e.target.value); setCurrentPage(0); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      )}

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            Chargement...
          </div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-lg">Aucun dossier trouvé</p>
            <p className="text-sm mt-1">
              {nbFiltresActifs > 0 ? 'Ajustez vos filtres de recherche.' : 'Créez la première demande.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">N° dossier</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Demandeur(s)</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Lieu</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date demande</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((d) => (
                <tr key={d.idDossier} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      to={`/demandes/${d.idDossier}`}
                      className="font-medium text-gray-800 hover:text-blue-600 hover:underline"
                    >
                      {d.numeroDossier}
                    </Link>
                    {d.transmission && (
                      <p className="text-xs text-gray-500 max-w-[180px] truncate">↪ {d.transmission}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {d.demandeurs?.length
                      ? d.demandeurs.map((dm) => dm.nom).join(', ')
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">📍 {lieuxDuDossier(d, lieuxParPropriete)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(d.dateDemande ?? null)}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
                      style={{ background: d.couleurStatutHex || '#6b7280' }}
                    >
                      {d.libelleStatut || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`/demandes/${d.idDossier}`}
                        title="Détail & suivi"
                        className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"
                      >
                        📜
                      </Link>
                      <Link
                        to={`/demandes/${d.idDossier}/modifier`}
                        title="Modifier"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                      >
                        ✏️
                      </Link>
                      <button
                        onClick={() => setModal(d)}
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

        {/* Pagination serveur */}
        {page && page.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              Page {page.number + 1} sur {page.totalPages} — {page.totalElements} résultat{page.totalElements > 1 ? 's' : ''}
            </p>
            <div className="flex gap-1">
              <button
                disabled={page.first}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-3 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Précédent
              </button>
              <button
                disabled={page.last}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Suivant →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal suppression ── */}
      {modal && (
        <DeleteModal dos={modal} onConfirm={handleDelete} onClose={() => setModal(null)} />
      )}

      {/* ── Modal changement d'étape rapide ── */}
      {etapeModal && (
        <EtapeModal
          dos={etapeModal}
          onClose={() => setEtapeModal(null)}
          onSaved={(msg) => { setEtapeModal(null); showToast(msg); load(); }}
          onError={(msg) => showToast(msg, false)}
        />
      )}

      {/* ── Modal import Excel « Situation des demandes Patrimoines » ── */}
      {importOuvert && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-800">📥 Import Excel — Situation des demandes</h2>
              <button onClick={fermerImport} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Le classeur doit contenir une feuille « Prix au m² » (ville, prix TTC/m², observation, HT)
              et une feuille par ville (N° Dossier, Date, Année, Demandeur, Contact, Propriété, TN°,
              Lieu, Coordonnées X/Y, Superficie, Valeur TTC). L'import est idempotent :
              un dossier déjà importé (même numéro + ville) est mis à jour, pas dupliqué.
            </p>

            <input
              ref={inputFichierRef}
              type="file"
              accept=".xlsx,.xlsm"
              className="hidden"
              onChange={(e) => {
                setFichierImport(e.target.files?.[0] ?? null);
                setImportResultat(null);
              }}
            />
            <button
              type="button"
              onClick={() => inputFichierRef.current?.click()}
              disabled={importEnCours}
              className="w-full border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg px-4 py-6 text-sm text-gray-600 transition-colors disabled:opacity-50"
            >
              {fichierImport
                ? `📄 ${fichierImport.name}`
                : 'Cliquez pour choisir un fichier .xlsx'}
            </button>

            {importResultat && (
              <div className="mt-4 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Dossiers créés</p>
                    <p className="text-xl font-bold text-green-700">{importResultat.dossiersImportes}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Dossiers mis à jour</p>
                    <p className="text-xl font-bold text-blue-700">{importResultat.dossiersMisAJour}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Prix au m² importés</p>
                    <p className="text-xl font-bold text-gray-800">{importResultat.prixImportes}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Parcelles liées</p>
                    <p className="text-xl font-bold text-gray-800">{importResultat.parcellesLiees}</p>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Lieux créés</p>
                    <p className="text-xl font-bold text-indigo-700">{importResultat.lieuxImportes}</p>
                  </div>
                </div>
                {importResultat.erreurs.length > 0 && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-amber-800 mb-1">
                      Remarques ({importResultat.erreurs.length})
                    </p>
                    <ul className="text-xs text-amber-700 list-disc list-inside max-h-32 overflow-y-auto">
                      {importResultat.erreurs.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={fermerImport}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
              >
                Fermer
              </button>
              <button
                onClick={lancerImport}
                disabled={!fichierImport || importEnCours}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm"
              >
                {importEnCours ? '⏳ Import en cours…' : 'Lancer l\'import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MODAL : Changement d'étape rapide (depuis la liste)
// Enregistre l'étape via l'API puis rend la main à la liste,
// qui recharge et affiche le toast.
// ══════════════════════════════════════════════════════════════
export function EtapeModal({
  dos,
  onSaved,
  onError,
  onClose,
}: {
  dos: DemandeDossier;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
  onClose: () => void;
}) {
  const [etapes, setEtapes] = useState<Etape[]>([]);
  const [etapeChoisie, setEtapeChoisie] = useState('');
  const [dateRealisation, setDateRealisation] = useState(new Date().toISOString().slice(0, 10));
  const [commentaire, setCommentaire] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await dossierService.listerEtapes();
        setEtapes(list);
        // Pré-sélectionne la prochaine étape non réalisée
        const realisees = new Set((dos.suivi ?? []).filter((s) => s.dateRealisation).map((s) => s.idEtape));
        const prochaine = list.find((et) => !realisees.has(et.idEtape));
        if (prochaine) setEtapeChoisie(String(prochaine.idEtape));
      } catch {
        onError('Erreur lors du chargement des étapes');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!etapeChoisie) return;
    setSaving(true);
    try {
      await dossierService.enregistrerEtape(dos.idDossier, {
        idEtape: Number(etapeChoisie),
        dateRealisation: dateRealisation || undefined,
        commentaire: commentaire.trim() || undefined,
      });
      onSaved(`Étape enregistrée pour ${dos.numeroDossier}`);
    } catch (err) {
      const e2 = err as { response?: { data?: { message?: string } } };
      onError(e2?.response?.data?.message || "Erreur lors de l'enregistrement de l'étape");
      setSaving(false);
    }
  };

  const realisees = (dos.suivi ?? []).filter((s) => s.dateRealisation);

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
        <div className="px-6 py-4 border-b border-green-200 bg-green-50">
          <h2 className="text-lg font-bold text-green-800">🔄 Changement d'étape</h2>
          <p className="text-xs text-green-700 mt-0.5">Dossier {dos.numeroDossier}{dos.nomVille ? ` — ${dos.nomVille}` : ''}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Avancement actuel */}
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            Avancement : <strong>{realisees.length}</strong> étape(s) réalisée(s)
            {dos.etapeActuelleLibelle ? (
              <> — prochaine : <strong>{dos.etapeActuelleLibelle}</strong></>
            ) : (
              <> — <span className="text-green-600 font-medium">workflow terminé</span></>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nouvelle étape réalisée <span className="text-red-500">*</span></label>
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
                  {realisees.some((s) => s.idEtape === et.idEtape) ? ' ✓' : ''}
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
            <label className="block text-xs font-medium text-gray-500 mb-1">Commentaire</label>
            <textarea
              rows={2}
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Note sur cette étape..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!etapeChoisie || saving}
              className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-lg font-medium transition-colors"
            >
              {saving ? 'Enregistrement...' : "✓ Enregistrer l'étape"}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

// ══════════════════════════════════════════════════════════════
// MODAL : Confirmer la suppression
// ══════════════════════════════════════════════════════════════
function DeleteModal({
  dos,
  onConfirm,
  onClose,
}: {
  dos: DemandeDossier;
  onConfirm: (id: number) => Promise<void>;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(dos.idDossier);
    } catch {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
        <div className="px-6 py-4 border-b border-red-200 bg-red-50">
          <h2 className="text-lg font-bold text-red-800">🗑️ Supprimer le dossier</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-700">
            Supprimer définitivement le dossier{' '}
            <strong>{dos.numeroDossier}</strong>
            {dos.nomVille ? ` (${dos.nomVille})` : ''} ?
          </p>
          <p className="text-xs text-red-600 mt-2">
            Cette action est irréversible. Le suivi (étapes) et les demandeurs rattachés seront également supprimés.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors"
            >
              {saving ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </div>
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
