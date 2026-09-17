import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import Accueil from './components/accueil/Accueil'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import ForgotPassword from './components/auth/ForgotPassword'
import PolitiqueConfidentialite from './components/legal/PolitiqueConfidentialite'
import DashboardAdmin from './components/dashboard/DashboardAdmin'
import DashboardMembre from './components/dashboard/DashboardMembre'
import DashboardJewrin from './components/dashboard/DashboardJewrin'
import XewXewYi from './components/informations/XewXewYi'
import Cotisations from './components/finance/Cotisations'
import GestionDepenses from './components/finance/GestionDepenses'
import ProgrammeKamil from './components/culturelle/ProgrammeKamil'
import MesProgressions from './components/culturelle/MesProgressions'
import ValidationsKamil from './components/culturelle/ValidationsKamil'
import Majaaliss from './components/culturelle/Majaaliss'
import Laaj from './components/culturelle/Laaj'
import ThemeCulturelle from './components/culturelle/ThemeCulturelle'
import Messagerie from './components/communication/Messagerie'
import Canaux from './components/communication/Canaux'
import Notifications from './components/communication/Notifications'
import ProjetsSociaux from './components/sociale/ProjetsSociaux'
import Organisation from './components/organisation/Organisation'
import EvenementsOrganisation from './components/organisation/EvenementsOrganisation'
import Conservatoire from './components/conservatoire/Conservatoire'
import Bibliotheque from './components/bibliotheque/Bibliotheque'
import Cours from './components/scientifique/Cours'
import MonProfil from './components/comptes/MonProfil'
import GestionMembres from './components/comptes/GestionMembres'
import FicheMembre from './components/comptes/FicheMembre'
import GestionRolesPermissions from './components/comptes/GestionRolesPermissions'
import JournalSecurite from './components/comptes/JournalSecurite'

const JEWRINE_ROLES = [
  'jewrin',
  'jewrine_conservatoire',
  'jewrine_finance',
  'jewrine_culturelle',
  'jewrine_sociale',
  'jewrine_communication',
  'jewrine_organisation',
]

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  const isJewrine =
    !!user?.role &&
    (user.role === 'jewrin' ||
      user.role.toLowerCase().startsWith('jewrine_'))
  const defaultDashboard = user?.role === 'admin' ? '/admin' : isJewrine ? '/jewrin' : '/membre'
  return (
    <Routes>
      {/* Racine : par défaut on affiche l'accueil (ou redirection dashboard si connecté) */}
      <Route path="/" element={user ? <Navigate to={defaultDashboard} replace /> : <Accueil />} />
      <Route path="/accueil" element={<Accueil />} />
      <Route path="/login" element={user ? <Navigate to={defaultDashboard} replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={defaultDashboard} replace /> : <Register />} />
      <Route path="/mot-de-passe-oublie" element={user ? <Navigate to={defaultDashboard} replace /> : <ForgotPassword />} />
      <Route path="/privacy" element={<PolitiqueConfidentialite />} />
      <Route path="/confidentialite" element={<PolitiqueConfidentialite />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Pas de route "index" ici : le "/" exact est déjà géré par la route racine
        ci-dessus (Accueil ou redirection dashboard). Une route index redondante sur ce
        Layout gagnait le classement de React Router face à la route racine et affichait
        systématiquement /login au chargement pour les visiteurs non connectés. */}
        <Route path="admin" element={<ProtectedRoute roles={['admin']}><DashboardAdmin /></ProtectedRoute>} />
        <Route path="membre" element={<ProtectedRoute roles={['membre']}><DashboardMembre /></ProtectedRoute>} />
        <Route path="jewrin" element={<ProtectedRoute roles={JEWRINE_ROLES}><DashboardJewrin /></ProtectedRoute>} />
        <Route path="informations/xew-xew-yi" element={<XewXewYi />} />
        {/* Anciennes URLs (News/Événements séparés) redirigées vers le flux fusionné */}
        <Route path="informations/evenements" element={<Navigate to="/informations/xew-xew-yi" replace />} />
        <Route path="informations/news" element={<Navigate to="/informations/xew-xew-yi" replace />} />
        <Route path="finance/cotisations" element={<Cotisations />} />
        <Route path="finance/depenses" element={<GestionDepenses />} />
        <Route path="culturelle/kamil" element={<ProgrammeKamil />} />
        <Route path="culturelle/mes-progressions" element={<MesProgressions />} />
        <Route path="culturelle/validations" element={<ValidationsKamil />} />
        <Route path="culturelle/majaaliss" element={<Majaaliss />} />
        <Route path="culturelle/laaj" element={<Laaj />} />
        <Route path="culturelle/theme-culturelle" element={<ThemeCulturelle />} />
        <Route path="communication/messagerie" element={<Messagerie />} />
        <Route path="communication/canaux" element={<Canaux />} />
        <Route path="communication/notifications" element={<Notifications />} />
        <Route path="sociale/projets" element={<ProjetsSociaux />} />
        <Route path="organisation" element={<Organisation />} />
        <Route path="organisation/evenements" element={<EvenementsOrganisation />} />
        <Route path="conservatoire" element={<Conservatoire />} />
        <Route path="bibliotheque" element={<Bibliotheque />} />
        <Route path="scientifique/cours" element={<Cours />} />
        <Route path="comptes/profil" element={<MonProfil />} />
        <Route path="admin/membres" element={<ProtectedRoute roles={['admin']}><GestionMembres /></ProtectedRoute>} />
        <Route path="admin/membres/:id" element={<ProtectedRoute roles={['admin']}><FicheMembre /></ProtectedRoute>} />
        <Route path="comptes/roles-permissions" element={<ProtectedRoute roles={['admin']}><GestionRolesPermissions /></ProtectedRoute>} />
        <Route path="comptes/journal-securite" element={<ProtectedRoute roles={['admin']}><JournalSecurite /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return <AppRoutes />
}
