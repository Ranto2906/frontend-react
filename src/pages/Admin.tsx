import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Admin() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.some((r) => r.nomRole === 'Administrateur');

  if (!isAdmin) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-semibold">Accès réservé aux administrateurs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">⚙️ Administration</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Gestion des utilisateurs */}
        <Link
          to="/utilisateurs"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all group"
        >
          <div className="text-3xl mb-3">👥</div>
          <h2 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
            Utilisateurs
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Créer, modifier, supprimer des comptes utilisateur. Gérer les accès et les rôles.
          </p>
        </Link>

        {/* Journal des connexions */}
        <Link
          to="/journal"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-green-300 transition-all group"
        >
          <div className="text-3xl mb-3">📋</div>
          <h2 className="text-lg font-semibold text-gray-800 group-hover:text-green-600 transition-colors">
            Journal des connexions
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Historique des connexions et tentatives d'accès.
          </p>
        </Link>

        {/* Sessions */}
        <Link
          to="/sessions"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-orange-300 transition-all group"
        >
          <div className="text-3xl mb-3">🔐</div>
          <h2 className="text-lg font-semibold text-gray-800 group-hover:text-orange-600 transition-colors">
            Sessions
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Gérer les sessions actives et révoquer les accès.
          </p>
        </Link>

        {/* Rôles & Permissions */}
        <Link
          to="/roles"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-purple-300 transition-all group"
        >
          <div className="text-3xl mb-3">🛡️</div>
          <h2 className="text-lg font-semibold text-gray-800 group-hover:text-purple-600 transition-colors">
            Rôles & Permissions
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Configurer les rôles RBAC et la matrice permissions module/entité/action.
          </p>
        </Link>

        {/* Alerte */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 opacity-60">
          <div className="text-3xl mb-3">🚨</div>
          <h2 className="text-lg font-semibold text-gray-800">Alertes</h2>
          <p className="text-sm text-gray-500 mt-1">
            Gérer les alertes et notifications système.
          </p>
          <p className="text-xs text-gray-400 mt-3 italic">Bientôt disponible...</p>
        </div>

        {/* Audit */}
        <Link
          to="/audit"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-indigo-300 transition-all group"
        >
          <div className="text-3xl mb-3">📊</div>
          <h2 className="text-lg font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">
            Audit
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Traçabilité des actions et journal d'audit.
          </p>
        </Link>
      </div>
    </div>
  );
}
