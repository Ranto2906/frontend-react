import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import Demandes from './pages/demandes/Demandes';
import SuiviDossier from './pages/demandes/SuiviDossier';
import DemandeForm from './pages/demandes/DemandeForm';
import DetailDemande from './pages/demandes/DetailDemande';
import GestionEtapes from './pages/demandes/GestionEtapes';
import GestionTypesDossier from './pages/demandes/GestionTypesDossier';
import Patrimoine from './pages/patrimoine/Patrimoine';
import SuiviTerrain from './pages/suivi/SuiviTerrain';
import GestionVille from './pages/suivi/terrain/GestionVille';
import GestionLieu from './pages/suivi/terrain/GestionLieu';
import GestionPropriete from './pages/suivi/terrain/GestionPropriete';
import DetailPropriete from './pages/suivi/terrain/DetailPropriete';
import GestionPrixM2 from './pages/suivi/terrain/GestionPrixM2';
import DetailPrixM2 from './pages/suivi/terrain/DetailPrixM2';
import GestionParcelle from './pages/suivi/terrain/GestionParcelle';
import SuiviNotificationsHub from './pages/suivi-notifications/suivi/SuiviNotificationsHub';
import GestionPersonne from './pages/suivi-notifications/personne/GestionPersonne';
import DetailPersonne from './pages/suivi-notifications/personne/DetailPersonne';
import CreatePersonne from './pages/suivi-notifications/personne/CreatePersonne';
import NotificationOccupation from './pages/suivi-notifications/notification/NotificationOccupation';
import NotificationOccupationForm from './pages/suivi-notifications/notification/NotificationOccupationForm';
import DetailNotificationOccupation from './pages/suivi-notifications/notification/DetailNotificationOccupation';
import Avertissement from './pages/suivi-notifications/avertissement/Avertissement';
import AvertissementForm from './pages/suivi-notifications/avertissement/AvertissementForm';
import DetailAvertissement from './pages/suivi-notifications/avertissement/DetailAvertissement';
import SuiviNotifications from './pages/suivi-notifications/suivi/SuiviNotifications';
import GestionEtapesNotification from './pages/suivi-notifications/suivi/GestionEtapesNotification';
import SuiviForm from './pages/suivi-notifications/suivi/SuiviForm';
import DetailSuiviNotification from './pages/suivi-notifications/notification/DetailSuiviNotification';
import Assignations from './pages/suivi-notifications/assignation/Assignations';
import DetailAssignation from './pages/suivi-notifications/assignation/DetailAssignation';
import AssignationForm from './pages/suivi-notifications/assignation/AssignationForm';
import Carte from './pages/carte/Carte';
import Signalements from './pages/signalements/Signalements';
import SignalementForm from './pages/signalements/SignalementForm';
import DetailSignalement from './pages/signalements/DetailSignalement';
import GestionMobile from './pages/gestion-mobile/GestionMobile';
import DescentesTerrain from './pages/gestion-mobile/DescentesTerrain';
import DescenteTerrainForm from './pages/gestion-mobile/DescenteTerrainForm';
import DetailDescenteTerrain from './pages/gestion-mobile/DetailDescenteTerrain';
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
            <Route path="demandes" element={<SuiviDossier />} />
            <Route path="demandes/liste" element={<Demandes />} />
            <Route path="demandes/etapes" element={<GestionEtapes />} />
            <Route path="demandes/types-dossier" element={<GestionTypesDossier />} />
            <Route path="demandes/nouveau" element={<DemandeForm />} />
            <Route path="demandes/:id" element={<DetailDemande />} />
            <Route path="demandes/:id/modifier" element={<DemandeForm />} />
            <Route path="patrimoine" element={<Patrimoine />} />
            <Route path="suivi-notifications" element={<SuiviNotificationsHub />} />
            <Route path="suivi-notifications/personnes" element={<GestionPersonne />} />
            <Route path="suivi-notifications/personnes/nouvelle" element={<CreatePersonne />} />
            <Route path="suivi-notifications/personnes/:id" element={<DetailPersonne />} />
            <Route path="suivi-notifications/occupation" element={<NotificationOccupation />} />
            <Route path="suivi-notifications/occupation/nouvelle" element={<NotificationOccupationForm />} />
            <Route path="suivi-notifications/occupation/:id/modifier" element={<NotificationOccupationForm />} />
            <Route path="suivi-notifications/occupation/:id" element={<DetailNotificationOccupation />} />
            <Route path="suivi-notifications/avertissements" element={<Avertissement />} />
            <Route path="suivi-notifications/avertissements/nouvelle" element={<AvertissementForm />} />
            <Route path="suivi-notifications/avertissements/:id/modifier" element={<AvertissementForm />} />
            <Route path="suivi-notifications/avertissements/:id" element={<DetailAvertissement />} />
            <Route path="suivi-notifications/suivi" element={<SuiviNotifications />} />
            <Route path="suivi-notifications/config-etapes" element={<GestionEtapesNotification />} />
            <Route path="suivi-notifications/suivi/nouvelle" element={<SuiviForm />} />
            <Route path="suivi-notifications/suivi/:id/modifier" element={<SuiviForm />} />
            <Route path="suivi-notifications/suivi/:id" element={<DetailSuiviNotification />} />
            <Route path="suivi-notifications/assignations" element={<Assignations />} />
            <Route path="suivi-notifications/assignations/nouvelle" element={<AssignationForm />} />
            <Route path="suivi-notifications/assignations/:id" element={<DetailAssignation />} />
            <Route path="suivi" element={<SuiviTerrain />} />
            <Route path="suivi/villes" element={<GestionVille />} />
            <Route path="suivi/lieux" element={<GestionLieu />} />
            <Route path="suivi/proprietes" element={<GestionPropriete />} />
            <Route path="suivi/proprietes/:id" element={<DetailPropriete />} />
            <Route path="suivi/prix-m2" element={<GestionPrixM2 />} />
            <Route path="suivi/prix-m2/:id" element={<DetailPrixM2 />} />
            <Route path="suivi/parcelles" element={<GestionParcelle />} />
            <Route path="carte" element={<Carte />} />
            <Route path="gestion-mobile" element={<GestionMobile />} />
            <Route path="descentes-terrain" element={<DescentesTerrain />} />
            <Route path="descentes-terrain/nouveau" element={<DescenteTerrainForm />} />
            <Route path="descentes-terrain/:id" element={<DetailDescenteTerrain />} />
            <Route path="descentes-terrain/:id/modifier" element={<DescenteTerrainForm />} />
            <Route path="signalements" element={<Signalements />} />
            <Route path="signalements/nouveau" element={<SignalementForm />} />
            <Route path="signalements/:id/modifier" element={<SignalementForm />} />
            <Route path="signalements/:id" element={<DetailSignalement />} />
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
