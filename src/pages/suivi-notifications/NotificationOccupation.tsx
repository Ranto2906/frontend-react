import { useState } from 'react';
import { Link } from 'react-router-dom';

// ── Types locaux ──
type NotificationOccupation = {
  id: number;
  refDossier: string;
  nomOccupant: string;
  superficie: string;
  dateNotification: string;
  statut: 'En attente' | 'Validée' | 'Rejetée' | 'En cours';
  typeOccupation: 'Héritage' | 'Vente' | 'Donation' | 'Autre';
};

// ── Données simulées ──
const NOTIFICATIONS_MOCK: NotificationOccupation[] = [
  { id: 1, refDossier: 'NO-2026-001', nomOccupant: 'Rakoto Jean', superficie: '250 m²', dateNotification: '2026-01-15', statut: 'Validée', typeOccupation: 'Héritage' },
  { id: 2, refDossier: 'NO-2026-002', nomOccupant: 'Rasoa Marie', superficie: '180 m²', dateNotification: '2026-02-10', statut: 'En attente', typeOccupation: 'Vente' },
  { id: 3, refDossier: 'NO-2026-003', nomOccupant: 'Andry Paul', superficie: '320 m²', dateNotification: '2026-03-05', statut: 'En cours', typeOccupation: 'Donation' },
  { id: 4, refDossier: 'NO-2026-004', nomOccupant: 'Hery Sarah', superficie: '120 m²', dateNotification: '2026-04-20', statut: 'Rejetée', typeOccupation: 'Autre' },
  { id: 5, refDossier: 'NO-2026-005', nomOccupant: 'Rajoelina Pierre', superficie: '400 m²', dateNotification: '2026-05-12', statut: 'En attente', typeOccupation: 'Héritage' },
];

const STATUT_COLORS: Record<string, string> = {
  'En attente': 'bg-yellow-100 text-yellow-800',
  'Validée': 'bg-green-100 text-green-800',
  'Rejetée': 'bg-red-100 text-red-800',
  'En cours': 'bg-blue-100 text-blue-800',
};

export default function NotificationOccupation() {
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('');

  const filtered = NOTIFICATIONS_MOCK.filter(
    (n) =>
      (n.refDossier.toLowerCase().includes(search.toLowerCase()) ||
        n.nomOccupant.toLowerCase().includes(search.toLowerCase())) &&
      (filterStatut === '' || n.statut === filterStatut)
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
          <h1 className="text-2xl font-bold text-gray-800">🏠 Notifications d'Occupation</h1>
          <p className="text-gray-500 text-sm mt-1">
            {filtered.length} notification{filtered.length > 1 ? 's' : ''} au total
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors">
          <span>➕</span> Nouvelle notification
        </button>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Rechercher par référence, occupant..."
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
        />
        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="">Tous les statuts</option>
          <option value="En attente">En attente</option>
          <option value="En cours">En cours</option>
          <option value="Validée">Validée</option>
          <option value="Rejetée">Rejetée</option>
        </select>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Réf. Dossier</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Occupant</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Superficie</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Statut</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  <p className="text-lg">Aucune notification trouvée</p>
                </td>
              </tr>
            ) : (
              filtered.map((n) => (
                <tr key={n.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{n.refDossier}</td>
                  <td className="px-4 py-3 text-gray-600">{n.nomOccupant}</td>
                  <td className="px-4 py-3 text-gray-600">{n.superficie}</td>
                  <td className="px-4 py-3 text-gray-600">{n.typeOccupation}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {new Date(n.dateNotification).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_COLORS[n.statut]}`}>
                      {n.statut}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button title="Voir détails" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">👁️</button>
                      <button title="Modifier" className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-600 transition-colors">✏️</button>
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
