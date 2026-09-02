import { Link } from 'react-router-dom';

export default function SuiviNotificationsHub() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">🔔 Suivi des Notifications</h1>

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
