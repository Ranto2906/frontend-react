import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Tableau de bord', icon: '📊' },
  { to: '/demandes', label: 'Demandes', icon: '📁' },
  { to: '/patrimoine', label: 'Patrimoine', icon: '🏘️' },
  { to: '/suivi', label: 'Suivi terrain', icon: '🗺️' },
  { to: '/carte', label: 'Carte', icon: '📍' },
  { to: '/signalements', label: 'Signalements', icon: '📢' },
  { to: '/finances', label: 'Finances', icon: '💰' },
  { to: '/utilisateurs', label: 'Utilisateurs', icon: '👥' },
  { to: '/roles', label: 'Rôles & Permissions', icon: '🛡️' },
  { to: '/journal', label: 'Journal connexions', icon: '📋' },
  { to: '/sessions', label: 'Sessions', icon: '🔐' },
  { to: '/audit', label: 'Audit', icon: '📊' },
  { to: '/admin', label: 'Administration', icon: '⚙️' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">🏛️ SEIMAD</h1>
          <p className="text-xs text-gray-400 mt-1">Patrimoine Foncier</p>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
              {user?.nomUtilisateur?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.nomComplet || user?.nomUtilisateur}</p>
              <p className="text-xs text-gray-400 truncate">
                {user?.roles?.map((r) => r.nomRole).join(', ')}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm text-center transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
