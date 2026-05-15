import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import AppShell from './components/AppShell'
import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import DemandsPage from './pages/DemandsPage'
import MyActionsPage from './pages/MyActionsPage'
import StoreViewPage from './pages/StoreViewPage'
import ProfilePage from './pages/ProfilePage'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading"><div className="spinner" /> Loading…</div>
  return user ? children : <Navigate to="/login" replace />
}

function DefaultRedirect() {
  const { profile } = useAuth()
  const role = profile?.role
  if (role === 'owner') return <Navigate to="/dashboard" replace />
  if (role === 'store') return <Navigate to="/store-view" replace />
  return <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/" element={<PrivateRoute><AppShell /></PrivateRoute>}>
        <Route index element={<DefaultRedirect />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="demands" element={<DemandsPage />} />
        <Route path="my-actions" element={<MyActionsPage />} />
        <Route path="store-view" element={<StoreViewPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  )
}