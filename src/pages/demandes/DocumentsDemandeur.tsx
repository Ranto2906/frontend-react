import { useState, useEffect } from 'react';
import { documentDemandeurService } from '../../services';
import type { DocumentDemandeur } from '../../types';

// ════════════════════════════════════════════════════════════
// Documents d'une personne (demandeur) : photo, pièce d'identité,
// PDF… — table document_demandeur.
// Utilisé dans le formulaire de demande (demandeur enregistré)
// et sur la fiche du dossier.
// ════════════════════════════════════════════════════════════

const TYPES_DOCUMENT = [
  { value: 'photo_demandeur', label: 'Photo du demandeur' },
  { value: 'photo_identite', label: "Pièce d'identité (photo)" },
  { value: 'pdf_piece', label: "Pièce (PDF)" },
  { value: 'PV', label: 'PV' },
  { value: 'Plan', label: 'Plan' },
  { value: 'Quittance', label: 'Quittance' },
  { value: 'Acte', label: 'Acte' },
  { value: 'Autre', label: 'Autre' },
];

const ICONES: Record<string, string> = {
  photo_demandeur: '📷',
  photo_identite: '🪪',
  pdf_piece: '📄',
  PV: '📋',
  Plan: '🗺️',
  Quittance: '🧾',
  Acte: '📜',
  Autre: '📎',
};

function tailleLisible(octets?: number | null): string {
  if (!octets) return '';
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function DocumentsDemandeur({
  idPersonne,
  nom,
  compact = false,
}: {
  idPersonne: number;
  nom?: string;
  compact?: boolean;
}) {
  const [docs, setDocs] = useState<DocumentDemandeur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [typeChoisi, setTypeChoisi] = useState('photo_demandeur');
  const [envoi, setEnvoi] = useState(false);
  const [apercu, setApercu] = useState<{ url: string; nom: string } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = () => {
    documentDemandeurService.lister(idPersonne)
      .then(setDocs)
      .catch(() => setErreur('Documents indisponibles'))
      .finally(() => setChargement(false));
  };

  useEffect(() => {
    setChargement(true);
    setErreur(null);
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idPersonne]);

  const uploader = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    e.target.value = ''; // permet de re-sélectionner le même fichier
    if (!fichier) return;
    setEnvoi(true);
    setErreur(null);
    try {
      await documentDemandeurService.ajouter({ fichier, idPersonne, typeDocument: typeChoisi });
      charger();
    } catch (err) {
      const e2 = err as { response?: { data?: { message?: string } } };
      setErreur(e2?.response?.data?.message || "Erreur lors de l'envoi du document");
    } finally {
      setEnvoi(false);
    }
  };

  const supprimer = async (doc: DocumentDemandeur) => {
    try {
      await documentDemandeurService.supprimer(doc.idDocument);
      setDocs((l) => l.filter((d) => d.idDocument !== doc.idDocument));
    } catch {
      setErreur('Erreur lors de la suppression');
    }
  };

  const voir = async (doc: DocumentDemandeur) => {
    try {
      const blob = await documentDemandeurService.contenu(doc.idDocument);
      const url = URL.createObjectURL(blob);
      setApercu({ url, nom: doc.nomFichier });
    } catch {
      setErreur('Impossible de charger le document');
    }
  };

  const fermerApercu = () => {
    if (apercu) URL.revokeObjectURL(apercu.url);
    setApercu(null);
  };

  return (
    <div className={compact ? '' : 'mt-3 pt-3 border-t border-gray-100'}>
      {/* Bandeau upload */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={typeChoisi}
          onChange={(e) => setTypeChoisi(e.target.value)}
          className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {TYPES_DOCUMENT.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <label
          className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
            envoi
              ? 'bg-blue-300 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {envoi ? 'Envoi…' : '📎 Joindre un fichier'}
          <input type="file" accept="image/*,.pdf" className="hidden" onChange={uploader} disabled={envoi} />
        </label>
        {nom && <span className="text-[11px] text-gray-400">Documents de {nom}</span>}
      </div>

      {erreur && <p className="text-[11px] text-red-600 mt-1">{erreur}</p>}

      {/* Liste des documents */}
      {chargement ? (
        <p className="text-xs text-gray-400 mt-2">Chargement des documents…</p>
      ) : docs.length === 0 ? (
        <p className="text-xs text-gray-400 mt-2 italic">Aucun document joint.</p>
      ) : (
        <div className={`mt-2 flex flex-wrap gap-2 ${compact ? '' : ''}`}>
          {docs.map((d) => (
            <div
              key={d.idDocument}
              className="group relative flex items-center gap-2 bg-white border border-gray-200 rounded-lg pl-2 pr-1 py-1.5 shadow-sm"
            >
              <span className="text-base">{ICONES[d.typeDocument] || '📎'}</span>
              <button
                type="button"
                onClick={() => voir(d)}
                className="text-left min-w-0"
                title="Voir le document"
              >
                <p className="text-xs font-medium text-gray-700 truncate max-w-[160px] hover:text-blue-600">
                  {d.nomFichier}
                </p>
                <p className="text-[10px] text-gray-400">
                  {TYPES_DOCUMENT.find((t) => t.value === d.typeDocument)?.label ?? d.typeDocument}
                  {d.tailleOctets ? ` · ${tailleLisible(d.tailleOctets)}` : ''}
                </p>
              </button>
              <button
                type="button"
                onClick={() => supprimer(d)}
                title="Supprimer"
                className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 rounded px-1 text-xs transition-all"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Aperçu (image agrandie ou PDF dans un nouvel onglet) */}
      {apercu && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={fermerApercu}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-700 truncate">{apercu.nom}</p>
              <button
                onClick={fermerApercu}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>
            {apercu.nom.match(/\.(pdf)$/i) || apercu.url.includes('application/pdf') ? (
              <iframe src={apercu.url} title={apercu.nom} className="w-full h-[70vh]" />
            ) : (
              <img src={apercu.url} alt={apercu.nom} className="w-full max-h-[70vh] object-contain" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
