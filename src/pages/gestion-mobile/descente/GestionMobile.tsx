import { Link } from 'react-router-dom';

/**
 * Hub « Gestion mobile » — page de choix entre les données remontées du
 * terrain par l'application mobile : les signalements et les descentes terrain.
 */
export default function GestionMobile() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">📱 Gestion mobile</h1>
        <p className="text-gray-500 text-sm">
          Données remontées par les agents sur le terrain via l'application mobile :
          consultation, validation et suivi.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
        {/* Signalements */}
        <Link
          to="/signalements"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-red-300 transition-all group"
        >
          <div className="text-3xl mb-3">📢</div>
          <h2 className="text-lg font-semibold text-gray-800 group-hover:text-red-600 transition-colors">
            Signalements
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Constats relevés sur le terrain : liste, filtres multicritères, validation
            (changement de statut), historique et photos du constat.
          </p>
        </Link>

        {/* Descentes terrain */}
        <Link
          to="/descentes-terrain"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-amber-300 transition-all group"
        >
          <div className="text-3xl mb-3">🥾</div>
          <h2 className="text-lg font-semibold text-gray-800 group-hover:text-amber-600 transition-colors">
            Descentes sur terrain
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Journal des descentes de terrain : constats, observations et validations
            des sorties des agents.
          </p>
        </Link>
      </div>
    </div>
  );
}
