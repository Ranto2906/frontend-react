import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { statistiqueService } from '../../services';
import type { Repartition, TableauBord } from '../../types';
import { Section, BarresRepartition, Donut, GraphiqueMensuel, Jauge } from './Graphiques';

// ══════════════════════════════════════════════════════════════
// Tableau de bord — synthèse complète du patrimoine foncier
// ══════════════════════════════════════════════════════════════

/** Libellés des types d'entité géométrique (colonne entite_type). */
const LIBELLES_GEO: Record<string, string> = {
  propriete: 'Propriétés',
  parcelle: 'Parcelles',
  dossier_parcelle: 'Parcelles de dossier',
  titre_foncier: 'Titres fonciers',
  signalement: 'Signalements',
  descente_terrain: 'Descentes terrain',
};

/** Couleurs des couches de la carte (reprise de la légende Carte.tsx). */
const COULEURS_GEO: Record<string, string> = {
  propriete: '#2563eb',
  parcelle: '#16a34a',
  dossier_parcelle: '#f59e0b',
  titre_foncier: '#7c3aed',
  signalement: '#a13a2c',
  descente_terrain: '#0d9488',
};

/** Couleurs des validations de descente terrain. */
const COULEURS_VALIDATION: Record<string, string> = {
  'En attente': '#f59e0b',
  Valide: '#16a34a',
  Rejete: '#dc2626',
  'Complement demande': '#2563eb',
};

const COULEUR_NOTIF = '#f59e0b';

/** Styles des bandeaux d'alerte (niveau calculé côté backend). */
const ALERTES_STYLES: Record<string, string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-700',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  danger: 'bg-red-50 border-red-200 text-red-700',
};

/** Icône d'un bandeau d'alerte selon son niveau. */
const ALERTES_ICONES: Record<string, string> = { info: 'ℹ️', warning: '⚠️', danger: '🚨' };

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<TableauBord | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [filtresAppliques, setFiltresAppliques] = useState({ dateDebut: '', dateFin: '' });

  const charger = useCallback(async () => {
    setLoading(true);
    setErreur(null);
    try {
      setStats(await statistiqueService.tableauBord({
        dateDebut: filtresAppliques.dateDebut || undefined,
        dateFin: filtresAppliques.dateFin || undefined,
      }));
    } catch {
      setErreur('Impossible de charger les statistiques du tableau de bord');
    } finally {
      setLoading(false);
    }
  }, [filtresAppliques]);

  useEffect(() => { charger(); }, [charger]);

  function appliquerFiltre(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dateDebut && dateFin && dateDebut > dateFin) {
      setErreur('La date de début doit être antérieure ou égale à la date de fin');
      return;
    }
    setFiltresAppliques({ dateDebut, dateFin });
  }

  function reinitialiserFiltre() {
    setDateDebut('');
    setDateFin('');
    setFiltresAppliques({ dateDebut: '', dateFin: '' });
  }

  /** true dès qu'une borne de période est saisie (en-tête + titre du graphique). */
  const periodeActive = Boolean(filtresAppliques.dateDebut || filtresAppliques.dateFin);

  // ── Cartes KPI ──
  const k = stats?.kpi;
  const cartes = k ? [
    { label: 'Dossiers', valeur: nombre(k.nbDossiers),
      detail: `${nombre(k.nbDossiersEnCours)} en cours · ${nombre(k.nbDossiersClotures)} clôturés`,
      icon: '📁', color: 'bg-blue-500', vers: '/demandes' },
    { label: 'Propriétés', valeur: nombre(k.nbProprietes),
      detail: superficie(k.superficieProprietes),
      icon: '🏞️', color: 'bg-indigo-500', vers: '/suivi/proprietes' },
    { label: 'Parcelles', valeur: nombre(k.nbParcelles),
      detail: superficie(k.superficieParcelles),
      icon: '🧩', color: 'bg-orange-500', vers: '/suivi/parcelles' },
    { label: 'Signalements', valeur: nombre(k.nbSignalements),
      detail: `${nombre(k.nbSignalementsOuverts)} ouverts`,
      icon: '📢', color: 'bg-rose-500', vers: '/signalements' },
    { label: 'Descentes terrain', valeur: nombre(k.nbDescentes),
      detail: `${nombre(k.nbDescentesEnAttente)} en attente de validation`,
      icon: '🥾', color: 'bg-teal-500', vers: '/descentes-terrain' },
    { label: 'CA théorique', valeur: montantAr(stats?.finances?.caTheorique ?? k.montantTotal),
      detail: `CA réel ${montantAr(stats?.finances?.caReel)}`,
      icon: '💰', color: 'bg-emerald-600', vers: '/finances' },
    { label: 'Notifications', valeur: nombre(k.nbNotifications),
      detail: `${nombre(k.nbNotificationsEnCours)} en cours`,
      icon: '🔔', color: 'bg-amber-500', vers: '/suivi-notifications/occupation' },
    { label: 'Avertissements', valeur: nombre(k.nbAvertissements),
      detail: `${nombre(k.nbPersonnes)} personnes référencées`,
      icon: '⚠️', color: 'bg-yellow-500', vers: '/suivi-notifications/avertissements' },
    { label: 'Référentiels', valeur: `${nombre(k.nbVilles)} villes`,
      detail: `${nombre(k.nbLieux)} lieux · ${nombre(k.nbDocuments)} documents`,
      icon: '🏘️', color: 'bg-red-500', vers: '/suivi/villes' },
  ] : [];

  // Répartitions enrichies de couleurs côté client (géométries, descentes).
  const geometriesEtiquetees: Repartition[] = (stats?.geometriesParType ?? []).map((g) => ({
    ...g,
    libelle: LIBELLES_GEO[g.libelle] ?? g.libelle,
    couleur: COULEURS_GEO[g.libelle] ?? '#64748b',
  }));
  const validationsEtiquetees: Repartition[] = (stats?.descentesParValidation ?? []).map((d) => ({
    ...d,
    couleur: COULEURS_VALIDATION[d.libelle] ?? '#94a3b8',
  }));

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Bonjour, {user?.nomComplet || user?.nomUtilisateur} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Voici un aperçu du patrimoine foncier
            {periodeActive && (
              <span className="text-blue-600 font-medium">
                {' — période '}
                {[filtresAppliques.dateDebut && `du ${dateCourte(filtresAppliques.dateDebut)}`,
                  filtresAppliques.dateFin && `au ${dateCourte(filtresAppliques.dateFin)}`]
                  .filter(Boolean)
                  .join(' ')}
              </span>
            )}
            {stats?.genereLe && <> — généré le {formatDateTime(stats.genereLe)}</>}
          </p>
        </div>
        <button
          onClick={charger}
          disabled={loading}
          className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 rounded-lg font-medium text-sm transition-colors"
        >
          🔄 Actualiser
        </button>
      </div>

      <form onSubmit={appliquerFiltre} className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="date-debut" className="block text-xs font-medium text-gray-600 mb-1">Du</label>
          <input
            id="date-debut"
            type="date"
            value={dateDebut}
            onChange={(event) => setDateDebut(event.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700"
          />
        </div>
        <div>
          <label htmlFor="date-fin" className="block text-xs font-medium text-gray-600 mb-1">Au</label>
          <input
            id="date-fin"
            type="date"
            value={dateFin}
            onChange={(event) => setDateFin(event.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
        >
          Appliquer
        </button>
        <button
          type="button"
          onClick={reinitialiserFiltre}
          disabled={loading && !stats}
          className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 rounded-lg font-medium text-sm transition-colors"
        >
          Réinitialiser
        </button>
      </form>

      {erreur && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {erreur}
        </div>
      )}

      {loading && !stats && (
        <div className="p-16 text-center text-gray-400">
          <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-blue-600 mx-auto mb-3" />
          Chargement des statistiques…
        </div>
      )}

      {stats && (
        <>
       

          {/* ── Alertes ── */}
          {(stats.alertes ?? []).length > 0 && (
            <div className="space-y-2">
              {stats.alertes.map((a, i) => (
                <div
                  key={`${a.niveau}-${i}`}
                  className={`rounded-lg px-4 py-3 text-sm border flex items-start gap-2 ${ALERTES_STYLES[a.niveau] ?? ALERTES_STYLES.info}`}
                >
                  <span aria-hidden>{ALERTES_ICONES[a.niveau] ?? 'ℹ️'}</span>
                  <span>{a.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── KPI ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
            {cartes.map((c) => (
              <button
                key={c.label}
                onClick={() => navigate(c.vers)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-start gap-3 hover:shadow-md hover:border-blue-200 transition-all text-left"
              >
                <div className={`w-10 h-10 ${c.color} rounded-xl flex items-center justify-center text-xl shrink-0`}>
                  {c.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{c.label}</p>
                  <p className="text-lg font-bold text-gray-800 truncate">{c.valeur}</p>
                  <p className="text-[11px] text-gray-400 truncate" title={c.detail}>{c.detail}</p>
                </div>
              </button>
            ))}
          </div>

          {/* ── Activité 12 mois + dossiers par statut ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Section
              titre={periodeActive ? 'Activité par mois — période filtrée' : 'Activité — 12 derniers mois'}
              icone="📈"
              className="lg:col-span-2"
            >
              <GraphiqueMensuel
                series={[
                  { label: 'Dossiers', couleur: '#2563eb', points: stats.dossiersParMois ?? [] },
                  { label: 'Notifications', couleur: '#f59e0b', points: stats.notificationsParMois ?? [] },
                  { label: 'Signalements', couleur: '#a13a2c', points: stats.signalementsParMois ?? [] },
                ]}
              />
            </Section>

            <Section titre="Dossiers par statut" icone="🎯">
              <Donut items={stats.dossiersParStatut ?? []} />
            </Section>
          </div>

          {/* ── Dossiers + signalements ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Section titre="Dossiers" icone="📁">
              <div className="space-y-4">
                <BarresRepartition items={stats.dossiersParType ?? []} couleur="#8b5cf6" />
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <Jauge
                    pourcent={stats.avancement?.tauxRealisation ?? 0}
                    couleur="#16a34a"
                    legende="Étapes réalisées (suivis)"
                    detail={`${nombre(stats.avancement?.nbSuivisRealises)} / ${nombre(stats.avancement?.nbSuivis)} suivis réalisés`}
                  />
                  <Jauge
                    pourcent={stats.avancement?.tauxRemplissage ?? 0}
                    couleur="#2563eb"
                    legende="Suivi des dossiers (grille dossiers × étapes)"
                    detail={`${nombre(stats.avancement?.nbEtapes)} étapes · ${nombre(stats.avancement?.nbDossiersSuivis)} dossier(s) suivis`}
                  />
                </div>
              </div>
            </Section>

            <Section titre="Signalements" icone="📢">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <p className="text-xs text-gray-500 mb-2">Par statut</p>
                  <BarresRepartition items={stats.signalementsParStatut ?? []} couleur="#a13a2c" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">Par type</p>
                  <BarresRepartition items={stats.signalementsParType ?? []} couleur="#0d9488" />
                </div>
              </div>
            </Section>
          </div>

          {/* ── Synthèse financière ── */}
          <Section
            titre="Synthèse financière"
            icone="💰"
            action={
              <span className="text-[11px] text-gray-400">
                CA réel : statuts terminés · CA théorique : tous statuts
              </span>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <CarteMontant
                label="CA réel"
                valeur={stats.finances?.caReel}
                sous="dossiers au statut terminé"
                couleur="#16a34a"
                icon="✅"
              />
              <CarteMontant
                label="CA théorique"
                valeur={stats.finances?.caTheorique}
                sous="tous statuts confondus"
                couleur="#2563eb"
                icon="📊"
              />
              <CarteMontant
                label="Taux de réalisation"
                valeur={stats.finances?.tauxRealisation}
                format="pourcent"
                sous={`écart à réaliser : ${montantAr(stats.finances?.ecart)}`}
                couleur="#f59e0b"
                icon="🎯"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
              <div>
                <p className="text-xs text-gray-500 mb-2">Par ville</p>
                <TableauMontants items={stats.finances?.parVille ?? []} vide="Aucun montant" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Par année</p>
                <TableauMontants items={stats.finances?.parAnnee ?? []} vide="Aucun montant" />
              </div>
            </div>
          </Section>

          {/* ── Patrimoine, carte, suivi terrain ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Section titre="Propriétés par ville" icone="🏘️">
              <BarresRepartition items={stats.proprietesParVille ?? []} couleur="#2563eb" />
            </Section>

            <Section titre="Géométries sur la carte" icone="📍">
              <div className="space-y-4">
                <BarresRepartition items={geometriesEtiquetees} />
                <div className="border-t border-gray-100 pt-3 space-y-3">
                  <Jauge
                    pourcent={stats.geometrie?.couverturePourcent ?? 0}
                    couleur="#16a34a"
                    legende="Propriétés localisées"
                    detail={`${nombre(stats.geometrie?.nbProprietesLocalisees)} localisées · ${nombre(stats.geometrie?.nbProprietesSansGeometrie)} sans géométrie — ${superficie(stats.geometrie?.superficieTotale)}`}
                  />
                </div>
              </div>
            </Section>

            <Section titre="Suivi terrain" icone="🔔">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-2">
                    Notifications d'occupation — {nombre(stats.kpi?.nbNotifications)} au total
                  </p>
                  <BarresRepartition items={stats.notificationsParStatut ?? []} couleur={COULEUR_NOTIF} />
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-500 mb-2">
                    Descentes terrain — validation
                  </p>
                  <BarresRepartition items={validationsEtiquetees} />
                </div>
              </div>
            </Section>
          </div>

          {/* ── Activité récente ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Section titre="Derniers dossiers" icone="📄">
              <Liste items={(stats.derniersDossiers ?? []).map((d) => ({
                cle: d.numero,
                titre: d.numero,
                pastille: d.couleur,
                sous: [d.statut, d.ville, dateCourte(d.date)].filter(Boolean).join(' · '),
                date: dateCourte(d.date),
              }))} vide="Aucun dossier" />
            </Section>

            <Section titre="Derniers signalements" icone="🚨">
              <Liste items={(stats.derniersSignalements ?? []).map((s) => ({
                cle: s.reference,
                titre: s.reference,
                pastille: s.couleurType,
                sous: [s.type, s.statut].filter((x) => x && x !== '-').join(' · '),
                date: dateCourte(s.date),
              }))} vide="Aucun signalement déclaré" />
            </Section>

            <Section titre="Activité récente" icone="🕒">
              <Liste items={(stats.activiteRecente ?? []).map((a, i) => ({
                cle: `${a.entite}-${a.action}-${i}`,
                titre: `${a.entite} · ${a.action}`,
                pastille: actionCouleur(a.action),
                sous: a.utilisateur || '—',
                date: formatDateTime(a.date),
              }))} vide="Aucune action tracée récemment" />
            </Section>
          </div>

          {/* ── Actions rapides ── */}
          <Section titre="Actions rapides" icone="⚡">
            <div className="flex flex-wrap gap-3">
              <BoutonAction onClick={() => navigate('/demandes/nouveau')} couleur="bg-blue-600 hover:bg-blue-700">
                📁 Nouveau dossier
              </BoutonAction>
              <BoutonAction onClick={() => navigate('/carte')} couleur="bg-green-600 hover:bg-green-700">
                📍 Ouvrir la carte
              </BoutonAction>
              <BoutonAction onClick={() => navigate('/signalements/nouveau')} couleur="bg-purple-600 hover:bg-purple-700">
                📢 Signalement
              </BoutonAction>
              <BoutonAction onClick={() => navigate('/suivi-notifications/occupation/nouvelle')} couleur="bg-amber-600 hover:bg-amber-700">
                🔔 Notification d'occupation
              </BoutonAction>
              <BoutonAction onClick={() => navigate('/suivi/proprietes')} couleur="bg-indigo-600 hover:bg-indigo-700">
                🏞️ Gérer les propriétés
              </BoutonAction>
              <BoutonAction onClick={() => navigate('/utilisateurs')} couleur="bg-gray-700 hover:bg-gray-800">
                👤 Utilisateurs
              </BoutonAction>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Sous-composants
// ══════════════════════════════════════════════════════════════

/** Liste compacte (derniers dossiers, signalements, activité). */
function Liste({
  items,
  vide,
}: {
  items: { cle: string; titre: string; sous: string; date: string; pastille?: string }[];
  vide: string;
}) {
  if (items.length === 0) {
    return <p className="text-gray-400 text-sm italic py-4">{vide}</p>;
  }
  return (
    <ul className="space-y-2.5">
      {items.map((it, idx) => (
        <li key={`${it.cle}-${idx}`} className="flex items-start gap-2.5 text-xs">
          <span
            className="mt-1 w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: it.pastille || '#94a3b8' }}
          />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-800 truncate">{it.titre}</p>
            <p className="text-gray-500 truncate" title={it.sous}>{it.sous}</p>
          </div>
          <span className="text-gray-400 shrink-0">{it.date}</span>
        </li>
      ))}
    </ul>
  );
}

/** Carte monétaire / de taux de la section Finances. */
function CarteMontant({
  label,
  valeur,
  format = 'montant',
  sous,
  couleur,
  icon,
}: {
  label: string;
  valeur?: number;
  format?: 'montant' | 'pourcent';
  sous?: string;
  couleur: string;
  icon: string;
}) {
  const affiche = format === 'pourcent'
    ? `${(valeur ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`
    : montantAr(valeur);
  return (
    <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/50">
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
        <span aria-hidden>{icon}</span>
        <span>{label}</span>
      </div>
      <p className="text-xl font-bold truncate" style={{ color: couleur }} title={affiche}>
        {affiche}
      </p>
      {sous && <p className="text-[11px] text-gray-400 mt-0.5">{sous}</p>}
    </div>
  );
}

/** Tableau « libellé · montant · nombre » (Finances : par ville / par année). */
function TableauMontants({
  items,
  vide,
}: {
  items: { libelle: string; montant: number; nombre: number }[];
  vide: string;
}) {
  if (items.length === 0) {
    return <p className="text-gray-400 text-sm italic">{vide}</p>;
  }
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-gray-400 border-b border-gray-100">
          <th className="text-left font-medium py-1.5">Libellé</th>
          <th className="text-right font-medium py-1.5">Montant</th>
          <th className="text-right font-medium py-1.5 w-16">Dossiers</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it, idx) => (
          <tr key={`${it.libelle}-${idx}`} className="border-b border-gray-50 last:border-0">
            <td className="py-1.5 text-gray-700 truncate max-w-[10rem]" title={it.libelle}>{it.libelle}</td>
            <td className="py-1.5 text-right font-semibold text-gray-800">{montantAr(it.montant)}</td>
            <td className="py-1.5 text-right text-gray-500">{nombre(it.nombre)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Bouton d'action rapide. */
function BoutonAction({
  onClick,
  couleur,
  children,
}: {
  onClick: () => void;
  couleur: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 ${couleur} text-white rounded-lg transition-colors text-sm font-medium`}
    >
      {children}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════

function nombre(n?: number): string {
  return (n ?? 0).toLocaleString('fr-FR');
}

/** Montant en ariary « 35 351 000 Ar ». */
function montantAr(n?: number): string {
  return `${Math.round(n ?? 0).toLocaleString('fr-FR')} Ar`;
}

/** Superficie lisible (ha au-delà de 10 000 m²). */
function superficie(m2?: number): string {
  const v = m2 ?? 0;
  if (v >= 10000) return `${(v / 10000).toFixed(2)} ha (${Math.round(v).toLocaleString('fr-FR')} m²)`;
  return `${Math.round(v).toLocaleString('fr-FR')} m²`;
}

/** Date « YYYY-MM-DD » (ou ISO) → « DD/MM/YYYY » sans conversion de fuseau. */
function dateCourte(iso?: string): string {
  if (!iso) return '—';
  const partie = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(partie)) return iso;
  return partie.split('-').reverse().join('/');
}

/** Horodatage local « DD/MM/YYYY HH:mm ». */
function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Couleur pastille selon l'action d'audit. */
function actionCouleur(action?: string): string {
  return ({ CREATE: '#16a34a', UPDATE: '#f59e0b', DELETE: '#dc2626' } as Record<string, string>)[action ?? '']
    ?? '#64748b';
}

