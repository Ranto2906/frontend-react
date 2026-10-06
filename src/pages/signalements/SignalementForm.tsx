import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { signalementService, villeService, proprieteService, parcelleService, photoService } from '../../services';
import type {
  Signalement, SignalementRequest, TypeSignalement, StatutSignalement, Ville, Propriete, Parcelle, PhotoDTO,
} from '../../types';
import { composerDescriptionAvecProprieteManuelle, extraireProprieteManuelle } from '../../utils/proprieteManuelle';

export default function SignalementForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const enEdition = !!id;

  const [types, setTypes] = useState<TypeSignalement[]>([]);
  const [statuts, setStatuts] = useState<StatutSignalement[]>([]);
  const [villes, setVilles] = useState<Ville[]>([]);
  const [proprietes, setProprietes] = useState<Propriete[]>([]);
  const [parcelles, setParcelles] = useState<Parcelle[]>([]);

  const [form, setForm] = useState<SignalementRequest>({
    idTypeSignalement: 0,
    description: '',
    dateSignalement: new Date().toISOString().slice(0, 19),
    idVille: undefined,
    idPropriete: undefined,
    idParcelle: undefined,
  });
  const [sig, setSig] = useState<Signalement | null>(null);
  /** Propriété saisie manuellement (mobile, hors-ligne) — stockée en préfixe de
   *  la description (aucun champ serveur dédié) ; champ séparé à l'affichage. */
  const [proprieteManuelle, setProprieteManuelle] = useState('');
  const [loading, setLoading] = useState(enEdition);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // ── Photos du constat ──
  /** Nouvelles photos sélectionnées (fichiers à envoyer). */
  const [nouvellesPhotos, setNouvellesPhotos] = useState<File[]>([]);
  /** Photos déjà enregistrées sur le serveur (édition — affichage seul). */
  const [photosServeur, setPhotosServeur] = useState<PhotoDTO[]>([]);
  const inputPhotoRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // Référentiels
  useEffect(() => {
    (async () => {
      try {
        const [t, s, v, p] = await Promise.all([
          signalementService.listerTypes(),
          signalementService.listerStatuts(),
          villeService.listerToutes(),
          proprieteService.lister(0, 200).then((r) => r.content),
        ]);
        setTypes(t);
        setStatuts([...s].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)));
        setVilles(v);
        setProprietes(p);
      } catch {
        showToast('Erreur lors du chargement des référentiels', false);
      }
    })();
  }, []);

  // Charger le signalement en édition
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const s = await signalementService.trouverParId(id);
        setSig(s);
        // Propriété saisie manuellement (mobile) : extraite du préfixe de la
        // description pour être affichée dans son propre champ du formulaire.
        const extrait = extraireProprieteManuelle(s.description);
        setProprieteManuelle(extrait.proprieteManuelle);
        setForm({
          reference: s.reference,
          description: extrait.description,
          dateSignalement: s.dateSignalement ?? new Date().toISOString().slice(0, 19),
          idTypeSignalement: s.idTypeSignalement ?? 0,
          idStatutSignalement: s.idStatutSignalement,
          idVille: s.idVille,
          idPropriete: s.idPropriete,
          idParcelle: s.idParcelle,
        });
        if (s.idPropriete) {
          parcelleService.listerParPropriete(s.idPropriete).then(setParcelles).catch(() => undefined);
        }
        // Photos déjà jointes (édition) — affichage seul, seules les nouvelles sont envoyées.
        photoService.lister('signalement', s.idSignalement).then(setPhotosServeur).catch(() => undefined);
      } catch {
        showToast('Signalement introuvable', false);
        navigate('/signalements');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  const set = <K extends keyof SignalementRequest>(key: K, value: SignalementRequest[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onVilleChange = useCallback(async (value: string) => {
    const idVille = value ? Number(value) : undefined;
    set('idVille', idVille);
    try {
      const props = idVille
        ? await proprieteService.listerParVille(idVille)
        : await proprieteService.lister(0, 200).then((r) => r.content);
      setProprietes(props);
      set('idPropriete', undefined);
      set('idParcelle', undefined);
      setParcelles([]);
    } catch {
      // garde la liste actuelle
    }
  }, []);

  const onProprieteChange = useCallback(async (value: string) => {
    const idPropriete = value ? Number(value) : undefined;
    set('idPropriete', idPropriete);
    set('idParcelle', undefined);
    try {
      setParcelles(idPropriete ? await parcelleService.listerParPropriete(idPropriete) : []);
    } catch {
      setParcelles([]);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.idTypeSignalement) {
      showToast('Le type de signalement est obligatoire', false);
      return;
    }
    setSaving(true);
    try {
      const payload: SignalementRequest = {
        ...form,
        // Recompose le préfixe `[Propriété : X]` du mobile (saisie manuelle
        // hors-ligne) afin de conserver le format de stockage partagé.
        description: composerDescriptionAvecProprieteManuelle(proprieteManuelle, form.description || ''),
        dateSignalement: form.dateSignalement?.length === 10
          ? `${form.dateSignalement}T00:00:00`
          : form.dateSignalement,
      };
      const cree = enEdition
        ? await signalementService.modifier(id!, payload)
        : await signalementService.creer(payload);

      // Photos : envoi après création/modification (endpoint multipart dédié).
      // Un échec d'upload n'annule pas l'enregistrement du signalement.
      let photosOk = 0;
      let photosKo = 0;
      for (const fichier of nouvellesPhotos) {
        try {
          await photoService.ajouter({
            fichier,
            entiteType: 'signalement',
            entiteId: cree.idSignalement,
            typePhoto: 'constat',
          });
          photosOk += 1;
        } catch {
          photosKo += 1;
        }
      }

      const detailPhotos =
        photosKo > 0
          ? ` — ${photosKo}/${nouvellesPhotos.length} photo(s) non envoyée(s)`
          : photosOk > 0
            ? ` — ${photosOk} photo(s) envoyée(s)`
            : '';
      navigate('/signalements', {
        state: {
          toast: {
            msg: enEdition
              ? `Signalement ${cree.reference || ''} modifié${detailPhotos}`
              : `Signalement ${cree.reference || ''} créé${detailPhotos}`,
            ok: photosKo === 0,
          },
        },
      });
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Erreur lors de l'enregistrement", false);
      setSaving(false);
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

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none';
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1';

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm transition-all ${
          toast.ok ? 'bg-green-600' : 'bg-red-600'
        }`}>{toast.msg}</div>
      )}

      <div className="mb-6">
        <Link to="/signalements" className="text-gray-400 hover:text-gray-600 text-sm transition-colors">← Retour</Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-1">
          {enEdition ? `✏️ Modifier ${sig?.reference || 'le signalement'}` : '➕ Nouveau signalement'}
        </h1>
        {enEdition && sig?.reference && (
          <p className="text-gray-500 text-sm mt-1">Référence : {sig.reference}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        {/* Type — obligatoire */}
        <div>
          <label className={labelCls}>Type de signalement *</label>
          <select
            value={form.idTypeSignalement || ''}
            onChange={(e) => set('idTypeSignalement', Number(e.target.value))}
            className={inputCls}
            required
          >
            <option value="" disabled>— Choisir un type —</option>
            {types.map((t) => (
              <option key={t.idTypeSignalement} value={t.idTypeSignalement}>{t.libelle}</option>
            ))}
          </select>
        </div>

        {/* Statut (édition uniquement — la validation passe par la page détail) */}
        {enEdition && (
          <div>
            <label className={labelCls}>Statut</label>
            <select
              value={form.idStatutSignalement ?? ''}
              onChange={(e) => set('idStatutSignalement', e.target.value ? Number(e.target.value) : undefined)}
              className={inputCls}
            >
              <option value="">— Conserver le statut actuel —</option>
              {statuts.map((s) => (
                <option key={s.idStatutSignalement} value={s.idStatutSignalement}>{s.libelle}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Pour un traitement tracé (commentaire + date), utilisez la page détail.
            </p>
          </div>
        )}

        {/* Ville / Propriété / Parcelle */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Ville</label>
            <select
              value={form.idVille ?? ''}
              onChange={(e) => onVilleChange(e.target.value)}
              className={inputCls}
            >
              <option value="">— Choisir —</option>
              {villes.map((v) => (
                <option key={v.idVille} value={v.idVille}>{v.nomVille}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Propriété</label>
            <select
              value={form.idPropriete ?? ''}
              onChange={(e) => onProprieteChange(e.target.value)}
              className={inputCls}
            >
              <option value="">— Choisir —</option>
              {proprietes.map((p) => (
                <option key={p.idPropriete} value={p.idPropriete}>
                  {p.nom}{p.numero ? ` (n° ${p.numero})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Parcelle / Lot</label>
            <select
              value={form.idParcelle ?? ''}
              onChange={(e) => set('idParcelle', e.target.value || undefined)}
              className={inputCls}
              disabled={!form.idPropriete}
            >
              <option value="">— Choisir —</option>
              {parcelles.map((p) => (
                <option key={p.idParcelle} value={p.idParcelle}>
                  {p.numeroLot ? `Lot ${p.numeroLot}` : p.idParcelle.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date */}
        <div className="md:w-1/3">
          <label className={labelCls}>Date du signalement</label>
          <input
            type="date"
            value={(form.dateSignalement || '').slice(0, 10)}
            onChange={(e) => set('dateSignalement', e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Propriété saisie manuellement (mobile, hors-ligne) — champ dédié ;
            recollé en préfixe de la description à l'enregistrement. */}
        {proprieteManuelle !== '' && (
          <div>
            <label className={labelCls}>🏷️ Propriété saisie manuellement (mobile)</label>
            <input
              type="text"
              value={proprieteManuelle}
              onChange={(e) => setProprieteManuelle(e.target.value)}
              placeholder="ex : Terrain hors référentiel, saisi sur le terrain"
              className={`${inputCls} border-amber-300 bg-amber-50 text-amber-900`}
            />
            <p className="mt-1 text-xs text-gray-400">
              Saisie hors-ligne sur le mobile — conservée en préfixe de la description à l'enregistrement.
            </p>
          </div>
        )}

        {/* Description */}
        <div>
          <label className={labelCls}>Description / observation</label>
          <textarea
            value={form.description || ''}
            onChange={(e) => set('description', e.target.value)}
            rows={4}
            placeholder="Constat relevé sur le terrain..."
            className={inputCls}
          />
        </div>

        {/* Photos du constat — sélection + envoi multipart après enregistrement */}
        <div>
          <label className={labelCls}>Photos du constat</label>
          {photosServeur.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-3">
              {photosServeur.map((p) => (
                <PhotoExistante key={p.idPhoto} idPhoto={p.idPhoto} />
              ))}
            </div>
          )}
          {nouvellesPhotos.length > 0 && (
            <ul className="text-sm text-gray-600 mb-2 space-y-1">
              {nouvellesPhotos.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2">
                  <span className="truncate">📷 {f.name} <span className="text-gray-400">({Math.round(f.size / 1024)} Ko)</span></span>
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-700 text-xs"
                    onClick={() => setNouvellesPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    Retirer
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input
            ref={inputPhotoRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              const fichiers = Array.from(e.target.files || []);
              if (fichiers.length > 0) {
                setNouvellesPhotos((prev) => [...prev, ...fichiers]);
              }
              e.target.value = ''; // permet de re-sélectionner le même fichier
            }}
          />
          <button
            type="button"
            onClick={() => inputPhotoRef.current?.click()}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-lg transition-colors"
          >
            📷 Ajouter des photos
          </button>
          <p className="text-xs text-gray-400 mt-1">
            JPG, PNG, GIF ou WebP — envoyées au serveur après l'enregistrement.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Link
            to="/signalements"
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
          >
            {saving ? 'Enregistrement...' : enEdition ? 'Enregistrer les modifications' : 'Créer le signalement'}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Vignette d'une photo déjà enregistrée sur le serveur (contenu via JWT). */
function PhotoExistante({ idPhoto }: { idPhoto: string }) {
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
      <div className="w-20 h-20 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 text-[10px]">
        Illisible
      </div>
    );
  }
  if (!url) {
    return <div className="w-20 h-20 rounded-lg border border-gray-200 bg-gray-50 animate-pulse" />;
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" title="Ouvrir en grand">
      <img
        src={url}
        alt="photo du signalement"
        className="w-20 h-20 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
      />
    </a>
  );
}
