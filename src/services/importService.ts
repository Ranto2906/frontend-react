import api from './api';
import type { ImportExcelResult, ImportSituationDemandesResult } from '../types';

// ══════════════════════════════════════════════════════════════
// Import Excel — upload du fichier « Suivi des notifications »
// ══════════════════════════════════════════════════════════════

export const importService = {
  /**
   * Importe le fichier Excel (feuilles notifications + avertissements)
   * et renvoie le résumé des lignes traitées.
   * @param onProgression — callback appelé avec le pourcentage d'upload (0-100)
   */
  importerExcel: async (
    file: File,
    onProgression?: (pourcentage: number) => void
  ): Promise<ImportExcelResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post<ImportExcelResult>('/import/excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgression) {
          const pourcentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgression(pourcentage);
        }
      },
    });
    return data;
  },

  /**
   * Importe le fichier Excel « Situation des demandes Patrimoines »
   * (feuille prix au m² + une feuille par ville).
   */
  importerSituationDemandes: async (
    file: File,
    onProgression?: (pourcentage: number) => void
  ): Promise<ImportSituationDemandesResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post<ImportSituationDemandesResult>(
      '/import/situation-demandes',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgression) {
            const pourcentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgression(pourcentage);
          }
        },
      },
    );
    return data;
  },
};