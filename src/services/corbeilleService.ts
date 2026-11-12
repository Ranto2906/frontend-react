import api from './api';
import type { CorbeilleDTO, CorbeilleStatistique, PageResponse } from '../types';

// ══════════════════════════════════════════════════════════════
// Corbeille — consultation, restauration, suppression définitive
// ══════════════════════════════════════════════════════════════

export interface CorbeilleFiltres {
  entite?: string;
  q?: string;
}

export const corbeilleService = {
  lister: (filtres: CorbeilleFiltres = {}, page = 0, size = 20): Promise<PageResponse<CorbeilleDTO>> =>
    api
      .get<PageResponse<CorbeilleDTO>>('/corbeille', {
        params: {
          entite: filtres.entite || undefined,
          q: filtres.q || undefined,
          page,
          size,
        },
      })
      .then((r) => r.data),

  detail: (id: number): Promise<CorbeilleDTO> =>
    api.get<CorbeilleDTO>(`/corbeille/${id}`).then((r) => r.data),

  restaurer: (id: number): Promise<void> =>
    api.post(`/corbeille/${id}/restaurer`).then(() => undefined),

  purger: (id: number): Promise<void> =>
    api.delete(`/corbeille/${id}`).then(() => undefined),

  vider: (entite?: string): Promise<{ supprimes: number }> =>
    api
      .delete<{ supprimes: number }>('/corbeille', { params: { entite: entite || undefined } })
      .then((r) => r.data),

  statistiques: (): Promise<CorbeilleStatistique[]> =>
    api.get<CorbeilleStatistique[]>('/corbeille/stats').then((r) => r.data),

  compter: (): Promise<{ total: number }> =>
    api.get<{ total: number }>('/corbeille/count').then((r) => r.data),
};
