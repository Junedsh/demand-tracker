import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ResetPasswordPage() {
    const navigate = useNavigate()
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [sessionReady, setSessionReady] = useState(false)

    // Supabase sends the token in the URL hash — we need to wait for the session
    useEffect(() => {
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY' && session) {
                setSessionReady(true)
            }
        })
    }, [])

    async function handleReset(e) {
        e.preventDefault()
        if (!password) return setError('Please enter a new password')
        if (password.length < 6) return setError('Password must be at least 6 characters')
        if (password !== confirm) return setError('Passwords do not match')
        setLoading(true)
        setError('')
        const { error } = await supabase.auth.updateUser({ password })
        setLoading(false)
        if (error) {
            setError(error.message)
        } else {
            setSuccess(true)
            setTimeout(() => navigate('/login'), 3000)
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">Set New Password</div>
                <div className="auth-sub">Choose a strong password for your account</div>

                {success ? (
                    <div style={{
                        marginTop: 24, padding: 16, background: 'rgba(22,163,74,0.08)',
                        border: '1px solid #16a34a', borderRadius: 'var(--radius)', textAlign: 'center'
                    }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
                        <div style={{ fontWeight: 600, color: '#16a34a', marginBottom: 4 }}>Password updated!</div>
                        <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                            Redirecting you to login…
                        </div>
                    </div>
                ) : !sessionReady ? (
                    <div style={{ marginTop: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                        <div className="spinner" style={{ margin: '0 auto 12px' }} />
                        Verifying reset link…
                    </div>
                ) : (
                    <form onSubmit={handleReset} style={{ marginTop: 24 }}>
                        {error && <div className="auth-error">{error}</div>}
                        <div className="field">
                            <label>New Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Min. 6 characters"
                                autoFocus
                            />
                        </div>
                        <div className="field">
                            <label>Confirm Password</label>
                            <input
                                type="password"
                                value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                placeholder="Re-enter password"
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '10px' }}
                            disabled={loading}
                        >
                            {loading
                                ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Updating…</>
                                : 'Set New Password'
                            }
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}