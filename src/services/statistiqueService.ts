import api from './api';
import type { TableauBord } from '../types';

// ══════════════════════════════════════════════════════════════
// Statistiques — synthèse du tableau de bord
// ══════════════════════════════════════════════════════════════

export const statistiqueService = {
  /** Synthèse complète (KPI, répartitions, séries, finances, alertes). */
  tableauBord: (filtres?: { dateDebut?: string; dateFin?: string }): Promise<TableauBord> =>
    api.get<TableauBord>('/statistiques/tableau-bord', { params: filtres }).then((r) => r.data),
};
