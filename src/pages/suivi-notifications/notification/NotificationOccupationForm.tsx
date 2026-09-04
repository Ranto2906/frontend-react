import { useState, useEffect, useCallback, useRef, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  notificationOccupationService,
  personService,
  photoService,
  titreFoncierService,
  parcelleService,
} from '../../../services';
import type {
  NotificationOccupation,
  NotificationOccupationRequest,
  Personne,
  TypePersonne,
  TitreFoncier,
  Parcelle,
} from '../../../types';

// ── Options ──
const STATUT_OPTIONS = ['En cours', 'Traité', 'Clôturée'];
const ROLE_NOTIF_OPTIONS = ['Notifié', 'Occupant', 'Propriétaire', 'Mandataire', 'Tiers'];

// Type de personne suggéré selon le rôle dans la notification
const ROLE_TYPE_CODES: Record<string, string> = {
  'Notifié': 'NOTIFIE',
  'Occupant': 'OCCUPANT',
  'Propriétaire': 'PROPRIETAIRE',
  'Mandataire': 'MANDATAIRE',
};

// Types de photo proposés lors d'une pièce jointe
const TYPE_PHOTO_OPTIONS = [
  { value: 'date_notification', label: '📷 À la date de notification' },
  { value: 'constatation', label: '📷 À la date de constatation' },
  { value: 'photo_suivi', label: '📷 À la date de suivi' },
  { value: 'satellite_apres', label: '🛰️ Satellite après construction' },
  { value: 'satellite_avant', label: '🛰️ Satellite avant construction' },
];

const AUJOURD_HUI = () => new Date().toISOString().substring(0, 10);

// Photo en attente d'envoi (sélectionnée dans le formulaire)
type PhotoAjout = {
  key: string;
  fichier: File;
  apercuUrl: string;
  typePhoto: string;
  datePrise: string;
  observation: string;
  statut: 'attente' | 'envoi' | 'ok' | 'echec';
};

// Personne liée dans le formulaire
type PersonneLiee = {
  idPersonne: number;
  nomPersonne: string;
  role: string;
};

// ── Composant principal : Création / Modification (page entière, sans modal) ──
export default function NotificationOccupationForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    statut: 'En cours',
    idTitreFoncier: '',
    idParcelle: '',
    dateNotification: '',
    dateConvocation: '',
    informationsOccupants: '',
    constats: '',
    doleances: '',
    actionsEntreprises: '',
  });
  const [personnesLiees, setPersonnesLiees] = useState<PersonneLiee[]>([]);

  // Référentiels
  const [titres, setTitres] = useState<TitreFoncier[]>([]);
  const [parcelles, setParcelles] = useState<Parcelle[]>([]);
  const [types, setTypes] = useState<TypePersonne[]>([]);

  // Personnes existantes / nouvelle personne
  const [personnesOptions, setPersonnesOptions] = useState<Personne[]>([]);
  const [personneSel, setPersonneSel] = useState('');
  const [roleSel, setRoleSel] = useState('Notifié');
  const [nouvellePersonne, setNouvellePersonne] = useState(false);
  const [np, setNp] = useState({ nom: '', contact: '', adresse: '', idTypePersonne: '' });
  const [typeTouch, setTypeTouch] = useState(false);
  const [creatingPersonne, setCreatingPersonne] = useState(false);
  const [npMsg, setNpMsg] = useState<{ msg: string; ok: boolean } | null>(null);

  // Photos à joindre
  const [photosAjout, setPhotosAjout] = useState<PhotoAjout[]>([]);
  const fichierRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<PhotoAjout[]>([]);

  useEffect(() => {
    photosRef.current = photosAjout;
  }, [photosAjout]);

  // Libère les aperçus objet quand on quitte le formulaire
  useEffect(() => {
    return () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.apercuUrl));
  }, []);

  const set = (field: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  // ── Charger les référentiels ──
  useEffect(() => {
    titreFoncierService
      .lister(0, 500)
      .then((d) => setTitres(d.content))
      .catch(() => setError('Impossible de charger les titres fonciers'));
    personService
      .lister(0, 1000)
      .then((d) => setPersonnesOptions(d.content))
      .catch(() => {});
    personService
      .listerTypes()
      .then(setTypes)
      .catch(() => {});
  }, []);

  const chargerParcelles = useCallback(async (idTitre: string) => {
    if (!idTitre) {
      setParcelles([]);
      return;
    }
    try {
      const data = await parcelleService.listerParTitreFoncier(idTitre);
      setParcelles(data);
    } catch {
      setParcelles([]);
    }
  }, []);

  // ── Mode édition : charger la notification ──
  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    notificationOccupationService
      .trouverParId(id)
      .then((n) => {
        setForm({
          statut: n.statut || 'En cours',
          idTitreFoncier: n.idTitreFoncier || '',
          idParcelle: n.idParcelle || '',
          dateNotification: n.dateNotification || '',
          dateConvocation: n.dateConvocation ? n.dateConvocation.substring(0, 16) : '',
          informationsOccupants: n.informationsOccupants || '',
          constats: n.constats || '',
          doleances: n.doleances || '',
          actionsEntreprises: n.actionsEntreprises || '',
        });
        setPersonnesLiees(
          n.personnes?.map((p) => ({
            idPersonne: p.idPersonne,
            nomPersonne: p.nomPersonne || `Personne #${p.idPersonne}`,
            role: p.roleDansNotification || 'Notifié',
          })) || []
        );
        return n.idTitreFoncier;
      })
      .then((idTitre) => {
        if (idTitre) return chargerParcelles(idTitre);
      })
      .catch(() => setError('Impossible de charger la notification'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  const handleTitreChange = (idTitre: string) => {
    set('idTitreFoncier', idTitre);
    set('idParcelle', '');
    chargerParcelles(idTitre);
  };

  // ── Personnes existantes ──
  const ajouterPersonneExistante = () => {
    if (!personneSel) return;
    const p = personnesOptions.find((x) => x.idPersonne === Number(personneSel));
    if (!p) return;
    if (personnesLiees.some((x) => x.idPersonne === p.idPersonne)) {
      setError('Cette personne est déjà liée à la notification');
      return;
    }
    setPersonnesLiees((prev) => [
      ...prev,
      { idPersonne: p.idPersonne, nomPersonne: p.nom, role: roleSel },
    ]);
    setPersonneSel('');
    setRoleSel('Notifié');
    setError('');
  };

  // Type suggéré automatiquement selon le rôle (si l'utilisateur n'a rien choisi)
  useEffect(() => {
    if (!nouvellePersonne || typeTouch) return;
    const code = ROLE_TYPE_CODES[roleSel];
    if (!code) return;
    const t = types.find((x) => x.code === code);
    if (t && String(t.idTypePersonne) !== np.idTypePersonne) {
      setNp((prev) => ({ ...prev, idTypePersonne: String(t.idTypePersonne) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nouvellePersonne, roleSel, types]);

  // ── Nouvelle personne (checkbox) : créer puis lier ──
  const creerEtLierPersonne = async () => {
    setNpMsg(null);
    setError('');
    if (!np.nom.trim()) {
      setNpMsg({ msg: 'Le nom de la personne est obligatoire', ok: false });
      return;
    }
    setCreatingPersonne(true);
    try {
      const p = await personService.creer({
        nom: np.nom.trim(),
        contact: np.contact.trim() || undefined,
        adresse: np.adresse.trim() || undefined,
        role: roleSel,
        idTypePersonne: np.idTypePersonne ? Number(np.idTypePersonne) : undefined,
      });
      if (!personnesLiees.some((x) => x.idPersonne === p.idPersonne)) {
        setPersonnesLiees((prev) => [
          ...prev,
          { idPersonne: p.idPersonne, nomPersonne: p.nom, role: roleSel },
        ]);
      }
      // La nouvelle personne devient sélectionnable pour d'autres notifications
      setPersonnesOptions((prev) =>
        prev.some((x) => x.idPersonne === p.idPersonne) ? prev : [...prev, p]
      );
      setNp({ nom: '', contact: '', adresse: '', idTypePersonne: '' });
      setTypeTouch(false);
      setNpMsg({ msg: `✓ « ${p.nom} » créée et liée comme « ${roleSel} »`, ok: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la création de la personne";
      setNpMsg({ msg, ok: false });
    } finally {
      setCreatingPersonne(false);
    }
  };

  const retirerPersonne = (idPersonne: number) =>
    setPersonnesLiees((prev) => prev.filter((x) => x.idPersonne !== idPersonne));

  // ── Photos : sélection / édition / retrait ──
  const handleFichiers = (e: ChangeEvent<HTMLInputElement>) => {
    const fichiers = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    if (fichiers.length === 0) return;
    const nouveaux: PhotoAjout[] = fichiers.map((f) => ({
      key: Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
      fichier: f,
      apercuUrl: URL.createObjectURL(f),
      typePhoto: 'constatation',
      datePrise: AUJOURD_HUI(),
      observation: '',
      statut: 'attente',
    }));
    setPhotosAjout((prev) => [...prev, ...nouveaux]);
    e.target.value = ''; // permet de re-sélectionner le même fichier
  };

  const majPhoto = (key: string, patch: Partial<PhotoAjout>) =>
    setPhotosAjout((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  const retirerPhoto = (key: string) => {
    setPhotosAjout((prev) => {
      const photo = prev.find((p) => p.key === key);
      if (photo) URL.revokeObjectURL(photo.apercuUrl);
      return prev.filter((p) => p.key !== key);
    });
  };

  // ── Soumission ──
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.idTitreFoncier) return setError('Le titre foncier est obligatoire');
    if (!form.idParcelle) return setError('La parcelle est obligatoire');
    if (!form.statut) return setError('Le statut est obligatoire');

    const anneeSource = form.dateNotification
      ? Number(form.dateNotification.substring(0, 4))
      : new Date().getFullYear();

    const payload: NotificationOccupationRequest = {
      statut: form.statut,
      idTitreFoncier: form.idTitreFoncier,
      idParcelle: form.idParcelle,
      dateNotification: form.dateNotification || undefined,
      annee: Number.isNaN(anneeSource) ? undefined : anneeSource,
      dateConvocation: form.dateConvocation || undefined,
      informationsOccupants: form.informationsOccupants.trim() || undefined,
      constats: form.constats.trim() || undefined,
      doleances: form.doleances.trim() || undefined,
      actionsEntreprises: form.actionsEntreprises.trim() || undefined,
      personnes:
        personnesLiees.length > 0
          ? personnesLiees.map((p) => ({ idPersonne: p.idPersonne, roleDansNotification: p.role }))
          : undefined,
    };

    setSaving(true);
    try {
      let entiteId: string;
      if (isEdit && id) {
        await notificationOccupationService.modifier(id, payload);
        entiteId = id;
      } else {
        const cree = await notificationOccupationService.creer(payload);
        entiteId = cree.idNotification;
      }

      // Joindre les photos sélectionnées (une par une, avec son observation)
      let echecsPhotos = 0;
      const totalPhotos = photosAjout.length;
      for (const ph of photosAjout) {
        majPhoto(ph.key, { statut: 'envoi' });
        try {
          await photoService.ajouter({
            fichier: ph.fichier,
            entiteType: 'notification',
            entiteId,
            typePhoto: ph.typePhoto,
            datePrise: ph.datePrise || undefined,
            observation: ph.observation.trim() || undefined,
          });
          majPhoto(ph.key, { statut: 'ok' });
        } catch {
          echecsPhotos += 1;
          majPhoto(ph.key, { statut: 'echec' });
        }
      }

      // Message final (succès / échecs photos éventuels)
      let msg = isEdit ? 'Notification mise à jour' : 'Notification créée avec succès';
      let ok = true;
      if (totalPhotos > 0) {
        if (echecsPhotos === 0) {
          msg += ` — ${totalPhotos} photo${totalPhotos > 1 ? 's' : ''} jointe${totalPhotos > 1 ? 's' : ''}`;
        } else if (echecsPhotos === totalPhotos) {
          msg = `${msg}, mais aucune photo n'a pu être jointe`;
          ok = false;
        } else {
          msg += ` — ${echecsPhotos} photo${echecsPhotos > 1 ? 's' : ''} non jointe${echecsPhotos > 1 ? 's' : ''}`;
          ok = false;
        }
      }

      navigate(
        isEdit && id
          ? `/suivi-notifications/occupation/${id}`
          : '/suivi-notifications/occupation',
        { state: { toast: { msg, ok } } }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'enregistrement";
      setError(msg);
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

  const champCls =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Fil d'Ariane */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link to="/suivi-notifications" className="text-gray-400 hover:text-gray-600 transition-colors">
          Suivi & Notifications
        </Link>
        <span className="text-gray-300">/</span>
        <Link
          to="/suivi-notifications/occupation"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          Notification Occupation
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">
          {isEdit ? 'Modifier la notification' : 'Nouvelle notification'}
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* En-tête de page */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {isEdit ? '✏️ Modifier la notification d\u2019occupation' : '➕ Nouvelle notification d\u2019occupation'}
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {isEdit
                  ? "Corrigez les informations puis enregistrez — l'historique gardera la trace."
                  : 'Renseignez le titre foncier, les dates et les personnes concernées.'}
              </p>
            </div>
            <Link
              to={isEdit ? `/suivi-notifications/occupation/${id}` : '/suivi-notifications/occupation'}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors"
            >
              ← Annuler
            </Link>
          </div>

          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm border border-red-200">
                {error}
              </div>
            )}

            {/* ── Références ── */}
            <section>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
                🗂️ Références
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Titre foncier *</label>
                  <select
                    value={form.idTitreFoncier}
                    onChange={(e) => handleTitreChange(e.target.value)}
                    className={champCls}
                  >
                    <option value="">— Sélectionner —</option>
                    {titres.map((t) => (
                      <option key={t.idTitreFoncier} value={t.idTitreFoncier}>
                        TF n° {t.numero}
                        {t.nomPropriete ? ` — ${t.nomPropriete}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Parcelle *</label>
                  <select
                    value={form.idParcelle}
                    onChange={(e) => set('idParcelle', e.target.value)}
                    disabled={!form.idTitreFoncier}
                    className={champCls}
                  >
                    <option value="">— Sélectionner —</option>
                    {parcelles.map((p) => (
                      <option key={p.idParcelle} value={p.idParcelle}>
                        Lot n° {p.numeroLot || '—'}
                        {p.superficieM2 != null ? ` (${p.superficieM2.toLocaleString('fr-FR')} m²)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Statut *</label>
                  <select
                    value={form.statut}
                    onChange={(e) => set('statut', e.target.value)}
                    className={champCls}
                  >
                    <option value="">— Sélectionner —</option>
                    {form.statut && !STATUT_OPTIONS.includes(form.statut) && (
                      <option value={form.statut}>{form.statut}</option>
                    )}
                    {STATUT_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* ── Dates ── */}
            <section>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
                📅 Dates
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Date de notification</label>
                  <input
                    type="date"
                    value={form.dateNotification}
                    onChange={(e) => set('dateNotification', e.target.value)}
                    className={champCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Date de convocation</label>
                  <input
                    type="datetime-local"
                    value={form.dateConvocation}
                    onChange={(e) => set('dateConvocation', e.target.value)}
                    className={champCls}
                  />
                </div>
              </div>
            </section>

            {/* ── Textes ── */}
            <section>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
                📝 Constatations & observations
              </h2>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Informations occupants</label>
                  <textarea
                    rows={2}
                    value={form.informationsOccupants}
                    onChange={(e) => set('informationsOccupants', e.target.value)}
                    placeholder="Nom des occupants, situation..."
                    className={champCls}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Constats</label>
                    <textarea
                      rows={3}
                      value={form.constats}
                      onChange={(e) => set('constats', e.target.value)}
                      placeholder="Constat sur le terrain..."
                      className={champCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Doléances</label>
                    <textarea
                      rows={3}
                      value={form.doleances}
                      onChange={(e) => set('doleances', e.target.value)}
                      placeholder="Doléances des occupants..."
                      className={champCls}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Actions entreprises</label>
                  <textarea
                    rows={2}
                    value={form.actionsEntreprises}
                    onChange={(e) => set('actionsEntreprises', e.target.value)}
                    placeholder="Mesures prises..."
                    className={champCls}
                  />
                </div>
              </div>
            </section>

            {/* ── Photos jointes ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                  🖼️ Photos jointes
                </h2>
                {photosAjout.length > 0 && (
                  <button
                    type="button"
                    onClick={() => fichierRef.current?.click()}
                    className="text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    📷 Ajouter d'autres photos
                  </button>
                )}
              </div>

              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <input
                  ref={fichierRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFichiers}
                />

                {photosAjout.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => fichierRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg py-8 text-center text-gray-400 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-colors text-sm"
                  >
                    📷 Cliquez ici pour joindre une ou plusieurs photos
                  </button>
                ) : (
                  <div className="space-y-3">
                    {photosAjout.map((ph) => (
                      <div
                        key={ph.key}
                        className="flex gap-3 bg-white border border-gray-200 rounded-lg p-3"
                      >
                        <img
                          src={ph.apercuUrl}
                          alt={`Aperçu ${ph.fichier.name}`}
                          className="w-24 h-20 object-cover rounded-lg border border-gray-200 shrink-0"
                        />
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2">
                            <p
                              className="text-xs font-medium text-gray-700 truncate flex-1"
                              title={ph.fichier.name}
                            >
                              {ph.fichier.name}
                            </p>
                            {ph.statut === 'ok' && (
                              <span className="text-green-600 text-xs font-medium shrink-0">
                                ✓ jointe
                              </span>
                            )}
                            {ph.statut === 'envoi' && (
                              <span className="text-blue-600 text-xs font-medium shrink-0 animate-pulse">
                                Envoi…
                              </span>
                            )}
                            {ph.statut === 'echec' && (
                              <span className="text-red-600 text-xs font-medium shrink-0">
                                Échec
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => retirerPhoto(ph.key)}
                              title="Retirer cette photo"
                              disabled={ph.statut === 'envoi'}
                              className="w-6 h-6 rounded-full hover:bg-red-100 text-red-500 flex items-center justify-center text-xs shrink-0 transition-colors disabled:opacity-40"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <select
                              value={ph.typePhoto}
                              onChange={(e) => majPhoto(ph.key, { typePhoto: e.target.value })}
                              className={champCls}
                            >
                              {TYPE_PHOTO_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                            <input
                              type="date"
                              value={ph.datePrise}
                              onChange={(e) => majPhoto(ph.key, { datePrise: e.target.value })}
                              className={champCls}
                            />
                          </div>
                          <input
                            type="text"
                            value={ph.observation}
                            onChange={(e) =>
                              majPhoto(ph.key, { observation: e.target.value })
                            }
                            placeholder="Observation / légende de la photo…"
                            className={champCls}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-[11px] text-gray-400 italic mt-3">
                  Les photos seront jointes à la notification lors de l'enregistrement
                  (formats JPG, PNG, GIF ou WEBP).
                </p>
              </div>
            </section>

            {/* ── Personnes liées ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                  👥 Personnes liées à la notification
                </h2>
                <label className="inline-flex items-center gap-2 text-xs font-medium text-blue-700 cursor-pointer select-none bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={nouvellePersonne}
                    onChange={(e) => setNouvellePersonne(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  La personne n'existe pas encore — la créer
                </label>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
                {nouvellePersonne ? (
                  /* ── Formulaire de création d'une nouvelle personne ── */
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <input
                        type="text"
                        value={np.nom}
                        onChange={(e) => setNp((f) => ({ ...f, nom: e.target.value }))}
                        placeholder="Nom complet de la nouvelle personne *"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                      />
                      <select
                        value={roleSel}
                        onChange={(e) => setRoleSel(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                        title="Rôle dans cette notification"
                      >
                        {ROLE_NOTIF_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={creerEtLierPersonne}
                        disabled={creatingPersonne || !np.nom.trim()}
                        className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                      >
                        {creatingPersonne ? 'Création...' : '👤 Créer & lier'}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={np.contact}
                        onChange={(e) => setNp((f) => ({ ...f, contact: e.target.value }))}
                        placeholder="Contact (téléphone)"
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                      />
                      <input
                        type="text"
                        value={np.adresse}
                        onChange={(e) => setNp((f) => ({ ...f, adresse: e.target.value }))}
                        placeholder="Adresse"
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                      />
                      <select
                        value={np.idTypePersonne}
                        onChange={(e) => {
                          setNp((f) => ({ ...f, idTypePersonne: e.target.value }));
                          setTypeTouch(true);
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                      >
                        <option value="">Type de personne (auto)</option>
                        {types.map((t) => (
                          <option key={t.idTypePersonne} value={t.idTypePersonne}>
                            {t.libelle}
                          </option>
                        ))}
                      </select>
                    </div>
                    {npMsg && (
                      <p
                        className={`text-xs px-3 py-1.5 rounded-lg ${
                          npMsg.ok
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {npMsg.msg}
                      </p>
                    )}
                  </div>
                ) : (
                  /* ── Sélection d'une personne existante ── */
                  <div className="flex items-start gap-2">
                    <select
                      value={personneSel}
                      onChange={(e) => setPersonneSel(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                    >
                      <option value="">— Personne existante —</option>
                      {personnesOptions.map((p) => (
                        <option key={p.idPersonne} value={p.idPersonne}>
                          {p.nom}
                          {p.libelleTypePersonne ? ` (${p.libelleTypePersonne})` : p.role ? ` (${p.role})` : ''}
                        </option>
                      ))}
                    </select>
                    <select
                      value={roleSel}
                      onChange={(e) => setRoleSel(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                    >
                      {ROLE_NOTIF_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={ajouterPersonneExistante}
                      disabled={!personneSel}
                      className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors"
                    >
                      ➕ Ajouter
                    </button>
                  </div>
                )}

                {/* Personnes déjà liées */}
                {personnesLiees.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">
                    Aucune personne liée pour le moment.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {personnesLiees.map((p) => (
                      <span
                        key={p.idPersonne}
                        className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full pl-3 pr-1.5 py-1 text-xs text-gray-700"
                      >
                        <span className="font-medium">{p.nomPersonne}</span>
                        <span className="text-gray-400">·</span>
                        <span className="text-blue-600">{p.role}</span>
                        <button
                          type="button"
                          onClick={() => retirerPersonne(p.idPersonne)}
                          title="Retirer"
                          className="w-5 h-5 rounded-full hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* ── Actions ── */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Link
                to={
                  isEdit
                    ? `/suivi-notifications/occupation/${id}`
                    : '/suivi-notifications/occupation'
                }
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
              >
                {saving ? 'Enregistrement...' : isEdit ? '💾 Enregistrer les modifications' : '💾 Créer la notification'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
