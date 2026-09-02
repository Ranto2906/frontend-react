import { useState } from 'react';
import { Link } from 'react-router-dom';

// ── Types locaux ──
type SuiviNotification = {
  id: number;
  refNotification: string;
  sujet: string;
  destinataire: string;
  dateEnvoi: string;
  dateReponse: string | null;
  statut: 'Envoyée' | 'Accusée de réception' | 'En attente de réponse' | 'Réponse reçue' | 'Clôturée';
  priorite: 'Haute' | 'Moyenne' | 'Basse';
  relances: number;
};

// ── Données simulées ──
const SUIVI_MOCK: SuiviNotification[] = [
  { id: 1, refNotification: 'SN-2026-001', sujet: 'Demande de certificat foncier', destinataire: 'Conservation Foncière', dateEnvoi: '2026-01-10', dateReponse: '2026-01-25', statut: 'Réponse reçue', priorite: 'Haute', relances: 0 },
  { id: 2, refNotification: 'SN-2026-002', sujet: 'Notification d\'occupation', destinataire: 'Mairie Antananarivo', dateEnvoi: '2026-02-05', dateReponse: null, statut: 'En attente de réponse', priorite: 'Moyenne', relances: 1 },
  { id: 3, refNotification: 'SN-2026-003', sujet: 'Avertissement de conflit', destinataire: 'Service Juridique', dateEnvoi: '2026-03-12', dateReponse: '2026-03-20', statut: 'Clôturée', priorite: 'Haute', relances: 0 },
  { id: 4, refNotification: 'SN-2026-004', sujet: 'Relance dossier incomplet', destinataire: 'Rakoto Jean', dateEnvoi: '2026-04-18', dateReponse: null, statut: 'Envoyée', priorite: 'Basse', relances: 2 },
  { id: 5, refNotification: 'SN-2026-005', sujet: 'Demande de validation parcelle', destinataire: 'Cadastre National', dateEnvoi: '2026-05-02', dateReponse: null, statut: 'Accusée de réception', priorite: 'Moyenne', relances: 0 },
];

const STATUT_COLORS: Record<string, string> = {
  'Envoyée': 'bg-blue-100 text-blue-800',
  'Accusée de réception': 'bg-purple-100 text-purple-800',
  'En attente de réponse': 'bg-yellow-100 text-yellow-800',
  'Réponse reçue': 'bg-green-100 text-green-800',
  'Clôturée': 'bg-gray-100 text-gray-800',
};

const PRIORITE_COLORS: Record<string, string> = {
  'Haute': 'bg-red-100 text-red-800',
  'Moyenne': 'bg-yellow-100 text-yellow-800',
  'Basse': 'bg-green-100 text-green-800',
};

// Statuts pour le filtre
const STATUTS = ['Envoyée', 'Accusée de réception', 'En attente de réponse', 'Réponse reçue', 'Clôturée'];

export default function SuiviNotifications() {
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('');

  const filtered = SUIVI_MOCK.filter(
    (s) =>
      (s.refNotification.toLowerCase().includes(search.toLowerCase()) ||
        s.sujet.toLowerCase().includes(search.toLowerCase()) ||
        s.destinataire.toLowerCase().includes(search.toLowerCase())) &&
      (filterStatut === '' || s.statut === filterStatut)
  );

  // Statistiques rapides
  const totalRelances = SUIVI_MOCK.reduce((acc, s) => acc + s.relances, 0);
  const enAttente = SUIVI_MOCK.filter((s) => s.statut === 'En attente de réponse').length;
  const cloturees = SUIVI_MOCK.filter((s) => s.statut === 'Clôturée').length;

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
          <h1 className="text-2xl font-bold text-gray-800">📋 Suivi des Notifications</h1>
          <p className="text-gray-500 text-sm mt-1">
            {filtered.length} notification{filtered.length > 1 ? 's' : ''} au total
          </p>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Total</p>
          <p className="text-2xl font-bold text-gray-800">{SUIVI_MOCK.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-yellow-200 p-4">
          <p className="text-xs text-yellow-600 font-medium">En attente</p>
          <p className="text-2xl font-bold text-yellow-700">{enAttente}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-green-200 p-4">
          <p className="text-xs text-green-600 font-medium">Clôturées</p>
          <p className="text-2xl font-bold text-green-700">{cloturees}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-4">
          <p className="text-xs text-red-600 font-medium">Relances</p>
          <p className="text-2xl font-bold text-red-700">{totalRelances}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Rechercher par référence, sujet, destinataire..."
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
        />
        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="">Tous les statuts</option>
          {STATUTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Réf.</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Sujet</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Destinataire</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Envoyée le</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Réponse</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Priorité</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Relances</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Statut</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                  <p className="text-lg">Aucune notification trouvée</p>
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{s.refNotification}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{s.sujet}</td>
                  <td className="px-4 py-3 text-gray-600">{s.destinataire}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {new Date(s.dateEnvoi).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {s.dateReponse ? new Date(s.dateReponse).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITE_COLORS[s.priorite]}`}>
                      {s.priorite}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.relances > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        {s.relances}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_COLORS[s.statut]}`}>
                      {s.statut}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button title="Voir détails" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">👁️</button>
                      <button title="Relancer" className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-600 transition-colors">🔄</button>
                      <button title="Clôturer" className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors">✅</button>
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
