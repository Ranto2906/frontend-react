import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  avertissementService,
  personService,
  titreFoncierService,
  parcelleService,
} from '../../../services';
import type {
  Avertissement,
  AvertissementRequest,
  Personne,
  TypePersonne,
  TitreFoncier,
  Parcelle,
} from '../../../types';

// Type de personne suggéré pour un avertissement
const CODE_TYPE_AVERTI = 'AVERTI';

// ── Composant principal : Création / Modification (page entière, sans modal) ──
export default function AvertissementForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    idPersonne: '',
    idTitreFoncier: '',
    idParcelle: '',
    dateAvertissement: '',
    informationsOccupants: '',
    constats: '',
    actionsEntreprises: '',
    aFaire: '',
    mission: '',
  });

  // Référentiels
  const [titres, setTitres] = useState<TitreFoncier[]>([]);
  const [parcelles, setParcelles] = useState<Parcelle[]>([]);
  const [types, setTypes] = useState<TypePersonne[]>([]);

  // Personne existantes / nouvelle personne
  const [personnesOptions, setPersonnesOptions] = useState<Personne[]>([]);
  const [nouvellePersonne, setNouvellePersonne] = useState(false);
  const [np, setNp] = useState({ nom: '', contact: '', adresse: '', idTypePersonne: '' });
  const [typeTouch, setTypeTouch] = useState(false);
  const [creatingPersonne, setCreatingPersonne] = useState(false);
  const [npMsg, setNpMsg] = useState<{ msg: string; ok: boolean } | null>(null);

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
      .then((t) => {
        setTypes(t);
        // Type suggéré : « Personne avertie »
        const averti = t.find((x) => x.code === CODE_TYPE_AVERTI);
        if (averti) {
          setNp((prev) => ({ ...prev, idTypePersonne: String(averti.idTypePersonne) }));
        }
      })
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

  // ── Mode édition : charger l'avertissement ──
  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    avertissementService
      .trouverParId(id)
      .then((a) => {
        setForm({
          idPersonne: a.idPersonne != null ? String(a.idPersonne) : '',
          idTitreFoncier: a.idTitreFoncier || '',
          idParcelle: a.idParcelle || '',
          dateAvertissement: a.dateAvertissement || '',
          informationsOccupants: a.informationsOccupants || '',
          constats: a.constats || '',
          actionsEntreprises: a.actionsEntreprises || '',
          aFaire: a.aFaire || '',
          mission: a.mission || '',
        });
        return a.idTitreFoncier;
      })
      .then((idTitre) => {
        if (idTitre) return chargerParcelles(idTitre);
      })
      .catch(() => setError('Impossible de charger l’avertissement'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  const handleTitreChange = (idTitre: string) => {
    set('idTitreFoncier', idTitre);
    set('idParcelle', '');
    chargerParcelles(idTitre);
  };

  // ── Nouvelle personne (checkbox) : créer puis sélectionner ──
  const creerEtSelectionnerPersonne = async () => {
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
        role: 'Averti',
        idTypePersonne: np.idTypePersonne ? Number(np.idTypePersonne) : undefined,
      });
      // La nouvelle personne est sélectionnée comme « personne avertie »
      setPersonnesOptions((prev) =>
        prev.some((x) => x.idPersonne === p.idPersonne) ? prev : [...prev, p]
      );
      set('idPersonne', String(p.idPersonne));
      setNp({ nom: '', contact: '', adresse: '', idTypePersonne: '' });
      const averti = types.find((x) => x.code === CODE_TYPE_AVERTI);
      if (averti && !typeTouch) {
        setNp((prev) => ({ ...prev, idTypePersonne: String(averti.idTypePersonne) }));
      }
      setTypeTouch(false);
      setNouvellePersonne(false); // retour à la sélection, personne déjà choisie
      setNpMsg({ msg: `✓ « ${p.nom} » créée et sélectionnée comme personne avertie`, ok: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la création de la personne';
      setNpMsg({ msg, ok: false });
    } finally {
      setCreatingPersonne(false);
    }
  };

  // ── Soumission ──
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.idPersonne) return setError('La personne est obligatoire');
    if (!form.idTitreFoncier) return setError('Le titre foncier est obligatoire');
    if (!form.idParcelle) return setError('La parcelle est obligatoire');

    const anneeSource = form.dateAvertissement
      ? Number(form.dateAvertissement.substring(0, 4))
      : new Date().getFullYear();

    const payload: AvertissementRequest = {
      dateAvertissement: form.dateAvertissement || undefined,
      annee: Number.isNaN(anneeSource) ? undefined : anneeSource,
      informationsOccupants: form.informationsOccupants.trim() || undefined,
      constats: form.constats.trim() || undefined,
      actionsEntreprises: form.actionsEntreprises.trim() || undefined,
      aFaire: form.aFaire.trim() || undefined,
      mission: form.mission.trim() || undefined,
      idPersonne: Number(form.idPersonne),
      idParcelle: form.idParcelle,
      idTitreFoncier: form.idTitreFoncier,
    };

    setSaving(true);
    try {
      if (isEdit && id) {
        await avertissementService.modifier(id, payload);
        navigate(`/suivi-notifications/avertissements/${id}`, {
          state: { toast: { msg: 'Avertissement mis à jour', ok: true } },
        });
      } else {
        await avertissementService.creer(payload);
        navigate('/suivi-notifications/avertissements', {
          state: { toast: { msg: 'Avertissement créé avec succès', ok: true } },
        });
      }
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
        <Link
          to="/suivi-notifications"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          Suivi & Notifications
        </Link>
        <span className="text-gray-300">/</span>
        <Link
          to="/suivi-notifications/avertissements"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          Avertissements
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">
          {isEdit ? 'Modifier l’avertissement' : 'Nouvel avertissement'}
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* En-tête de page */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {isEdit
                  ? "✏️ Modifier l'avertissement"
                  : "➕ Nouvel avertissement"}
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {isEdit
                  ? "Corrigez les informations puis enregistrez — l'historique gardera la trace."
                  : "Renseignez la personne avertie, le titre foncier et les constats."}
              </p>
            </div>
            <Link
              to={isEdit ? `/suivi-notifications/avertissements/${id}` : '/suivi-notifications/avertissements'}
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
                  <label className={labelCls}>Personne avertie *</label>
                  <div className="space-y-2">
                    {nouvellePersonne ? (
                      <div className="space-y-2 rounded-lg border border-red-200 bg-red-50/50 p-2">
                        <input
                          type="text"
                          value={np.nom}
                          onChange={(e) => setNp((f) => ({ ...f, nom: e.target.value }))}
                          placeholder="Nom complet de la nouvelle personne *"
                          className={champCls + ' bg-white'}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={np.contact}
                            onChange={(e) => setNp((f) => ({ ...f, contact: e.target.value }))}
                            placeholder="Contact (téléphone)"
                            className={champCls + ' bg-white'}
                          />
                          <input
                            type="text"
                            value={np.adresse}
                            onChange={(e) => setNp((f) => ({ ...f, adresse: e.target.value }))}
                            placeholder="Adresse"
                            className={champCls + ' bg-white'}
                          />
                        </div>
                        <div className="flex items-start gap-2">
                          <select
                            value={np.idTypePersonne}
                            onChange={(e) => {
                              setNp((f) => ({ ...f, idTypePersonne: e.target.value }));
                              setTypeTouch(true);
                            }}
                            className={champCls + ' bg-white flex-1'}
                          >
                            <option value="">Type de personne (auto)</option>
                            {types.map((t) => (
                              <option key={t.idTypePersonne} value={t.idTypePersonne}>
                                {t.libelle}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={creerEtSelectionnerPersonne}
                            disabled={creatingPersonne || !np.nom.trim()}
                            className="px-3 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                          >
                            {creatingPersonne ? 'Création...' : '👤 Créer & sélectionner'}
                          </button>
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
                      <select
                        value={form.idPersonne}
                        onChange={(e) => set('idPersonne', e.target.value)}
                        className={champCls}
                      >
                        <option value="">— Sélectionner —</option>
                        {personnesOptions.map((p) => (
                          <option key={p.idPersonne} value={p.idPersonne}>
                            {p.nom}
                            {p.libelleTypePersonne ? ` (${p.libelleTypePersonne})` : p.role ? ` (${p.role})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                    <label className="flex items-center gap-2 text-xs font-medium text-red-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={nouvellePersonne}
                        onChange={(e) => {
                          setNouvellePersonne(e.target.checked);
                          if (e.target.checked) setNpMsg(null);
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      La personne n'existe pas encore — la créer
                    </label>
                  </div>
                </div>

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
              </div>
            </section>

            {/* ── Date ── */}
            <section>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
                📅 Date
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
                <div>
                  <label className={labelCls}>Date de l'avertissement</label>
                  <input
                    type="date"
                    value={form.dateAvertissement}
                    onChange={(e) => set('dateAvertissement', e.target.value)}
                    className={champCls}
                  />
                </div>
              </div>
            </section>

            {/* ── Textes ── */}
            <section>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
                📝 Constatations & actions
              </h2>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Informations occupants</label>
                  <textarea
                    rows={2}
                    value={form.informationsOccupants}
                    onChange={(e) => set('informationsOccupants', e.target.value)}
                    placeholder="Situation des occupants..."
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
                    <label className={labelCls}>Actions entreprises</label>
                    <textarea
                      rows={3}
                      value={form.actionsEntreprises}
                      onChange={(e) => set('actionsEntreprises', e.target.value)}
                      placeholder="Mesures prises..."
                      className={champCls}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>À faire</label>
                    <textarea
                      rows={2}
                      value={form.aFaire}
                      onChange={(e) => set('aFaire', e.target.value)}
                      placeholder="Prochaines actions..."
                      className={champCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Mission</label>
                    <textarea
                      rows={2}
                      value={form.mission}
                      onChange={(e) => set('mission', e.target.value)}
                      placeholder="Objet / mission de l'avertissement..."
                      className={champCls}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ── Actions ── */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Link
                to={
                  isEdit
                    ? `/suivi-notifications/avertissements/${id}`
                    : '/suivi-notifications/avertissements'
                }
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors"
              >
                {saving
                  ? 'Enregistrement...'
                  : isEdit
                  ? '💾 Enregistrer les modifications'
                  : '💾 Créer l’avertissement'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
