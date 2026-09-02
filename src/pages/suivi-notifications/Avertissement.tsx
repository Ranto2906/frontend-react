import { useState } from 'react';
import { Link } from 'react-router-dom';

// ── Types locaux ──
type Avertissement = {
  id: number;
  refDossier: string;
  titre: string;
  message: string;
  dateAvertissement: string;
  niveau: 'Info' | 'Attention' | 'Urgent';
  statut: 'Non lu' | 'Lu' | 'Archivé';
  emetteur: string;
};

// ── Données simulées ──
const AVERTISSEMENTS_MOCK: Avertissement[] = [
  { id: 1, refDossier: 'AV-2026-001', titre: 'Document manquant', message: 'Le certificat foncier n\'a pas été fourni pour le dossier NO-2026-001.', dateAvertissement: '2026-01-20', niveau: 'Urgent', statut: 'Non lu', emetteur: 'Système' },
  { id: 2, refDossier: 'AV-2026-002', titre: 'Délai dépassé', message: 'La date limite de traitement du dossier NO-2026-003 est dépassée.', dateAvertissement: '2026-02-15', niveau: 'Attention', statut: 'Lu', emetteur: 'Admin' },
  { id: 3, refDossier: 'AV-2026-003', titre: 'Mise à jour disponible', message: 'Une nouvelle version du formulaire de déclaration est disponible.', dateAvertissement: '2026-03-10', niveau: 'Info', statut: 'Archivé', emetteur: 'Système' },
  { id: 4, refDossier: 'AV-2026-004', titre: 'Conflit de propriété', message: 'Deux notifications couvrent la même parcelle. Vérification requise.', dateAvertissement: '2026-04-05', niveau: 'Urgent', statut: 'Non lu', emetteur: 'Service juridique' },
  { id: 5, refDossier: 'AV-2026-005', titre: 'Rappel de suivi', message: 'Le dossier NO-2026-005 n\'a pas été mis à jour depuis 30 jours.', dateAvertissement: '2026-05-18', niveau: 'Attention', statut: 'Non lu', emetteur: 'Système' },
];

const NIVEAU_COLORS: Record<string, string> = {
  'Info': 'bg-blue-100 text-blue-800',
  'Attention': 'bg-yellow-100 text-yellow-800',
  'Urgent': 'bg-red-100 text-red-800',
};

const STATUT_COLORS: Record<string, string> = {
  'Non lu': 'bg-orange-100 text-orange-800',
  'Lu': 'bg-gray-100 text-gray-800',
  'Archivé': 'bg-green-100 text-green-800',
};

export default function Avertissement() {
  const [search, setSearch] = useState('');
  const [filterNiveau, setFilterNiveau] = useState<string>('');

  const filtered = AVERTISSEMENTS_MOCK.filter(
    (a) =>
      (a.refDossier.toLowerCase().includes(search.toLowerCase()) ||
        a.titre.toLowerCase().includes(search.toLowerCase()) ||
        a.emetteur.toLowerCase().includes(search.toLowerCase())) &&
      (filterNiveau === '' || a.niveau === filterNiveau)
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/suivi-notifications" className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
              ← Retour
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">⚠️ Avertissements</h1>
          <p className="text-gray-500 text-sm mt-1">
            {filtered.length} avertissement{filtered.length > 1 ? 's' : ''} au total
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors">
          <span>➕</span> Nouvel avertissement
        </button>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Rechercher par référence, titre, émetteur..."
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
        />
        <select
          value={filterNiveau}
          onChange={(e) => setFilterNiveau(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="">Tous les niveaux</option>
          <option value="Info">Info</option>
          <option value="Attention">Attention</option>
          <option value="Urgent">Urgent</option>
        </select>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Réf.</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Titre</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Message</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Émetteur</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Niveau</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Statut</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  <p className="text-lg">Aucun avertissement trouvé</p>
                </td>
              </tr>
            ) : (
              filtered.map((a) => (
                <tr key={a.id} className={`hover:bg-gray-50 transition-colors ${a.statut === 'Non lu' ? 'bg-orange-50/30' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-800">{a.refDossier}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{a.titre}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-xs truncate">{a.message}</td>
                  <td className="px-4 py-3 text-gray-600">{a.emetteur}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {new Date(a.dateAvertissement).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${NIVEAU_COLORS[a.niveau]}`}>
                      {a.niveau}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_COLORS[a.statut]}`}>
                      {a.statut}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button title="Marquer comme lu" className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors">✓</button>
                      <button title="Voir détails" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">👁️</button>
                      <button title="Archiver" className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">📦</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
