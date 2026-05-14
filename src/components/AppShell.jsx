import { useState } from 'react'
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

const CollapseIcon = ({ collapsed }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    style={{ width: 16, height: 16, transition: 'transform 0.2s', transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

export default function AppShell() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const { toasts, toast } = useToast()
  const [collapsed, setCollapsed] = useState(false)

  const role = profile?.role ?? 'store'
  const initials = profile?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const canSeeDashboard = ['admin', 'lm', 'abo', 'owner'].includes(role)
  const canSeeDemands = ['admin', 'lm', 'abo'].includes(role)
  const canSeeActions = ['admin', 'owner'].includes(role)
  const canSeeStore = role === 'store'

  return (
    <div className="app-shell">
      <aside className="sidebar" style={{
        width: collapsed ? 56 : undefined,
        minWidth: collapsed ? 56 : undefined,
        overflow: 'hidden',
        transition: 'width 0.22s ease, min-width 0.22s ease',
      }}>

        {/* Brand */}
        <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {!collapsed && (
            <div>
              <div className="sidebar-brand-name">Demand Tracker</div>
              <div className="sidebar-brand-sub">Store Execution System</div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text2)',
              padding: 4,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginLeft: collapsed ? 'auto' : undefined,
            }}
          >
            <CollapseIcon collapsed={collapsed} />
          </button>
        </div>

        {/* Nav */}
        <div className="sidebar-section">
          {!collapsed && <div className="sidebar-section-label">Menu</div>}

          {canSeeDashboard && (
            <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? 'Dashboard' : undefined}
              style={{ justifyContent: collapsed ? 'center' : undefined, padding: collapsed ? '10px 0' : undefined }}
            >
              {Icons.home}
              {!collapsed && 'Dashboard'}
            </NavLink>
          )}

          {canSeeDemands && (
            <NavLink to="/demands" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? 'All Demands' : undefined}
              style={{ justifyContent: collapsed ? 'center' : undefined, padding: collapsed ? '10px 0' : undefined }}
            >
              {Icons.list}
              {!collapsed && 'All Demands'}
            </NavLink>
          )}

          {canSeeActions && (
            <NavLink to="/my-actions" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? 'My Actions' : undefined}
              style={{ justifyContent: collapsed ? 'center' : undefined, padding: collapsed ? '10px 0' : undefined }}
            >
              {Icons.check}
              {!collapsed && 'My Actions'}
            </NavLink>
          )}

          {canSeeStore && (
            <NavLink to="/store-view" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? 'My Demands' : undefined}
              style={{ justifyContent: collapsed ? 'center' : undefined, padding: collapsed ? '10px 0' : undefined }}
            >
              {Icons.store}
              {!collapsed && 'My Demands'}
            </NavLink>
          )}

          <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={collapsed ? 'Profile' : undefined}
            style={{ justifyContent: collapsed ? 'center' : undefined, padding: collapsed ? '10px 0' : undefined }}
          >
            {Icons.user}
            {!collapsed && 'Profile'}
          </NavLink>
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          {collapsed ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '8px 0' }}>
              <div className="user-avatar" title={profile?.full_name ?? 'User'}>{initials}</div>
              <button className="sign-out-btn" onClick={handleSignOut} title="Sign out" aria-label="Sign out">
                {Icons.logout}
              </button>
            </div>
          ) : (
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
          )}
        </div>
      </aside>

      <main className="main">
        <Outlet context={{ toast }} />
      </main>

      <ToastContainer toasts={toasts} />
    </div>
  )
}