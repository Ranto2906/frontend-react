import { Link } from 'react-router-dom';

export default function SuiviTerrain() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">🗺️ Gestion des Terrains</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Ville */}
        <Link
          to="/suivi/villes"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all group"
        >
          <div className="text-3xl mb-3">🏙️</div>
          <h2 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
            Ville
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Gérer les villes du patrimoine foncier : ajout, modification, consultation.
          </p>
        </Link>

        {/* Propriété */}
        <Link
          to="/suivi/proprietes"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-orange-300 transition-all group"
        >
          <div className="text-3xl mb-3">🏘️</div>
          <h2 className="text-lg font-semibold text-gray-800 group-hover:text-orange-600 transition-colors">
            Propriété
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Gérer les propriétés, leurs références, leurs zones et leurs superficies.
          </p>
        </Link>

        {/* Prix au m² */}
        <Link
          to="/suivi/prix-m2"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-purple-300 transition-all group"
        >
          <div className="text-3xl mb-3">💰</div>
          <h2 className="text-lg font-semibold text-gray-800 group-hover:text-purple-600 transition-colors">
            Prix au M²
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Suivre et gérer les prix au mètre carré par ville et par période.
          </p>
        </Link>

        {/* Parcelle */}
        <Link
          to="/suivi/parcelles"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-red-300 transition-all group"
        >
          <div className="text-3xl mb-3">🗺️</div>
          <h2 className="text-lg font-semibold text-gray-800 group-hover:text-red-600 transition-colors">
            Parcelle
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Gérer les parcelles : numéros de lot, superficies et rattachement aux titres.
          </p>
        </Link>
      </div>
    </div>
  );
}
