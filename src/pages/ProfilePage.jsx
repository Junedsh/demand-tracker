import { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const ROLES = [
  { value: 'admin', label: 'Admin', desc: 'Full access — manage demands, reviews, users' },
  { value: 'lm', label: 'Line Manager (LM)', desc: 'Add demands for stores, view all demands' },
  { value: 'owner', label: 'Action Owner', desc: 'Review and resolve assigned demands' },
  { value: 'store', label: 'Store Staff', desc: 'Submit demands and view your store status' },
]

export default function ProfilePage() {
  const { toast } = useOutletContext()
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [storeName, setStoreName] = useState('')
  const [saving, setSaving] = useState(false)

  // Load profile values once profile is available from Supabase
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '')
      setStoreName(profile.store_name ?? '')
    }
  }, [profile])

  const roleInfo = ROLES.find(r => r.value === profile?.role)

  async function handleSave() {
    if (!profile?.id) return toast('Profile not loaded yet', 'error')
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, store_name: storeName })
      .eq('id', profile.id)
    if (error) toast(error.message, 'error')
    else toast('Profile updated', 'success')
    setSaving(false)
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Profile</div>
          <div className="page-sub">Your account settings</div>
        </div>
      </div>

      <div className="page-body">
        <div style={{ maxWidth: 480 }}>

          {/* Account Details */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Account Details</div>

            <div className="field">
              <label>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            {profile?.role === 'store' && (
              <div className="field">
                <label>Store Name</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={e => setStoreName(e.target.value)}
                  placeholder="e.g. 7 Rasta Byculla"
                />
              </div>
            )}

            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={profile?.email ?? ''}
                disabled
                style={{ opacity: 0.6 }}
              />
            </div>

            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>

          {/* Role Info */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Your Role</div>
            {roleInfo ? (
              <div style={{ background: 'var(--accent-light)', border: '1px solid #b8d4bf', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
                <div style={{ fontWeight: 600, color: 'var(--accent-text)', marginBottom: 2 }}>{roleInfo.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{roleInfo.desc}</div>
              </div>
            ) : (
              <div style={{ color: 'var(--text3)', fontSize: 13 }}>
                {profile?.role ? `Role: ${profile.role}` : 'Role not assigned yet'}
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 10 }}>
              Role is assigned by admin. Contact your system administrator to change it.
            </div>
          </div>

          {/* Sign Out */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Sign Out</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>
              You will be returned to the login page.
            </div>
            <button className="btn btn-danger" onClick={handleSignOut}>
              {Icons_logout} Sign Out
            </button>
          </div>

        </div>
      </div>
    </>
  )
}

// Inline logout icon to avoid import dependency
const Icons_logout = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)