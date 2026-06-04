import { useState } from 'react'
import { Icons } from './Icons'

export default function RejectModal({ demand, onClose, onSave }) {
    const [reason, setReason] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    async function handleSave() {
        if (!reason.trim()) return setError('Please enter a rejection reason')
        setSaving(true)
        setError('')
        try {
            await onSave({ reason })
        } catch (e) {
            setError(e.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 480 }}>
                <div className="modal-header">
                    <div className="modal-title">Reject Demand</div>
                    <button className="btn btn-icon" onClick={onClose}>{Icons.x}</button>
                </div>
                <div className="modal-body">
                    <div className="info-box">
                        <div className="info-box-label">Store · LM</div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{demand?.store_name} · {demand?.lm_name}</div>
                        <div style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.5 }}>{demand?.original_ask}</div>
                    </div>

                    {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

                    <div className="field" style={{ marginTop: 16 }}>
                        <label>Rejection Reason <span className="req">*</span></label>
                        <textarea
                            value={reason}
                            onChange={e => { setReason(e.target.value); setError('') }}
                            placeholder="Why is this demand being rejected?"
                            style={{ minHeight: 96 }}
                            autoFocus
                        />
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn" onClick={onClose}>Cancel</button>
                    <button
                        className="btn"
                        onClick={handleSave}
                        disabled={saving}
                        style={{ background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' }}
                    >
                        {saving
                            ? <><div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} /> Saving…</>
                            : <>{Icons.x} Reject Demand</>
                        }
                    </button>
                </div>
            </div>
        </div>
    )
}