import { useEffect, useState, type FormEvent } from 'react';
import { geometrieService, lieuService, parcelleService, proprieteService, typeProprieteService } from '../services';
import type { EntiteCible, EntiteSelectionnee, Lieu, ProprieteType } from '../types';

// ══════════════════════════════════════════════════════════════
// Sélecteur d'entité de la carte interactive (module 4.6.1)
//
// Deux usages :
//   • localiser une propriété / parcelle existante qui n'a pas encore de
//     donnée géographique (filtre « sans géométrie » actif par défaut) ;
//   • créer directement une propriété ou une parcelle, puis la sélectionner
//     pour lui définir un emplacement sur la carte.
// ══════════════════════════════════════════════════════════════

export type TypeCible = 'propriete' | 'parcelle' | 'dossier_parcelle';

const TYPE_DEFAUT: TypeCible = 'propriete';

const LIBELLE_TYPE: Record<TypeCible, string> = {
  propriete: 'Propriété',
  parcelle: 'Parcelle',
  dossier_parcelle: 'Parcelle de dossier',
};

const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

interface SelecteurEntiteProps {
  /** Entité actuellement ciblée (null tant qu'aucune n'est choisie). */
  value: EntiteSelectionnee | null;
  onChange: (value: EntiteSelectionnee | null) => void;
  /** Appelé juste après la création d'une propriété / parcelle. */
  onEntiteCreee?: (value: EntiteSelectionnee) => void;
  /** Types proposés (défaut : propriété, parcelle, parcelle de dossier). */
  types?: TypeCible[];
  /** Affiche les boutons « créer » (défaut : true). */
  creation?: boolean;
}

/** Recherche d'une entité à localiser + création directe d'une propriété / parcelle. */
export default function SelecteurEntiteCarte({
  value,
  onChange,
  onEntiteCreee,
  types = ['propriete', 'parcelle', 'dossier_parcelle'],
  creation = true,
}: SelecteurEntiteProps) {
  const [type, setType] = useState<TypeCible>(types[0] ?? TYPE_DEFAUT);
  const [recherche, setRecherche] = useState('');
  const [sansGeometrie, setSansGeometrie] = useState(true);
  const [resultats, setResultats] = useState<EntiteCible[]>([]);
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);
  const [resultatsOuverts, setResultatsOuverts] = useState(true);
  const [modaleCreation, setModaleCreation] = useState<'propriete' | 'parcelle' | null>(null);

  // ── Recherche des entités à localiser ──
  useEffect(() => {
    if (type === 'dossier_parcelle') {
      setResultats([]);
      return;
    }
    let annule = false;
    setChargement(true);
    const timer = setTimeout(async () => {
      try {
        const data = await geometrieService.entitesCibles({
          type,
          recherche: recherche.trim(),
          inclureLocalisees: !sansGeometrie,
          limite: 30,
        });
        if (!annule) { setResultats(data); setErreur(''); }
      } catch (e) {
        if (annule) return;
        setResultats([]);
        const statut = statutHttp(e);
        setErreur(statut
          ? `Recherche indisponible (HTTP ${statut}) — le backend est-il à jour et redémarré ?`
          : 'Recherche indisponible — vérifiez la connexion au serveur.');
      } finally {
        if (!annule) setChargement(false);
      }
    }, 250);
    return () => { annule = true; clearTimeout(timer); };
  }, [type, recherche, sansGeometrie]);

  const changerType = (t: TypeCible) => {
    setType(t);
    setRecherche('');
    setResultats([]);
    setResultatsOuverts(true);
    onChange(null);
  };

  const choisir = (e: EntiteCible) => {
    const sel: EntiteSelectionnee = { type: e.type, id: e.id, label: e.libelle };
    onChange(sel);
    setRecherche(e.libelle);
    setResultatsOuverts(false);
  };

  /** Saisie directe d'un UUID pour les parcelles de dossier. */
  const saisirIdentifiant = (v: string) => {
    setRecherche(v);
    setResultatsOuverts(true);
    const identifiant = v.trim();
    if (type === 'dossier_parcelle' && UUID.test(identifiant)) {
      onChange({ type: 'dossier_parcelle', id: identifiant, label: 'Parcelle de dossier' });
    } else if (type === 'dossier_parcelle') {
      onChange(null);
    }
  };

  const entiteCreee = (sel: EntiteSelectionnee) => {
    setModaleCreation(null);
    setRecherche(sel.label);
    setResultatsOuverts(false);
    onChange(sel);
    onEntiteCreee?.(sel);
  };

  return (
    <div className="space-y-2">
      {/* Type d'entité */}
      {types.length > 1 && (
        <div className="flex gap-1 flex-wrap">
          {types.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => changerType(t)}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                type === t ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {LIBELLE_TYPE[t]}
            </button>
          ))}
        </div>
      )}

      {/* Recherche */}
      <input
        value={recherche}
        onChange={(e) => saisirIdentifiant(e.target.value)}
        placeholder={
          type === 'dossier_parcelle'
            ? 'ID UUID de la parcelle de dossier…'
            : 'Rechercher un nom, un numéro, un lieu…'
        }
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {type !== 'dossier_parcelle' && (
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={sansGeometrie}
            onChange={(e) => setSansGeometrie(e.target.checked)}
            className="accent-blue-600"
          />
          Uniquement les entités sans donnée géographique
        </label>
      )}

      {/* Résultats */}
      {resultatsOuverts && resultats.length > 0 && (
        <ListeResultats resultats={resultats} onChoisir={choisir} />
      )}
      {erreur && type !== 'dossier_parcelle' && (
        <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-2 py-1.5">{erreur}</div>
      )}
      {resultatsOuverts && !erreur && chargement && resultats.length === 0 && (
        <div className="text-[11px] text-gray-400 px-1">Recherche…</div>
      )}
      {resultatsOuverts && !erreur && !chargement && resultats.length === 0 && type !== 'dossier_parcelle' && recherche.trim().length >= 2 && (
        <div className="text-[11px] text-gray-400 px-1">
          {sansGeometrie
            ? 'Aucune entité sans géométrie trouvée pour cette recherche.'
            : 'Aucune entité trouvée.'}
        </div>
      )}

      {/* Cible retenue */}
      {value && (
        <div className="text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          Cible : <b>{value.label}</b>
          <span className="text-gray-400"> ({LIBELLE_TYPE[value.type]})</span>
        </div>
      )}

      {/* Création directe */}
      {creation && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setModaleCreation('propriete')}
            className="flex-1 px-2 py-1.5 bg-white border border-dashed border-gray-300 hover:border-blue-400 hover:text-blue-600 text-gray-600 rounded-lg text-[11px] font-medium transition-colors"
          >
            ➕ Nouvelle propriété
          </button>
          <button
            type="button"
            onClick={() => setModaleCreation('parcelle')}
            className="flex-1 px-2 py-1.5 bg-white border border-dashed border-gray-300 hover:border-blue-400 hover:text-blue-600 text-gray-600 rounded-lg text-[11px] font-medium transition-colors"
          >
            ➕ Nouvelle parcelle
          </button>
        </div>
      )}

      {modaleCreation && (
        <ModaleCreationEntite
          mode={modaleCreation}
          onClose={() => setModaleCreation(null)}
          onCree={entiteCreee}
        />
      )}
    </div>
  );
}

/** Liste des entités trouvées, avec le drapeau « déjà localisée ». */
function ListeResultats({ resultats, onChoisir }: { resultats: EntiteCible[]; onChoisir: (e: EntiteCible) => void }) {
  return (
    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-44 overflow-y-auto">
      {resultats.map((r) => (
        <button
          key={`${r.type}-${r.id}`}
          type="button"
          onClick={() => onChoisir(r)}
          className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
        >
          <div className="flex items-center gap-2">
            <span className="text-gray-800 flex-1 truncate">{r.libelle}</span>
            {r.localisee ? (
              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">localisée</span>
            ) : (
              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">sans géométrie</span>
            )}
          </div>
          {r.details && <div className="text-xs text-gray-400 truncate">{r.details}</div>}
        </button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Création d'une propriété / d'une parcelle depuis la carte
// ══════════════════════════════════════════════════════════════

function ModaleCreationEntite({
  mode,
  onClose,
  onCree,
}: {
  mode: 'propriete' | 'parcelle';
  onClose: () => void;
  onCree: (value: EntiteSelectionnee) => void;
}) {
  return (
    <div className="fixed inset-0 z-[1150] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">
            {mode === 'propriete' ? '➕ Nouvelle propriété' : '➕ Nouvelle parcelle'}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        {mode === 'propriete'
          ? <FormulairePropriete onClose={onClose} onCree={onCree} />
          : <FormulaireParcelle onClose={onClose} onCree={onCree} />}
      </div>
    </div>
  );
}

function FormulairePropriete({ onClose, onCree }: { onClose: () => void; onCree: (v: EntiteSelectionnee) => void }) {
  const [form, setForm] = useState({ nom: '', numero: '', zone: '', localisation: '', superficieTotale: '', idLieu: 0, idTypePropriete: 0 });
  const [lieux, setLieux] = useState<Lieu[]>([]);
  const [types, setTypes] = useState<ProprieteType[]>([]);
  const [erreur, setErreur] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let annule = false;
    lieuService.lister()
      .then((data) => { if (!annule) setLieux(data); })
      .catch(() => { if (!annule) setLieux([]); });
    typeProprieteService.lister()
      .then((data) => { if (!annule) setTypes(data); })
      .catch(() => { if (!annule) setTypes([]); });
    return () => { annule = true; };
  }, []);

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    setErreur('');
    if (!form.nom.trim()) { setErreur('Le nom est requis'); return; }
    if (!form.numero.trim()) { setErreur('Le numéro est requis'); return; }
    if (!form.idTypePropriete) { setErreur('Le type de propriété est requis'); return; }
    if (!form.idLieu) { setErreur('Le lieu est requis'); return; }
    const superficie = form.superficieTotale ? Number(form.superficieTotale) : undefined;
    if (superficie !== undefined && (!Number.isFinite(superficie) || superficie < 0)) {
      setErreur('La superficie doit être un nombre positif');
      return;
    }
    setSaving(true);
    try {
      const cree = await proprieteService.creer({
        nom: form.nom.trim(),
        numero: form.numero.trim(),
        zone: form.zone.trim() || undefined,
        localisation: form.localisation.trim() || undefined,
        superficieTotale: superficie,
        idLieu: form.idLieu,
        idTypePropriete: form.idTypePropriete,
      });
      onCree({ type: 'propriete', id: String(cree.idPropriete), label: cree.nom });
    } catch (err) {
      setErreur(messageErreur(err) || 'Erreur lors de la création de la propriété');
      setSaving(false);
    }
  };

  const champ = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <form onSubmit={soumettre} className="p-5 space-y-4">
      {erreur && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm border border-red-200">{erreur}</div>}

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
        <input value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} placeholder="ex : Terrain Anosizato" className={champ} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Numéro *</label>
          <input value={form.numero} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} placeholder="ex : PR-001" className={champ} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Zone</label>
          <input value={form.zone} onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))} placeholder="ex : Manazary Ilafy" className={champ} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Localisation (ville)</label>
        <input value={form.localisation} onChange={(e) => setForm((f) => ({ ...f, localisation: e.target.value }))} placeholder="ex : Antananarivo" className={champ} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Type de propriété *</label>
        <select value={form.idTypePropriete || ''} onChange={(e) => setForm((f) => ({ ...f, idTypePropriete: Number(e.target.value) }))} className={champ}>
          <option value="">— Sélectionner —</option>
          {types.map((t) => (
            <option key={t.idTypePropriete} value={t.idTypePropriete}>{t.libelle}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Superficie totale (m²)</label>
          <input type="number" step="0.001" value={form.superficieTotale} onChange={(e) => setForm((f) => ({ ...f, superficieTotale: e.target.value }))} placeholder="ex : 1250.5" className={champ} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Lieu *</label>
          <select value={form.idLieu || ''} onChange={(e) => setForm((f) => ({ ...f, idLieu: Number(e.target.value) }))} className={champ}>
            <option value="">— Sélectionner —</option>
            {lieux.map((l) => (
              <option key={l.idLieu} value={l.idLieu}>{l.libelle}{l.nomVille ? ` (${l.nomVille})` : ''}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Annuler</button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors">
          {saving ? 'Création…' : 'Créer et localiser'}
        </button>
      </div>
    </form>
  );
}

function FormulaireParcelle({ onClose, onCree }: { onClose: () => void; onCree: (v: EntiteSelectionnee) => void }) {
  const [form, setForm] = useState({ numeroLot: '', superficieM2: '', observation: '' });
  const [propriete, setPropriete] = useState<EntiteSelectionnee | null>(null);
  const [recherchePropriete, setRecherchePropriete] = useState('');
  const [proprietes, setProprietes] = useState<EntiteCible[]>([]);
  const [erreur, setErreur] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let annule = false;
    const timer = setTimeout(async () => {
      try {
        const data = await geometrieService.entitesCibles({
          type: 'propriete',
          recherche: recherchePropriete.trim(),
          inclureLocalisees: true,
          limite: 20,
        });
        if (!annule) setProprietes(data);
      } catch {
        if (!annule) setProprietes([]);
      }
    }, 250);
    return () => { annule = true; clearTimeout(timer); };
  }, [recherchePropriete]);

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    setErreur('');
    if (!propriete) { setErreur('La propriété rattachée est requise'); return; }
    const superficie = form.superficieM2 ? Number(form.superficieM2) : undefined;
    if (superficie !== undefined && (!Number.isFinite(superficie) || superficie < 0)) {
      setErreur('La superficie doit être un nombre positif');
      return;
    }
    setSaving(true);
    try {
      const cree = await parcelleService.creer({
        numeroLot: form.numeroLot.trim() || undefined,
        superficieM2: superficie,
        observation: form.observation.trim() || undefined,
        idPropriete: Number(propriete.id),
      });
      onCree({ type: 'parcelle', id: cree.idParcelle, label: cree.numeroLot || 'Parcelle' });
    } catch (err) {
      setErreur(messageErreur(err) || 'Erreur lors de la création de la parcelle');
      setSaving(false);
    }
  };

  const champ = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <form onSubmit={soumettre} className="p-5 space-y-4">
      {erreur && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm border border-red-200">{erreur}</div>}

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Propriété rattachée *</label>
        <input
          value={recherchePropriete}
          onChange={(e) => { setRecherchePropriete(e.target.value); setPropriete(null); }}
          placeholder="Rechercher une propriété…"
          className={champ}
        />
        {!propriete && proprietes.length > 0 && (
          <div className="mt-1">
            <ListeResultats
              resultats={proprietes}
              onChoisir={(p) => { setPropriete({ type: 'propriete', id: p.id, label: p.libelle }); setRecherchePropriete(p.libelle); }}
            />
          </div>
        )}
        {propriete && (
          <div className="mt-1 text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            Propriété : <b>{propriete.label}</b>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Numéro de lot</label>
          <input value={form.numeroLot} onChange={(e) => setForm((f) => ({ ...f, numeroLot: e.target.value }))} placeholder="ex : Lot 12" className={champ} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Superficie (m²)</label>
          <input type="number" step="0.001" value={form.superficieM2} onChange={(e) => setForm((f) => ({ ...f, superficieM2: e.target.value }))} placeholder="ex : 450" className={champ} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Observation</label>
        <textarea rows={2} value={form.observation} onChange={(e) => setForm((f) => ({ ...f, observation: e.target.value }))} className={champ} />
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Annuler</button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors">
          {saving ? 'Création…' : 'Créer et localiser'}
        </button>
      </div>
    </form>
  );
}

/** Statut HTTP d'une erreur axios, si présent. */
function statutHttp(e: unknown): number | undefined {
  if (e && typeof e === 'object' && 'response' in e) {
    return (e as { response?: { status?: number } }).response?.status;
  }
  return undefined;
}

/** Extrait le message d'erreur d'une réponse axios/backend. */
function messageErreur(e: unknown): string {
  if (e && typeof e === 'object' && 'response' in e) {
    const data = (e as { response?: { data?: { message?: string; error?: string } } }).response?.data;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
  }
  return '';
}
