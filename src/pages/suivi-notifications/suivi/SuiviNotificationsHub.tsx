import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { importService } from '../../../services';
import type { ImportExcelResult } from '../../../types';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

function validerFichier(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'xlsx' && ext !== 'xls') {
    return 'Format non supporté. Utilisez un fichier .xlsx ou .xls.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum : 50 MB.`;
  }
  if (file.size === 0) {
    return 'Le fichier est vide.';
  }
  return null;
}

function formatTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(2)} Mo`;
}

export default function SuiviNotificationsHub() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [resultat, setResultat] = useState<ImportExcelResult | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const [fichierSelectionne, setFichierSelectionne] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const errVal = validerFichier(file);
    if (errVal) {
      setErreur(errVal);
      setFichierSelectionne(null);
      return;
    }

    setFichierSelectionne(file);
    setErreur(null);
    setResultat(null);
  };

  const lancerImport = async () => {
    if (!fichierSelectionne) return;
    setImporting(true);
    setErreur(null);
    setResultat(null);
    setUploadProgress(null);
    try {
      const res = await importService.importerExcel(fichierSelectionne, (p) => {
        setUploadProgress(p);
      });
      setResultat(res);
    } catch (err: unknown) {
      setErreur(
        err instanceof Error
          ? err.message
          : "Erreur lors de l'import du fichier. Vérifiez que le fichier est un .xlsx valide."
      );
    } finally {
      setImporting(false);
      setFichierSelectionne(null);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const annulerFichier = () => {
    setFichierSelectionne(null);
    setErreur(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const totalErreurs = resultat?.erreurs.length ?? 0;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">🔔 Suivi des Notifications</h1>
          <p className="text-gray-500 text-sm">
            Notifications d'occupation, avertissements et personnes liées.
          </p>
        </div>

        {/* Import Excel */}
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
          >
            <span>{importing ? '⏳' : '📥'}</span>
            {importing ? 'Import en cours...' : 'Importer Excel'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
          <span className="text-xs text-gray-400">
            Fichier « Suivi des notifications Patrimoine foncier » (.xlsx)
          </span>
        </div>
      </div>

      {/* Preview du fichier sélectionné */}
      {fichierSelectionne && !importing && !resultat && (
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📄</span>
              <div>
                <p className="font-medium text-gray-800">{fichierSelectionne.name}</p>
                <p className="text-xs text-gray-500">
                  {fichierSelectionne.name.split('.').pop()?.toUpperCase()} — {formatTaille(fichierSelectionne.size)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={annulerFichier}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={lancerImport}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg font-medium transition-colors"
              >
                🚀 Lancer l'import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barre de progression */}
      {importing && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-700">
              {uploadProgress !== null && uploadProgress < 100
                ? `📤 Upload en cours... ${uploadProgress}%`
                : '⏳ Traitement du fichier en cours…'}
            </span>
            {uploadProgress !== null && (
              <span className="text-blue-500 text-xs font-medium">{uploadProgress}%</span>
            )}
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress ?? 0}%` }}
            />
          </div>
        </div>
      )}

      {erreur && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          ❌ {erreur}
        </div>
      )}

      {resultat && (
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">✅ Import terminé</h2>
            {totalErreurs > 0 && (
              <span className="text-xs font-medium text-red-600">{totalErreurs} ligne(s) en erreur</span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-800">{resultat.notificationsImportees}</div>
              <div className="text-xs text-gray-500">Notifications importées</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-800">{resultat.avertissementsImportes}</div>
              <div className="text-xs text-gray-500">Avertissements importés</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-800">{resultat.photosImportees ?? 0}</div>
              <div className="text-xs text-gray-500">Photos importées</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-800">{resultat.personnesCrees}</div>
              <div className="text-xs text-gray-500">Personnes créées ({resultat.personnesReutilisees} réutilisées)</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-800">{resultat.suivisCrees}</div>
              <div className="text-xs text-gray-500">Suivis créés</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-800">{resultat.proprietesCrees}</div>
              <div className="text-xs text-gray-500">Propriétés créées</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-800">{resultat.parcellesCrees}</div>
              <div className="text-xs text-gray-500">Parcelles créées</div>
            </div>
            <div
              className={`rounded-lg p-3 ${
                (resultat.lignesIgnorees ?? 0) > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'
              }`}
            >
              <div className="text-2xl font-bold text-gray-800">{resultat.lignesIgnorees ?? 0}</div>
              <div className="text-xs text-gray-500">Lignes déjà présentes (ignorées)</div>
            </div>
          </div>
          {(resultat.lignesIgnorees ?? 0) > 0 && (
            <p className="mt-3 text-xs text-gray-500">
              ℹ️ L'import est idempotent : les lignes déjà présentes (même propriété,
              parcelle, date et personne) ne sont pas dupliquées. Les photos manquantes sont
              ajoutées à la fiche existante.
            </p>
          )}
          {totalErreurs > 0 && (
            <details className="mt-3 text-xs text-gray-600">
              <summary className="cursor-pointer text-red-600 font-medium">Voir les erreurs</summary>
              <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto bg-red-50 rounded-lg p-3 list-disc list-inside">
                {resultat.erreurs.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Gestion Personne */}
        <Link
          to="/suivi-notifications/personnes"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all group"
        >
          <div className="text-3xl mb-3">👤</div>
          <h2 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
            Gestion Personne
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Gérer les personnes liées aux notifications : ajout, modification, consultation.
          </p>
        </Link>

        {/* Notification Occupation */}
        <Link
          to="/suivi-notifications/occupation"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-orange-300 transition-all group"
        >
          <div className="text-3xl mb-3">🏠</div>
          <h2 className="text-lg font-semibold text-gray-800 group-hover:text-orange-600 transition-colors">
            Notification Occupation
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Suivre et gérer les notifications liées à l'occupation des terrains et propriétés.
          </p>
        </Link>

        {/* Avertissement */}
        <Link
          to="/suivi-notifications/avertissements"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-red-300 transition-all group"
        >
          <div className="text-3xl mb-3">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-800 group-hover:text-red-600 transition-colors">
            Avertissement
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Consulter et gérer les avertissements émis sur les dossiers et notifications.
          </p>
        </Link>

        {/* Suivi des Notifications */}
        <Link
          to="/suivi-notifications/suivi"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-green-300 transition-all group"
        >
          <div className="text-3xl mb-3">📋</div>
          <h2 className="text-lg font-semibold text-gray-800 group-hover:text-green-600 transition-colors">
            Suivi des Notifications
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Tableau de suivi global de toutes les notifications : statut, historique, relances.
          </p>
        </Link>
      </div>
    </div>
  );
}
