import { Link } from 'react-router-dom';

// ════════════════════════════════════════════════════════════
// Hub « Suivi de Dossier » : page d'accueil avec les choix
// (consultation des demandes, création d'une nouvelle demande).
// ═════════════════════════ SuiviDossier.tsx ═════════════════
export default function SuiviDossier() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📁 Suivi de Dossier</h1>
        <p className="text-gray-500 text-sm mt-1">
          Que voulez-vous faire ? Choisissez une section ci-dessous.
        </p>
      </div>

      {/* Cartes de choix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/demandes/liste"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all group"
        >
          <div className="text-3xl mb-3">📋</div>
          <h2 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
            Liste des demandes
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Consulter, rechercher et filtrer toutes les demandes, suivre leur avancement
            (étapes, statuts) et gérer les dossiers existants.
          </p>
        </Link>

        <Link
          to="/demandes/nouveau"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-green-300 transition-all group"
        >
          <div className="text-3xl mb-3">➕</div>
          <h2 className="text-lg font-semibold text-gray-800 group-hover:text-green-600 transition-colors">
            Créer une demande
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Enregistrer une nouvelle demande de terrain : demandeurs, parcelles et
            informations de base.
          </p>
        </Link>
         <Link
          to="/demandes/etapes"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-green-300 transition-all group"
        >
          <div className="text-3xl mb-3">➕</div>
          <h2 className="text-lg font-semibold text-gray-800 group-hover:text-green-600 transition-colors">
           Etapes
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Enregistrer ou modifier les étapes d'une demande de terrain 
          </p>
        </Link>
      </div>
    </div>
  );
}
