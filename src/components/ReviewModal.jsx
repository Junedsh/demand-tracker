import { useState, useEffect } from 'react'
import { Icons } from './Icons'

export default function ReviewModal({ demand, onClose, onSave }) {
  const [decision, setDecision] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [promiseDate, setPromiseDate] = useState('')
  const [status, setStatus] = useState('')
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (demand) {
      setDecision(demand.decision ?? '')
      setRejectReason(demand.reject_reason ?? '')
      setPromiseDate(demand.promise_date ?? '')
      setStatus(demand.status ?? '')
      setRemarks(demand.remarks ?? '')
    }
  }, [demand])

  async function handleSave() {
    if (!decision) return setError('Please select Accept or Reject')
    if (decision === 'Reject' && !rejectReason.trim()) return setError('Rejection reason is required')
    setSaving(true)
    setError('')
    try {
      await onSave({ decision, reject_reason: rejectReason, promise_date: promiseDate, status, remarks })
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
          <div className="info-box">
            <div className="info-box-label">Store · LM</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{demand?.store_name} · {demand?.lm_name}</div>
            <div style={{ color: 'var(--text2)', fontSize: 13 }}>{demand?.polished_ask || demand?.original_ask}</div>
            {demand?.department && (
              <div style={{ marginTop: 6 }}>
                <span className="tag">{demand.department}</span>
              </div>
            )}
          </div>

          {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

          <div className="field">
            <label>Decision <span className="req">*</span></label>
            <div className="decision-group">
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
            </div>
          </div>

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

          {decision === 'Accept' && (
            <div className="field">
              <label>Promise Date</label>
              <input
                type="text"
                value={promiseDate}
                onChange={e => setPromiseDate(e.target.value)}
                placeholder="e.g. 25-May, 08-Jun"
              />
              <div className="field-hint">When will this be resolved?</div>
            </div>
          )}

          <div className="field">
            <label>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">Not set</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
          </div>

          <div className="field">
            <label>Remarks</label>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Any notes or additional context…"
              style={{ minHeight: 64 }}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} /> Saving…</> : <>{Icons.check} Save Review</>}
          </button>
        </div>
      </div>
    </div>
  )
}
