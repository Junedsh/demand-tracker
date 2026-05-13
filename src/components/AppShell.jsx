import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Icons } from './Icons'
import { useToast, ToastContainer } from '../hooks/useToast.jsx'

const ROLE_LABELS = {
  admin: 'Admin',
  abo: 'Area Business Owner',
  lm: 'Line Manager',
  owner: 'Action Owner',
  store: 'Store Staff',
}

export default function AppShell() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const { toasts, toast } = useToast()

  const role = profile?.role ?? 'store'
  const initials = profile?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const canSeeDashboard = ['admin', 'lm', 'abo'].includes(role)
  const canSeeDemands = ['admin', 'lm', 'abo'].includes(role)
  const canSeeActions = ['admin', 'owner'].includes(role)
  const canSeeStore = role === 'store'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-name">Demand Tracker</div>
          <div className="sidebar-brand-sub">Store Execution System</div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Menu</div>

          {canSeeDashboard && (
            <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              {Icons.home} Dashboard
            </NavLink>
          )}

          {canSeeDemands && (
            <NavLink to="/demands" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              {Icons.list} All Demands
            </NavLink>
          )}

          {canSeeActions && (
            <NavLink to="/my-actions" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              {Icons.check} My Actions
            </NavLink>
          )}

          {canSeeStore && (
            <NavLink to="/store-view" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              {Icons.store} My Demands
            </NavLink>
          )}

          <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            {Icons.user} Profile
          </NavLink>
        </div>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{profile?.full_name ?? 'User'}</div>
              <div className="user-role">{ROLE_LABELS[role] ?? role}</div>
            </div>
            <button className="sign-out-btn" onClick={handleSignOut} title="Sign out" aria-label="Sign out">
              {Icons.logout}
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        <Outlet context={{ toast }} />
      </main>

      <ToastContainer toasts={toasts} />
    </div>
  )
}