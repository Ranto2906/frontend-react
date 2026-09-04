import api from './api';
import type { PhotoDTO } from '../types';

// ══════════════════════════════════════════════════════════════
// Photo Service — métadonnées + contenu binaire (JWT)
// ══════════════════════════════════════════════════════════════

export const photoService = {
  // ── Liste des photos d'une entité (notification / suivi / avertissement) ──
  lister: (entiteType: string, entiteId: string): Promise<PhotoDTO[]> =>
    api
      .get<PhotoDTO[]>('/photos', { params: { entiteType, entiteId } })
      .then((r) => r.data),

  // ── Contenu binaire (Blob) — pour <img> via objectURL ──
  contenu: async (idPhoto: string): Promise<Blob> => {
    const r = await api.get<Blob>(`/photos/${idPhoto}/contenu`, { responseType: 'blob' });
    return r.data;
  },

  // ── Joindre une photo (multipart) ──
  ajouter: async (data: {
    fichier: File;
    entiteType: string;
    entiteId: string;
    typePhoto?: string;
    datePrise?: string;
    observation?: string;
  }): Promise<PhotoDTO> => {
    const formData = new FormData();
    formData.append('fichier', data.fichier);
    formData.append('entiteType', data.entiteType);
    formData.append('entiteId', data.entiteId);
    if (data.typePhoto) formData.append('typePhoto', data.typePhoto);
    if (data.datePrise) formData.append('datePrise', data.datePrise);
    if (data.observation) formData.append('observation', data.observation);

    const { data: photo } = await api.post<PhotoDTO>('/photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return photo;
  },
};
