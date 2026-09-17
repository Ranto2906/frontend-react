import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { signalementService, villeService, proprieteService, parcelleService } from '../../services';
import type {
  Signalement, SignalementRequest, TypeSignalement, StatutSignalement, Ville, Propriete, Parcelle,
} from '../../types';

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
  const [loading, setLoading] = useState(enEdition);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

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
        setForm({
          reference: s.reference,
          description: s.description ?? '',
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
        dateSignalement: form.dateSignalement?.length === 10
          ? `${form.dateSignalement}T00:00:00`
          : form.dateSignalement,
      };
      const cree = enEdition
        ? await signalementService.modifier(id!, payload)
        : await signalementService.creer(payload);
      navigate('/signalements', {
        state: {
          toast: {
            msg: enEdition
              ? `Signalement ${cree.reference || ''} modifié`
              : `Signalement ${cree.reference || ''} créé`,
            ok: true,
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
