// ══════════════════════════════════════════════════════════════
// Référentiels dossier — TypeDossier & DossierFournie
// ══════════════════════════════════════════════════════════════

export interface TypeDossier {
  idTypeDossier: number;
  code: string;
  libelle: string;
}

export interface DossierFournie {
  idDossierFournie: number;
  libelle: string;
}
