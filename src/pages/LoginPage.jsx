import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotError, setForgotError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) return setError('Please enter email and password')
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    if (!forgotEmail.trim()) return setForgotError('Please enter your email')
    setForgotLoading(true)
    setForgotError('')
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}${window.location.pathname}#/reset-password`,
    })
    setForgotLoading(false)
    if (error) {
      setForgotError(error.message)
    } else {
      setForgotSent(true)
    }
  }

  // Forgot password view
  if (showForgot) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">Reset Password</div>
          <div className="auth-sub">Enter your email and we'll send you a reset link</div>

          {forgotSent ? (
            <div style={{
              marginTop: 24, padding: 16, background: 'rgba(22,163,74,0.08)',
              border: '1px solid #16a34a', borderRadius: 'var(--radius)', textAlign: 'center'
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📧</div>
              <div style={{ fontWeight: 600, color: '#16a34a', marginBottom: 4 }}>Reset link sent!</div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                Check your inbox at <strong>{forgotEmail}</strong> and click the link to reset your password.
              </div>
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
                onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail('') }}
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} style={{ marginTop: 24 }}>
              {forgotError && <div className="auth-error">{forgotError}</div>}
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="you@zeno.health"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '10px' }}
                disabled={forgotLoading}
              >
                {forgotLoading
                  ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Sending…</>
                  : 'Send Reset Link'
                }
              </button>
              <button
                type="button"
                className="btn"
                style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                onClick={() => { setShowForgot(false); setForgotError('') }}
              >
                Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  // Normal login view
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">Demand Tracker</div>
        <div className="auth-sub">Store Execution & Ownership System</div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@zeno.health"
              autoFocus
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '10px' }}
            disabled={loading}
          >
            {loading
              ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Signing in…</>
              : 'Sign In'
            }
          </button>
        </form>

        {/* Forgot password link */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            type="button"
            onClick={() => { setShowForgot(true); setForgotEmail(email); setError('') }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: 'var(--text3)',
              textDecoration: 'underline', padding: 0,
            }}
          >
            Forgot password?
          </button>
        </div>
      </div>
    </div>
  )
}