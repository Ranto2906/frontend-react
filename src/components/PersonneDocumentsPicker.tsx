import { useState, type ChangeEvent } from 'react';

export type DocumentEnAttente = { fichier: File; typeDocument: string };

const TYPES_DOCUMENT = [
  { value: 'photo_demandeur', label: 'Photo' },
  { value: 'photo_identite', label: "Pièce d'identité" },
  { value: 'pdf_piece', label: 'Pièce PDF' },
  { value: 'Autre', label: 'Autre' },
];

function tailleLisible(octets: number) {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function PersonneDocumentsPicker({
  documents,
  onChange,
}: {
  documents: DocumentEnAttente[];
  onChange: (documents: DocumentEnAttente[]) => void;
}) {
  const [typeDocument, setTypeDocument] = useState('Autre');
  const [message, setMessage] = useState('');

  const ajouter = (event: ChangeEvent<HTMLInputElement>) => {
    const selection = Array.from(event.target.files || []);
    event.target.value = '';
    const acceptes = selection.filter((file) => file.type.startsWith('image/') || file.type === 'application/pdf');
    onChange([
      ...documents,
      ...acceptes.map((fichier) => ({
        fichier,
        typeDocument: typeDocument === 'Autre'
          ? fichier.type === 'application/pdf' ? 'pdf_piece' : 'photo_demandeur'
          : typeDocument,
      })),
    ]);
    setMessage(selection.length === acceptes.length ? '' : 'Seuls les fichiers image et PDF sont acceptés.');
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <p className="text-xs font-medium text-gray-500 mb-2">📎 Documents liés à cette personne</p>
      <div className="flex flex-wrap gap-2">
        <select value={typeDocument} onChange={(event) => setTypeDocument(event.target.value)} className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500">
          {TYPES_DOCUMENT.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
        </select>
        <label className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium cursor-pointer">
          📎 Ajouter un fichier
          <input type="file" multiple accept="image/*,.pdf" className="hidden" onChange={ajouter} />
        </label>
      </div>
      {message && <p className="text-[11px] text-red-600 mt-1">{message}</p>}
      {documents.length > 0 && (
        <div className="mt-2 space-y-1">
          {documents.map((document, index) => (
            <div key={`${document.fichier.name}-${index}`} className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded px-2 py-1.5 text-xs">
              <span className="truncate text-gray-700">{document.fichier.type === 'application/pdf' ? '📄' : '🖼️'} {document.fichier.name} <span className="text-gray-400">({tailleLisible(document.fichier.size)})</span></span>
              <button type="button" onClick={() => onChange(documents.filter((_, i) => i !== index))} className="text-red-500 hover:text-red-700" title="Retirer">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}