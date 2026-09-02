import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import Demandes from './pages/demandes/Demandes';
import Patrimoine from './pages/patrimoine/Patrimoine';
import SuiviTerrain from './pages/suivi/SuiviTerrain';
import SuiviNotificationsHub from './pages/suivi-notifications/SuiviNotificationsHub';
import GestionPersonne from './pages/suivi-notifications/GestionPersonne';
import NotificationOccupation from './pages/suivi-notifications/NotificationOccupation';
import Avertissement from './pages/suivi-notifications/Avertissement';
import SuiviNotifications from './pages/suivi-notifications/SuiviNotifications';
import Carte from './pages/carte/Carte';
import Signalements from './pages/signalements/Signalements';
import Finances from './pages/finances/Finances';
import Admin from './pages/admin/Admin';
import Utilisateurs from './pages/utilisateurs/Utilisateurs';
import Roles from './pages/roles/Roles';
import Journal from './pages/journal/Journal';
import Sessions from './pages/sessions/Sessions';
import Audit from './pages/audit/Audit';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="demandes" element={<Demandes />} />
            <Route path="patrimoine" element={<Patrimoine />} />
            <Route path="suivi-notifications" element={<SuiviNotificationsHub />} />
            <Route path="suivi-notifications/personnes" element={<GestionPersonne />} />
            <Route path="suivi-notifications/occupation" element={<NotificationOccupation />} />
            <Route path="suivi-notifications/avertissements" element={<Avertissement />} />
            <Route path="suivi-notifications/suivi" element={<SuiviNotifications />} />
            <Route path="suivi" element={<SuiviTerrain />} />
            <Route path="carte" element={<Carte />} />
            <Route path="signalements" element={<Signalements />} />
            <Route path="finances" element={<Finances />} />
            <Route path="utilisateurs" element={<Utilisateurs />} />
            <Route path="roles" element={<Roles />} />
            <Route path="journal" element={<Journal />} />
            <Route path="sessions" element={<Sessions />} />
            <Route path="audit" element={<Audit />} />
            <Route path="admin" element={<Admin />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
