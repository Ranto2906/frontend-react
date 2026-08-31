import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Demandes from './pages/Demandes';
import Patrimoine from './pages/Patrimoine';
import SuiviTerrain from './pages/SuiviTerrain';
import Carte from './pages/Carte';
import Signalements from './pages/Signalements';
import Finances from './pages/Finances';
import Admin from './pages/Admin';
import Utilisateurs from './pages/Utilisateurs';
import Roles from './pages/Roles';
import Journal from './pages/Journal';
import Sessions from './pages/Sessions';

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
            <Route path="suivi" element={<SuiviTerrain />} />
            <Route path="carte" element={<Carte />} />
            <Route path="signalements" element={<Signalements />} />
            <Route path="finances" element={<Finances />} />
            <Route path="utilisateurs" element={<Utilisateurs />} />
            <Route path="roles" element={<Roles />} />
            <Route path="journal" element={<Journal />} />
            <Route path="sessions" element={<Sessions />} />
            <Route path="admin" element={<Admin />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
