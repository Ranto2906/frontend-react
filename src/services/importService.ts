import api from './api';
import type { ImportExcelResult } from '../types';

// ══════════════════════════════════════════════════════════════
// Import Excel — upload du fichier « Suivi des notifications »
// ══════════════════════════════════════════════════════════════

export const importService = {
  /**
   * Importe le fichier Excel (feuilles notifications + avertissements)
   * et renvoie le résumé des lignes traitées.
   */
  importerExcel: async (file: File): Promise<ImportExcelResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post<ImportExcelResult>('/import/excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};