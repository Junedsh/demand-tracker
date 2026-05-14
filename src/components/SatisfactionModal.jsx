import { useState } from 'react'
import { Icons } from './Icons'

export default function SatisfactionModal({ demand, onClose, onSave }) {
    const [satisfaction, setSatisfaction] = useState('')
    const [reason, setReason] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    async function handleSave() {
        if (!satisfaction) return setError('Please select Satisfied or Not Satisfied')
        if (satisfaction === 'not_satisfied' && !reason.trim()) return setError('Please explain why you are not satisfied')
        setSaving(true)
        setError('')
        try {
            await onSave({ satisfaction, satisfaction_reason: reason })
        } catch (e) {
            setError(e.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <div className="modal-title">Was this demand fulfilled?</div>
                    <button className="btn btn-icon" onClick={onClose} aria-label="Close">{Icons.x}</button>
                </div>

                <div className="modal-body">
                    {/* Demand context */}
                    <div className="info-box">
                        <div className="info-box-label">Store · LM</div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                            {demand?.store_name} · {demand?.lm_name}
                        </div>
                        <div style={{ color: 'var(--text2)', fontSize: 13 }}>
                            {demand?.original_ask}
                        </div>
                        {demand?.department && (
                            <div style={{ marginTop: 6 }}>
                                <span className="tag">{demand.department}</span>
                            </div>
                        )}
                    </div>

                    {/* Owner's remarks if any */}
                    {demand?.remarks && (
                        <div className="info-box" style={{ marginTop: 8, background: 'var(--surface3)' }}>
                            <div className="info-box-label">Owner's Remarks</div>
                            <div style={{ fontSize: 13, color: 'var(--text2)' }}>{demand.remarks}</div>
                        </div>
                    )}

                    {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

                    {/* Satisfied / Not Satisfied toggle */}
                    <div className="field" style={{ marginTop: 16 }}>
                        <label>Your Response <span className="req">*</span></label>
                        <div className="decision-group">
                            <button
                                className={`decision-btn accept ${satisfaction === 'satisfied' ? 'active' : ''}`}
                                onClick={() => { setSatisfaction('satisfied'); setError('') }}
                            >
                                {Icons.check} Satisfied
                            </button>
                            <button
                                className={`decision-btn reject ${satisfaction === 'not_satisfied' ? 'active' : ''}`}
                                onClick={() => { setSatisfaction('not_satisfied'); setError('') }}
                            >
                                {Icons.x} Not Satisfied
                            </button>
                        </div>
                    </div>

                    {/* Reason — only required when not satisfied */}
                    {satisfaction === 'not_satisfied' && (
                        <div className="field">
                            <label>Reason <span className="req">*</span></label>
                            <textarea
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                placeholder="What was missing or incorrect? Why is this still incomplete?"
                                style={{ minHeight: 80 }}
                            />
                        </div>
                    )}

                    {/* Optional reason when satisfied */}
                    {satisfaction === 'satisfied' && (
                        <div className="field">
                            <label>Any comments? <span style={{ fontSize: 11, color: 'var(--text3)' }}>(optional)</span></label>
                            <textarea
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                placeholder="Optional feedback…"
                                style={{ minHeight: 56 }}
                            />
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving
                            ? <><div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} /> Saving…</>
                            : <>{Icons.check} Submit Response</>
                        }
                    </button>
                </div>
            </div>
        </div>
    )
}