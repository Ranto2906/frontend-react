import { useAuth } from '../../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  const stats = [
    { label: 'Dossiers', value: '—', icon: '📁', color: 'bg-blue-500' },
    { label: 'Valeur totale', value: '—', icon: '💰', color: 'bg-green-500' },
    { label: 'Titres fonciers', value: '—', icon: '📜', color: 'bg-purple-500' },
    { label: 'Parcelles', value: '—', icon: '🗺️', color: 'bg-orange-500' },
    { label: 'Notifications', value: '—', icon: '🔔', color: 'bg-yellow-500' },
    { label: 'Villes', value: '—', icon: '🏘️', color: 'bg-red-500' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Bonjour, {user?.nomComplet || user?.nomUtilisateur} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          Voici un aperçu du patrimoine foncier
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center gap-4 hover:shadow-md transition-shadow"
          >
            <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-2xl`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Actions rapides</h2>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            📁 Nouveau dossier
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
            📍 Ouvrir la carte
          </button>
          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
            📢 Signalement
          </button>
        </div>
      </div>

      {/* Recent demandes placeholder */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Dernières demandes</h2>
        <p className="text-gray-400 text-sm italic">
          Les données seront chargées depuis l'API backend...
        </p>
      </div>
    </div>
  );
}
