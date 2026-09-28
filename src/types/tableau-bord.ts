// ══════════════════════════════════════════════════════════════
// Tableau de bord — miroir de TableauBordDTO (backend)
// ══════════════════════════════════════════════════════════════

/** Catégorie d'une répartition (valeur + % du total, calculés côté backend). */
export interface Repartition {
  libelle: string;
  /** Couleur hex déclarée en base (statut / type), absente sinon. */
  couleur?: string;
  valeur: number;
  pourcent: number;
}

/** Ligne financière (montant + nombre d'éléments). */
export interface RepartitionMontant {
  libelle: string;
  montant: number;
  nombre: number;
}

/** Valeur d'un mois — période au format « YYYY-MM ». */
export interface SerieMensuelle {
  periode: string;
  valeur: number;
}

/** Alerte calculée par le backend. */
export interface AlerteTableauBord {
  niveau: 'info' | 'warning' | 'danger';
  message: string;
}

/** Compteurs principaux du patrimoine et du suivi. */
export interface TableauBordKpi {
  nbDossiers: number;
  nbDossiersEnCours: number;
  nbDossiersClotures: number;
  nbDossiersAnneeCourante: number;
  montantTotal: number;

  nbProprietes: number;
  superficieProprietes: number;
  nbParcelles: number;
  superficieParcelles: number;
  nbVilles: number;
  nbLieux: number;

  nbNotifications: number;
  nbNotificationsEnCours: number;
  nbAvertissements: number;
  nbDescentes: number;
  nbDescentesEnAttente: number;

  nbSignalements: number;
  nbSignalementsOuverts: number;

  nbPersonnes: number;
  nbDemandeurs: number;
  nbUtilisateurs: number;
  nbUtilisateursActifs: number;
  nbDocuments: number;
  nbAlertesNonLues: number;
}

/** Avancement du suivi des dossiers (étapes / suivis). */
export interface TableauBordAvancement {
  nbEtapes: number;
  nbSuivis: number;
  nbSuivisRealises: number;
  nbDossiersSuivis: number;
  tauxRealisation: number;
  tauxRemplissage: number;
}

/** Couverture cartographique des propriétés. */
export interface TableauBordGeometrie {
  nbGeometries: number;
  superficieTotale: number;
  nbProprietesLocalisees: number;
  nbProprietesSansGeometrie: number;
  couverturePourcent: number;
}

/** Synthèse financière — CA réel (statuts terminés) / CA théorique (tous statuts). */
export interface TableauBordFinances {
  montantTotal: number;
  /** CA réel : dossiers au statut terminé uniquement (vue_ca_reel). */
  caReel?: number;
  /** CA théorique : tous les dossiers, tous statuts confondus (vue_ca_theorique). */
  caTheorique?: number;
  /** Écart = CA théorique − CA réel (montants encore en cours de traitement). */
  ecart?: number;
  /** % de CA réel dans le CA théorique (1 décimale). */
  tauxRealisation?: number;
  parVille?: RepartitionMontant[];
  parAnnee?: RepartitionMontant[];
}

/** Dernier dossier créé. */
export interface DossierRecent {
  numero: string;
  statut: string;
  couleur: string;
  date: string;
  ville: string;
}

/** Dernier signalement déclaré. */
export interface SignalementRecent {
  reference: string;
  type: string;
  couleurType: string;
  statut: string;
  date: string;
}

/** Dernière action tracée dans l'audit (hors lectures). */
export interface ActiviteRecente {
  entite: string;
  action: string;
  date: string;
  utilisateur: string;
}

/** Réponse de GET /api/statistiques/tableau-bord. */
export interface TableauBord {
  genereLe: string;
  kpi: TableauBordKpi;
  avancement: TableauBordAvancement;
  geometrie: TableauBordGeometrie;
  finances: TableauBordFinances;

  dossiersParMois: SerieMensuelle[];
  notificationsParMois: SerieMensuelle[];
  signalementsParMois: SerieMensuelle[];

  dossiersParStatut: Repartition[];
  dossiersParType: Repartition[];
  signalementsParStatut: Repartition[];
  signalementsParType: Repartition[];
  notificationsParStatut: Repartition[];
  descentesParValidation: Repartition[];
  descentesParConstat: Repartition[];
  proprietesParVille: Repartition[];
  geometriesParType: Repartition[];

  alertes: AlerteTableauBord[];
  derniersDossiers: DossierRecent[];
  derniersSignalements: SignalementRecent[];
  activiteRecente: ActiviteRecente[];
}
