import { useState, useEffect } from 'react'
import { Icons } from './Icons'

export default function ReviewModal({ demand, onClose, onSave }) {
  const [decision, setDecision] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [promiseDate, setPromiseDate] = useState('')
  const [status, setStatus] = useState('')
  const [remarks, setRemarks] = useState('')
  const [clarificationNote, setClarificationNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (demand) {
      setDecision(demand.decision ?? '')
      setRejectReason(demand.reject_reason ?? '')
      setPromiseDate(demand.promise_date ?? '')
      setStatus(demand.status ?? '')
      setRemarks(demand.remarks ?? '')
      setClarificationNote(demand.clarification_note ?? '')
    }
  }, [demand])

  async function handleSave() {
    if (!decision) return setError('Please select Accept, Reject, or Need Clarification')
    if (decision === 'Reject' && !rejectReason.trim()) return setError('Rejection reason is required')
    if (decision === 'Clarification' && !clarificationNote.trim()) return setError('Please describe what clarification is needed')
    setSaving(true)
    setError('')
    try {
      const payload = {
        decision: decision === 'Clarification' ? null : decision,
        reject_reason: rejectReason,
        promise_date: promiseDate,
        status: decision === 'Clarification' ? 'Pending' : status,
        remarks,
        clarification_needed: decision === 'Clarification',
        clarification_note: decision === 'Clarification' ? clarificationNote : null,
      }
      await onSave(payload)
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
          <div className="modal-title">Review Demand</div>
          <button className="btn btn-icon" onClick={onClose} aria-label="Close">{Icons.x}</button>
        </div>
        <div className="modal-body">

          {/* Demand context */}
          <div className="info-box">
            <div className="info-box-label">Store · LM</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{demand?.store_name} · {demand?.lm_name}</div>
            <div style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.5 }}>{demand?.original_ask}</div>
            {demand?.department && (
              <div style={{ marginTop: 6 }}>
                <span className="tag">{demand.department}</span>
              </div>
            )}
          </div>

          {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

          {/* Decision buttons */}
          <div className="field">
            <label>Decision <span className="req">*</span></label>
            <div className="decision-group" style={{ flexWrap: 'wrap' }}>
              <button
                className={`decision-btn accept ${decision === 'Accept' ? 'active' : ''}`}
                onClick={() => { setDecision('Accept'); setError('') }}
              >
                {Icons.check} Accept
              </button>
              <button
                className={`decision-btn reject ${decision === 'Reject' ? 'active' : ''}`}
                onClick={() => { setDecision('Reject'); setError('') }}
              >
                {Icons.x} Reject
              </button>
              <button
                className={`decision-btn ${decision === 'Clarification' ? 'active' : ''}`}
                onClick={() => { setDecision('Clarification'); setError('') }}
                style={{
                  borderColor: decision === 'Clarification' ? 'var(--amber)' : 'var(--border)',
                  background: decision === 'Clarification' ? 'rgba(245,158,11,0.1)' : 'var(--surface)',
                  color: decision === 'Clarification' ? 'var(--amber)' : 'var(--text2)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                Need Clarification
              </button>
            </div>
          </div>

          {/* Clarification note */}
          {decision === 'Clarification' && (
            <div className="field">
              <label>What needs to be clarified? <span className="req">*</span></label>
              <textarea
                value={clarificationNote}
                onChange={e => setClarificationNote(e.target.value)}
                placeholder="e.g. Please specify the exact product SKU, quantity needed, and whether this is a one-time or recurring requirement…"
                style={{ minHeight: 96 }}
                autoFocus
              />
              <div className="field-hint">This will be visible to the LM, ABO, and Store so they can update the demand.</div>
            </div>
          )}

          {/* Rejection reason */}
          {decision === 'Reject' && (
            <div className="field">
              <label>Rejection Reason <span className="req">*</span></label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Explain why this demand cannot be fulfilled…"
              />
            </div>
          )}

          {/* Promise date — only for Accept */}
          {decision === 'Accept' && (
            <div className="field">
              <label>Promise Date</label>
              <input
                type="date"
                value={promiseDate}
                onChange={e => setPromiseDate(e.target.value)}
              />
              <div className="field-hint">When will this be resolved?</div>
            </div>
          )}

          {/* Status — hide for clarification */}
          {decision !== 'Clarification' && (
            <div className="field">
              <label>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}>
                <option value="">Not set</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
            </div>
          )}

          {/* Remarks — hide for clarification */}
          {decision !== 'Clarification' && (
            <div className="field">
              <label>Remarks</label>
              <textarea
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Any notes or additional context…"
                style={{ minHeight: 64 }}
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving
              ? <><div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} /> Saving…</>
              : <>{Icons.check} Save Review</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}