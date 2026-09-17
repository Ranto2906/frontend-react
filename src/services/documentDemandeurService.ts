import api from './api';
import type { DocumentDemandeur } from '../types';

// ══════════════════════════════════════════════════════════════
// DocumentDemandeur Service — photos / documents joint à une
// personne (demandeur) — table document_demandeur
// ══════════════════════════════════════════════════════════════

export const documentDemandeurService = {
  lister: (idPersonne: number): Promise<DocumentDemandeur[]> =>
    api.get<DocumentDemandeur[]>(`/personnes-documents/personne/${idPersonne}`).then((r) => r.data),

  ajouter: async (data: {
    fichier: File;
    idPersonne: number;
    typeDocument: string;
  }): Promise<DocumentDemandeur> => {
    const formData = new FormData();
    formData.append('fichier', data.fichier);
    formData.append('idPersonne', String(data.idPersonne));
    formData.append('typeDocument', data.typeDocument);
    const { data: doc } = await api.post<DocumentDemandeur>('/personnes-documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return doc;
  },

  supprimer: (idDocument: number) =>
    api.delete(`/personnes-documents/${idDocument}`),

  /** Contenu binaire (Blob) — pour aperçu <img> ou ouverture PDF. */
  contenu: async (idDocument: number): Promise<Blob> => {
    const r = await api.get<Blob>(`/personnes-documents/${idDocument}/contenu`, { responseType: 'blob' });
    return r.data;
  },

  /** URL signée par le JWT — à passer à <img src>. */
  urlContenu: (idDocument: number) => `/api/personnes-documents/${idDocument}/contenu`,
};

export default documentDemandeurService;
