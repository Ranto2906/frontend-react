import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { dossierService, villeService, lieuService, personService, documentDemandeurService, typeDossierService } from '../../services';
import DocumentsDemandeur from './DocumentsDemandeur';
import PersonneDocumentsPicker, { type DocumentEnAttente } from '../../components/PersonneDocumentsPicker';
import type {
  DemandeDossier,
  Ville,
  StatutDossier,
  Propriete,
  Parcelle,
  DemandeDossierDemandeurRequest,
  ParcelleDemandeeRequest,
  DocumentDemandeur,
  TypePersonne,
  TypeDossier,
  Lieu,
} from '../../types';

// ════════════════════════════════════════════════════════════
// Formulaire demande — création et modification.
// Les demandeurs sont gérés en sous-formulaire : sélection d'une
// personne existante (recherche par nom) OU création inline
// (personne de type « Demandeur »).
// ════════════════════════════════════════════════════════════

interface LigneDemandeur {
  cle: number;
  idPersonne?: number;
  nom: string;
  contact: string;
  email: string;
  adresse: string;
  role: string;
  idTypePersonne?: number;
  documents: DocumentEnAttente[];
}

interface LigneParcelle {
  cle: number;
  idPropriete?: number;
  idParcelle?: string;
  superficieM2: string;
  observation: string;
}

export default function DemandeForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const edition = Boolean(id);

  // ── Champs du dossier ──
  const [numeroDossier, setNumeroDossier] = useState('');
  const [dateDemande, setDateDemande] = useState(new Date().toISOString().slice(0, 10));
  const [transmission, setTransmission] = useState('');
  const [resultatEtude, setResultatEtude] = useState('');
  const [observation, setObservation] = useState('');
  const [lieu, setLieu] = useState('');
  const [idStatutDossier, setIdStatutDossier] = useState('');
  const [idVille, setIdVille] = useState('');
  const [montantTtc, setMontantTtc] = useState('');

  // ── Type de dossier + dossier fournie (texte libre) ──
  const [typesDossier, setTypesDossier] = useState<TypeDossier[]>([]);
  const [idTypeDossier, setIdTypeDossier] = useState('');
  const [dossierFournieTexte, setDossierFournieTexte] = useState('');

  // ── Demandeurs ──
  const [lignes, setLignes] = useState<LigneDemandeur[]>([
    { cle: 0, nom: '', contact: '', email: '', adresse: '', role: 'Principal', documents: [] },
  ]);

  // ── Parcelles demandées (propriété → parcelle → superficie → montants auto) ──
  const [parcelleLignes, setParcelleLignes] = useState<LigneParcelle[]>([
    { cle: 0, superficieM2: '', observation: '' },
  ]);
  const [modeDemandeur, setModeDemandeur] = useState<'nouveau' | 'existant'>(edition ? 'existant' : 'nouveau');
  const [recherche, setRecherche] = useState('');
  const [rechercheEnCours, setRechercheEnCours] = useState(false);
  const [erreurRecherche, setErreurRecherche] = useState('');
  const [resultats, setResultats] = useState<Array<{
    idPersonne: number;
    nom: string;
    contact?: string | null;
    idTypePersonne?: number;
  }>>([]);

  // ── Lieu : sélection d'un lieu existant ou création inline ──
  const [modeLieu, setModeLieu] = useState<'nouveau' | 'existant'>(edition ? 'existant' : 'nouveau');
  const [lieux, setLieux] = useState<Lieu[]>([]);
  const [rechercheLieu, setRechercheLieu] = useState('');
  const [resultatsLieux, setResultatsLieux] = useState<Lieu[]>([]);
  const [nomNouveauLieu, setNomNouveauLieu] = useState('');
  const [creationLieuEnCours, setCreationLieuEnCours] = useState(false);
  const [erreurLieu, setErreurLieu] = useState('');

  // ── Référentiels / état ──
  const [villes, setVilles] = useState<Ville[]>([]);
  const [statuts, setStatuts] = useState<StatutDossier[]>([]);
  const [typesPersonne, setTypesPersonne] = useState<TypePersonne[]>([]);
  const [proprietes, setProprietes] = useState<Propriete[]>([]);
  const [parcellesParPropriete, setParcellesParPropriete] = useState<Record<number, Parcelle[]>>({});
  const [prixVille, setPrixVille] = useState<{ prixTtc: number; dateMaj?: string } | null>(null);
  const [recherchePropriete, setRecherchePropriete] = useState('');
  const [loading, setLoading] = useState(false);

  // Documents par demandeur existant (chargés une fois la personne enregistrée)
  const [docsParDemandeur, setDocsParDemandeur] = useState<Record<number, DocumentDemandeur[]>>({});
  const [chargement, setChargement] = useState(edition);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const rechercherPersonnes = async () => {
    const nom = recherche.trim();
    if (nom.length < 2) {
      setResultats([]);
      setErreurRecherche('Saisissez au moins 2 caractères.');
      return;
    }
    setRechercheEnCours(true);
    setErreurRecherche('');
    try {
      const response = await personService.rechercherParNom(nom);
      const personnes = Array.isArray(response) ? response : response.content;
      setResultats(personnes.map((p) => ({
        idPersonne: p.idPersonne,
        nom: p.nom,
        contact: p.contact,
        idTypePersonne: p.idTypePersonne,
      })));
      if (personnes.length === 0) setErreurRecherche('Aucune personne trouvée.');
    } catch {
      setResultats([]);
      setErreurRecherche('La recherche est indisponible.');
    } finally {
      setRechercheEnCours(false);
    }
  };

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // Référentiels
  useEffect(() => {
    (async () => {
      try {
        const [v, l, s, t, td] = await Promise.all([
          villeService.listerToutes(),
          lieuService.lister(),
          dossierService.listerStatuts(),
          personService.listerTypes(),
          typeDossierService.lister(),
        ]);
        setVilles(v);
        setLieux(l);
        setStatuts(s);
        setTypesPersonne(t);
        setTypesDossier(td);
      } catch { /* référentiels indisponibles */ }
    })();
  }, []);

  // Chargement du dossier en édition
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const d: DemandeDossier = await dossierService.trouverParId(Number(id));
        setNumeroDossier(d.numeroDossier);
        setDateDemande(d.dateDemande ?? '');
        setTransmission(d.transmission ?? '');
        setResultatEtude(d.resultatEtude ?? '');
        setObservation(d.observation ?? '');
        setLieu(d.lieu ?? '');
        setRechercheLieu(d.lieu ?? '');
        setIdStatutDossier(d.idStatutDossier != null ? String(d.idStatutDossier) : '');
        setIdTypeDossier(d.idTypeDossier != null ? String(d.idTypeDossier) : '');
        setDossierFournieTexte(d.libelleDossierFournie ?? '');
        setIdVille(String(d.idVille));
        setModeLieu('existant');
        setParcelleLignes(
          (d.parcelles ?? []).length > 0
            ? (d.parcelles ?? []).map((p, i) => ({
                cle: i,
                idPropriete: p.idPropriete ?? undefined,
                idParcelle: p.idParcelle ?? undefined,
                superficieM2: p.superficieM2 != null ? String(p.superficieM2) : '',
                observation: p.observation ?? '',
              }))
            : [{ cle: 0, superficieM2: '', observation: '' }],
        );
        // Pré-charge les listes de parcelles des propriétés rattachées (édition)
        [...new Set((d.parcelles ?? []).map((p) => p.idPropriete).filter((x): x is number => x != null))]
          .forEach(async (idp) => {
            try {
              const list = await dossierService.listerParcellesPropriete(idp);
              setParcellesParPropriete((prev) => ({ ...prev, [idp]: list }));
            } catch { /* ignore */ }
          });
        setLignes(
          (d.demandeurs ?? []).map((dm, i) => ({
            cle: i,
            idPersonne: dm.idPersonne,
            nom: dm.nom,
            contact: dm.contact ?? '',
            email: dm.email ?? '',
            adresse: dm.adresse ?? '',
            role: dm.role || 'Principal',
            idTypePersonne: undefined,
            documents: [],
          })) || [],
        );
        if ((d.demandeurs ?? []).length === 0) {
          setLignes([{ cle: 0, nom: '', contact: '', email: '', adresse: '', role: 'Principal', documents: [] }]);
        }
      } catch {
        showToast('Dossier introuvable', false);
      } finally {
        setChargement(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    const recherche = rechercheLieu.trim().toLowerCase();
    setResultatsLieux(
      recherche.length < 2
        ? []
        : lieux.filter((l) =>
            l.libelle.toLowerCase().includes(recherche) ||
            (l.nomVille ?? '').toLowerCase().includes(recherche),
          ),
    );
  }, [rechercheLieu, lieux]);

  const selectionnerLieu = (selection: Lieu) => {
    setLieu(selection.libelle);
    setIdVille(String(selection.idVille));
    setRechercheLieu(selection.libelle);
    setResultatsLieux([]);
    setErreurLieu('');
    setParcelleLignes((l) => l.map((li) => ({ ...li, idPropriete: undefined, idParcelle: undefined })));
  };

  const creerEtSelectionnerLieu = async () => {
    const libelle = nomNouveauLieu.trim();
    if (!libelle) {
      setErreurLieu('Le nom du lieu est obligatoire.');
      return;
    }
    if (!idVille) {
      setErreurLieu('La ville du lieu est obligatoire.');
      return;
    }
    setCreationLieuEnCours(true);
    setErreurLieu('');
    try {
      const nouveauLieu = await lieuService.creer({ libelle, idVille: Number(idVille) });
      setLieux((precedents) => [...precedents, nouveauLieu]);
      selectionnerLieu(nouveauLieu);
      setNomNouveauLieu('');
      setModeLieu('existant');
    } catch (err: unknown) {
      setErreurLieu(err instanceof Error ? err.message : 'Impossible de créer le lieu.');
    } finally {
      setCreationLieuEnCours(false);
    }
  };

  // Prix au m² de la ville sélectionnée (calcul auto HT/TTC)
  useEffect(() => {
    setPrixVille(null);
    if (!idVille) return;
    dossierService.dernierPrixVille(Number(idVille))
      .then(setPrixVille)
      .catch(() => setPrixVille(null));
  }, [idVille]);

  // Propriétés de la ville sélectionnée, filtrées par recherche (min. 2 caractères)
  useEffect(() => {
    setParcellesParPropriete({});
    if (!idVille) { setProprietes([]); return; }
    const q = recherchePropriete.trim();
    if (q.length < 2) {
      dossierService.listerProprietes(Number(idVille))
        .then(setProprietes)
        .catch(() => setProprietes([]));
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await dossierService.listerProprietes(Number(idVille), q);
        setProprietes(r);
      } catch { /* conserve la liste courante */ }
    }, 300);
    return () => clearTimeout(t);
  }, [recherchePropriete, idVille]);

  const chargerParcelles = async (idPropriete: number) => {
    if (parcellesParPropriete[idPropriete]) return;
    try {
      const p = await dossierService.listerParcellesPropriete(idPropriete);
      setParcellesParPropriete((prev) => ({ ...prev, [idPropriete]: p }));
    } catch {
      setParcellesParPropriete((prev) => ({ ...prev, [idPropriete]: [] }));
    }
  };

  // Calcul automatique du montant TTC : superficie × prix au m² de la ville
  const totaux = useMemo(() => {
    let totalTtc = 0;
    const detail = parcelleLignes.map((li) => {
      const superficie = Number(li.superficieM2) || 0;
      const ttc = prixVille ? superficie * (Number(prixVille.prixTtc) || 0) : 0;
      totalTtc += ttc;
      return { ttc };
    });
    return { totalTtc, detail };
  }, [parcelleLignes, prixVille]);

  const formatAr = (n: number) =>
    n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    setMontantTtc(totaux.totalTtc ? String(totaux.totalTtc) : '');
  }, [totaux.totalTtc]);

  const ajouterParcelleLigne = () => {
    setParcelleLignes((l) => [...l, { cle: Date.now(), superficieM2: '', observation: '' }]);
  };

  const majParcelleLigne = (cle: number, patch: Partial<LigneParcelle>) => {
    setParcelleLignes((l) => l.map((li) => (li.cle === cle ? { ...li, ...patch } : li)));
  };

  const retirerParcelleLigne = (cle: number) => {
    setParcelleLignes((l) => (l.length > 1 ? l.filter((li) => li.cle !== cle) : l));
  };

  // Recherche de personnes existantes (pour le mode « existant »)
  useEffect(() => {
    if (modeDemandeur !== 'existant' || recherche.trim().length < 2) {
      setResultats([]);
      return;
    }
    const t = setTimeout(() => { rechercherPersonnes(); }, 300);
    return () => clearTimeout(t);
  }, [recherche, modeDemandeur]);

  // Charge les documents des demandeurs déjà enregistrés (édition)
  useEffect(() => {
    lignes
      .filter((li) => li.idPersonne && !docsParDemandeur[li.idPersonne])
      .forEach(async (li) => {
        if (!li.idPersonne) return;
        try {
          const list = await documentDemandeurService.lister(li.idPersonne);
          setDocsParDemandeur((prev) => ({ ...prev, [li.idPersonne!]: list }));
        } catch { /* ignore */ }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lignes]);

  const ajouterLigne = () => {
    setLignes((l) => [...l, {
      cle: Date.now(),
      nom: '', contact: '', email: '', adresse: '', role: 'Principal',
      idTypePersonne: undefined,
      documents: [],
    }]);
  };

  const majLigne = (cle: number, patch: Partial<LigneDemandeur>) => {
    setLignes((l) => l.map((li) => (li.cle === cle ? { ...li, ...patch } : li)));
  };

  const retirerLigne = (cle: number) => {
    setLignes((l) => (l.length > 1 ? l.filter((li) => li.cle !== cle) : l));
  };

  const peutSoumettre = useMemo(
    () => numeroDossier.trim() && idVille && lieu.trim()
      && lignes.some((li) => li.idPersonne || li.nom.trim()),
    [numeroDossier, idVille, lieu, lignes],
  );

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!peutSoumettre) return;
    setLoading(true);

    const demandeurs: DemandeDossierDemandeurRequest[] = lignes
      .filter((li) => li.idPersonne || li.nom.trim())
      .map((li) => ({
        idPersonne: li.idPersonne,
        nom: li.nom.trim() || undefined,
        contact: li.contact.trim() || undefined,
        email: li.email.trim() || undefined,
        adresse: li.adresse.trim() || undefined,
        role: li.role.trim() || 'Principal',
        idTypePersonne: li.idTypePersonne,
      }));

    // Parcelles demandées : seulement les lignes complètes (propriété choisie)
    const parcelles: ParcelleDemandeeRequest[] = parcelleLignes
      .filter((li) => li.idPropriete)
      .map((li) => ({
        idPropriete: li.idPropriete!,
        idParcelle: li.idParcelle || undefined,
        superficieM2: li.superficieM2 ? Number(li.superficieM2) : undefined,
        observation: li.observation.trim() || undefined,
      }));

    const body = {
      numeroDossier: numeroDossier.trim(),
      dateDemande: dateDemande || undefined,
      transmission: transmission.trim() || undefined,
      resultatEtude: resultatEtude.trim() || undefined,
      observation: observation.trim() || undefined,
      lieu: lieu.trim() || undefined,
      montantTotal: montantTtc ? Number(montantTtc) : undefined,
      idStatutDossier: idStatutDossier ? Number(idStatutDossier) : undefined,
      idTypeDossier: idTypeDossier ? Number(idTypeDossier) : undefined,
      dossierFournieLibelle: dossierFournieTexte.trim() || undefined,
      idVille: Number(idVille),
      demandeurs,
      parcelles,
    };

    try {
      const saved = edition
        ? await dossierService.modifier(Number(id), body)
        : await dossierService.creer(body);

      const personnesAvecDocuments = lignes
        .map((ligne, index) => ({ ligne, personne: saved.demandeurs?.[index] }))
        .filter(({ ligne, personne }) => ligne.documents.length > 0 && personne?.idPersonne);
      for (const { ligne, personne } of personnesAvecDocuments) {
        for (const document of ligne.documents) {
          await documentDemandeurService.ajouter({
            fichier: document.fichier,
            idPersonne: personne!.idPersonne,
            typeDocument: document.typeDocument,
          });
        }
      }
      navigate(`/demandes/${saved.idDossier}`, {
        state: { toast: { msg: edition ? 'Dossier mis à jour' : 'Demande créée', ok: true } },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error && 'response' in err
        ? String((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Erreur lors de l\'enregistrement')
        : 'Erreur lors de l\'enregistrement';
      showToast(msg, false);
    } finally {
      setLoading(false);
    }
  };

  if (chargement) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="p-12 text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          Chargement...
        </div>
      </div>
    );
  }

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {edition ? '✏️ Modifier le dossier' : '➕ Nouvelle demande'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {edition
              ? 'Mise à jour des informations du dossier et de ses demandeurs'
              : 'Créez le dossier et ajoutez un ou plusieurs demandeurs (existant ou nouveau)'}
          </p>
        </div>
        <Link to="/demandes/liste" className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          ← Retour à la liste
        </Link>
      </div>

      <form onSubmit={soumettre} className="w-full max-w-none space-y-6">
        {/* ── Informations de la demande ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-4">📋 Informations de la demande</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Numéro de dossier <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={numeroDossier}
                onChange={(e) => setNumeroDossier(e.target.value)}
                placeholder="ex. DOS-2026-001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Date de la demande</label>
              <input
                type="date"
                value={dateDemande}
                onChange={(e) => setDateDemande(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Statut</label>
              <select
                value={idStatutDossier}
                onChange={(e) => setIdStatutDossier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">En cours (défaut)</option>
                {statuts.map((s) => (
                  <option key={s.idStatutDossier} value={s.idStatutDossier}>{s.libelle}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Type de dossier</label>
              <select
                value={idTypeDossier}
                onChange={(e) => setIdTypeDossier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">— Aucun —</option>
                {typesDossier.map((t) => (
                  <option key={t.idTypeDossier} value={t.idTypeDossier}>{t.libelle}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Dossier fournie</label>
              <input
                type="text"
                value={dossierFournieTexte}
                onChange={(e) => setDossierFournieTexte(e.target.value)}
                placeholder="Saisir le dossier fourni…"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Montant total TTC</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={montantTtc}
                onChange={(e) => setMontantTtc(e.target.value)}
                placeholder="Prérempli selon la ville et la superficie"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Transmission</label>
              <input
                type="text"
                value={transmission}
                onChange={(e) => setTransmission(e.target.value)}
                placeholder="Service / entité de transmission"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">Résultat de l'étude</label>
              <input
                type="text"
                value={resultatEtude}
                onChange={(e) => setResultatEtude(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">Observation</label>
              <textarea
                rows={3}
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-gray-100">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-600">Lieu <span className="text-red-500">*</span></label>
                <p className="text-xs text-gray-400 mt-1">Sélectionnez un lieu existant ou créez-le s’il n’est pas encore enregistré.</p>
              </div>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setModeLieu('existant')}
                  className={`px-3 py-1.5 font-medium transition-colors ${modeLieu === 'existant' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  Lieu existant
                </button>
                <button
                  type="button"
                  onClick={() => setModeLieu('nouveau')}
                  className={`px-3 py-1.5 font-medium transition-colors ${modeLieu === 'nouveau' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  Nouveau lieu
                </button>
              </div>
            </div>

            {modeLieu === 'existant' ? (
              <div className="relative">
                <input
                  type="text"
                  value={rechercheLieu}
                  onChange={(e) => setRechercheLieu(e.target.value)}
                  placeholder="Rechercher un lieu par nom ou par ville (2 caractères min.)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {resultatsLieux.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    {resultatsLieux.map((l) => (
                      <button
                        key={l.idLieu}
                        type="button"
                        onClick={() => selectionnerLieu(l)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0"
                      >
                        <span className="font-medium text-gray-800">{l.libelle}</span>
                        <span className="block text-xs text-gray-500">{l.nomVille || `Ville #${l.idVille}`}</span>
                      </button>
                    ))}
                  </div>
                )}
                {lieu && (
                  <p className="mt-2 text-xs text-green-700">✓ Lieu sélectionné : <strong>{lieu}</strong></p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={nomNouveauLieu}
                  onChange={(e) => setNomNouveauLieu(e.target.value)}
                  placeholder="Nom du nouveau lieu *"
                  className="md:col-span-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <select
                  value={idVille}
                  onChange={(e) => {
                    setIdVille(e.target.value);
                    setParcelleLignes((l) => l.map((li) => ({ ...li, idPropriete: undefined, idParcelle: undefined })));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">— Ville du lieu —</option>
                  {villes.map((v) => <option key={v.idVille} value={v.idVille}>{v.nomVille}</option>)}
                </select>
                <button
                  type="button"
                  onClick={creerEtSelectionnerLieu}
                  disabled={creationLieuEnCours || !nomNouveauLieu.trim() || !idVille}
                  className="md:col-span-3 justify-self-start px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {creationLieuEnCours ? 'Création...' : '📍 Créer et sélectionner le lieu'}
                </button>
              </div>
            )}
            {erreurLieu && <p className="mt-2 text-xs text-red-600">{erreurLieu}</p>}
          </div>
        </div>

        {/* ── Parcelles demandées ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-gray-800">🗺️ Parcelles demandées</h2>
            <span className="text-xs text-gray-400">{parcelleLignes.length} ligne(s)</span>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Le montant TTC est calculé selon le prix au m² de la ville
            {prixVille
              ? ` — prix actuel : ${formatAr(Number(prixVille.prixTtc))} Ar TTC/m²${prixVille.dateMaj ? ` (maj ${new Date(prixVille.dateMaj).toLocaleDateString('fr-FR')})` : ''}`
              : ' — aucun prix défini pour cette ville'}.
          </p>

          {parcelleLignes.length === 0 && (
            <p className="text-sm text-gray-400 italic mb-2">Aucune parcelle demandée.</p>
          )}

          <div className="space-y-3">
            {parcelleLignes.map((li, i) => {
              const parcelles = li.idPropriete ? parcellesParPropriete[li.idPropriete] ?? [] : [];
              return (
                <div key={li.cle} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-500">Parcelle {i + 1}</p>
                    <button
                      type="button"
                      onClick={() => retirerParcelleLigne(li.cle)}
                      className="text-red-500 hover:bg-red-50 px-2 py-1 rounded text-xs transition-colors"
                    >
                      ✕ Retirer
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Propriété <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={li.idPropriete ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          majParcelleLigne(li.cle, { idPropriete: v ? Number(v) : undefined, idParcelle: undefined });
                          if (v) chargerParcelles(Number(v));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">— Choisir —</option>
                        {proprietes.map((p) => (
                          <option key={p.idPropriete} value={p.idPropriete}>
                            {p.numero ? `${p.numero} — ` : ''}{p.nom}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Parcelle (lot)</label>
                      <select
                        value={li.idParcelle ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          const p = parcelles.find((x) => x.idParcelle === v);
                          majParcelleLigne(li.cle, {
                            idParcelle: v || undefined,
                            superficieM2: p?.superficieM2 != null ? String(p.superficieM2) : li.superficieM2,
                          });
                        }}
                        disabled={!li.idPropriete}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                      >
                        <option value="">— Toute la propriété —</option>
                        {parcelles.map((p) => (
                          <option key={p.idParcelle} value={p.idParcelle}>
                            {p.numeroLot || 'Lot'}{p.superficieM2 != null ? ` (${p.superficieM2} m²)` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Superficie demandée (m²)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={li.superficieM2}
                        onChange={(e) => majParcelleLigne(li.cle, { superficieM2: e.target.value })}
                        placeholder="Ex. : 500"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">
                        {li.idParcelle
                          ? "↳ Une partie de la parcelle sélectionnée"
                          : li.idPropriete
                            ? "↳ Une partie de la propriété sélectionnée"
                            : "↳ Choisissez d'abord une propriété"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Observation</label>
                      <input
                        type="text"
                        value={li.observation}
                        onChange={(e) => majParcelleLigne(li.cle, { observation: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  {prixVille && Number(li.superficieM2) > 0 && (
                    <p className="text-xs text-gray-600 mt-2">
                      💰 Montant : <strong>{formatAr(totaux.detail[i]?.ttc ?? 0)} Ar TTC</strong>
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={ajouterParcelleLigne}
            className="mt-3 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors"
          >
            ➕ Ajouter une autre parcelle
          </button>

          {/* Recherche de propriété */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              🔍 Rechercher une propriété (filtre la liste ci-dessus)
            </label>
            <input
              type="text"
              value={recherchePropriete}
              onChange={(e) => setRecherchePropriete(e.target.value)}
              placeholder="Nom ou numéro de la propriété…"
              disabled={!idVille}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
            />
          </div>

        </div>

        {/* ── Demandeurs ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">👤 Demandeurs</h2>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setModeDemandeur('nouveau')}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  modeDemandeur === 'nouveau' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Nouveau demandeur
              </button>
              <button
                type="button"
                onClick={() => setModeDemandeur('existant')}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  modeDemandeur === 'existant' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Personne existante
              </button>
            </div>
          </div>

          {/* Recherche personne existante */}
          {modeDemandeur === 'existant' && (
            <div className="mb-4 relative">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      rechercherPersonnes();
                    }
                  }}
                  placeholder="Rechercher une personne par nom (2 caractères min.)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  type="button"
                  onClick={rechercherPersonnes}
                  disabled={recherche.trim().length < 2 || rechercheEnCours}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {rechercheEnCours ? 'Recherche...' : '🔍 Rechercher'}
                </button>
              </div>
              {resultats.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {resultats.map((p) => (
                    <button
                      key={p.idPersonne}
                      type="button"
                      onClick={() => {
                        // Ajoute la personne au 1er champ vide (ou crée une ligne)
                        setLignes((l) => {
                          const idx = l.findIndex((li) => !li.idPersonne && !li.nom.trim());
                          const ligne = {
                            idPersonne: p.idPersonne,
                            nom: p.nom,
                            contact: p.contact ?? '',
                            email: '',
                            adresse: '',
                            role: 'Principal',
                            idTypePersonne: p.idTypePersonne,
                            documents: [],
                          };
                          if (idx >= 0) return l.map((li, i) => (i === idx ? { ...li, ...ligne } : li));
                          return [...l.filter((li) => li.idPersonne || li.nom.trim()), { cle: Date.now(), ...ligne }];
                        });
                        setRecherche('');
                        setResultats([]);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm text-gray-700 transition-colors"
                    >
                      <span className="font-medium">{p.nom}</span>
                      {p.contact && <span className="text-gray-400 text-xs ml-2">{p.contact}</span>}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">
                La personne sélectionnée est ajoutée à la liste des demandeurs ci-dessous.
              </p>
              {erreurRecherche && (
                <p className="text-xs text-amber-600 mt-1">{erreurRecherche}</p>
              )}
            </div>
          )}

          {/* Lignes demandeurs */}
          <div className="space-y-3">
            {lignes.map((li, i) => (
              <div key={li.cle} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500">
                    Demandeur {i + 1}
                    {li.idPersonne && (
                      <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px]">
                        existante (id {li.idPersonne})
                      </span>
                    )}
                  </p>
                  {lignes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => retirerLigne(li.cle)}
                      className="text-red-500 hover:bg-red-50 px-2 py-1 rounded text-xs transition-colors"
                    >
                      ✕ Retirer
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Nom complet <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required={!li.idPersonne}
                      disabled={Boolean(li.idPersonne)}
                      value={li.nom}
                      onChange={(e) => majLigne(li.cle, { nom: e.target.value })}
                      placeholder="Nom et prénoms"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Contact</label>
                    <input
                      type="text"
                      value={li.contact}
                      onChange={(e) => majLigne(li.cle, { contact: e.target.value })}
                      placeholder="Téléphone"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Rôle</label>
                    <select
                      value={li.role}
                      onChange={(e) => majLigne(li.cle, { role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option>Principal</option>
                      <option>Mandataire</option>
                      <option>Copropriétaire</option>
                      <option>Représentant</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Type de personne</label>
                    <select
                      value={li.idTypePersonne ?? ''}
                      onChange={(e) => majLigne(li.cle, { idTypePersonne: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">— Choisir —</option>
                      {typesPersonne.map((type) => (
                        <option key={type.idTypePersonne} value={type.idTypePersonne}>{type.libelle}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                    <input
                      type="email"
                      value={li.email}
                      onChange={(e) => majLigne(li.cle, { email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Adresse</label>
                    <input
                      type="text"
                      value={li.adresse}
                      onChange={(e) => majLigne(li.cle, { adresse: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* ── Documents / photos du demandeur (personne enregistrée uniquement) ── */}
                {li.idPersonne ? (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-2">📎 Documents joints</p>
                    <DocumentsDemandeur idPersonne={li.idPersonne} nom={li.nom} compact />
                  </div>
                ) : (
                  <PersonneDocumentsPicker
                    documents={li.documents}
                    onChange={(documents) => majLigne(li.cle, { documents })}
                  />
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={ajouterLigne}
            className="mt-3 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors"
          >
            ➕ Ajouter un autre demandeur
          </button>
          <p className="text-xs text-gray-400 mt-2">
            Un nouveau demandeur est créé comme <strong>personne de type « Demandeur »</strong> — il est
            réutilisable dans les autres modules (descentes terrain, notifications…).
          </p>
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center justify-end gap-3 pb-4">
          <Link
            to="/demandes/liste"
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={!peutSoumettre || loading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium text-sm transition-colors"
          >
            {loading ? 'Enregistrement...' : edition ? 'Enregistrer les modifications' : 'Créer la demande'}
          </button>
        </div>
      </form>
    </div>
  );
}
