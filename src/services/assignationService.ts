import api from './api';
import type { Assignation } from '../types';

/**
 * Gestion des assignations : liens signalement ↔ notification d'occupation
 * ou avertissement (table `assignation`, API /signalements/assignations).
 */
export const assignationService = {
  /** Liste globale, avec filtres optionnels type ('notification'|'avertissement') et q (recherche). */
  lister: (type?: string, q?: string): Promise<Assignation[]> =>
    api.get<Assignation[]>('/signalements/assignations', { params: { type: type || undefined, q: q || undefined } })
      .then((r) => r.data),

  /** Détail d'une assignation. */
  trouverParId: (idAssignation: number): Promise<Assignation> =>
    api.get<Assignation>(`/signalements/assignations/${idAssignation}`).then((r) => r.data),

  /** Assignations d'un signalement donné. */
  listerParSignalement: (idSignalement: string): Promise<Assignation[]> =>
    api.get<Assignation[]>(`/signalements/${idSignalement}/assignations`).then((r) => r.data),

  /** Assigner un signalement à une notification d'occupation (idempotent). */
  assignerNotification: (idSignalement: string, idNotification: string): Promise<Assignation> =>
    api.post<Assignation>(`/signalements/${idSignalement}/assignations/notification/${idNotification}`)
      .then((r) => r.data),

  /** Retirer l'assignation signalement ↔ notification. */
  desassignerNotification: (idSignalement: string, idNotification: string): Promise<void> =>
    api.delete(`/signalements/${idSignalement}/assignations/notification/${idNotification}`),

  /** Assigner un signalement à un avertissement (idempotent). */
  assignerAvertissement: (idSignalement: string, idAvertissement: string): Promise<Assignation> =>
    api.post<Assignation>(`/signalements/${idSignalement}/assignations/avertissement/${idAvertissement}`)
      .then((r) => r.data),

  /** Retirer l'assignation signalement ↔ avertissement. */
  desassignerAvertissement: (idSignalement: string, idAvertissement: string): Promise<void> =>
    api.delete(`/signalements/${idSignalement}/assignations/avertissement/${idAvertissement}`),
};
