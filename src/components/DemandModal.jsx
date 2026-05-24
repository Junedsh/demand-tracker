import { useState, useEffect } from 'react'
import { Icons } from './Icons'
import { supabase } from '../lib/supabase'

const DEPARTMENTS = [
  'Supply Chain',
  'Commercial / Revenue',
  'Category Management',
  'Pharmacy & Compliance',
  'Finance & Accounts',
  'HR & Admin',
  'IT Related',
  'Marketing',
  'Store Operations',
  'Customer Experience',
  'Medical Affairs',
  'Maintenance',
  'Learning & Development',
]

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const currentMonth = MONTHS[new Date().getMonth()]

export default function DemandModal({ demand, onClose, onSave, userProfile }) {
  const isEdit = !!demand?.id
  const role = userProfile?.role

  const [form, setForm] = useState({
    lm_name: '',
    store_name: '',
    abo: '',
    original_ask: '',
    action_owner: '',
    department: '',
    month: currentMonth,
    year: new Date().getFullYear(),
    reference_link: '',
  })
  const [stores, setStores] = useState([])
  const [owners, setOwners] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchStores() }, [userProfile])
  useEffect(() => { fetchOwners() }, [])

  async function fetchStores() {
    if (!userProfile) return
    let query = supabase.from('store_master').select('store_id, store_name, lm_name, abo').order('store_name')
    if (role === 'lm') query = query.eq('lm_name', userProfile.full_name)
    if (role === 'abo') query = query.eq('abo', userProfile.full_name)
    const { data } = await query
    setStores(data ?? [])
  }

  async function fetchOwners() {
    const { data, error } = await supabase.from('profiles').select('full_name').eq('role', 'owner').order('full_name')
    if (!error) setOwners((data ?? []).map(o => o.full_name).filter(Boolean))
  }

  useEffect(() => {
    if (demand) {
      setForm({
        lm_name: demand.lm_name ?? '',
        store_name: demand.store_name ?? '',
        abo: demand.abo ?? '',
        original_ask: demand.original_ask ?? '',
        action_owner: demand.action_owner ?? '',
        department: demand.department ?? '',
        month: demand.month ?? currentMonth,
        year: demand.year ?? new Date().getFullYear(),
        reference_link: demand.reference_link ?? '',
      })
    } else if (userProfile) {
      setForm(prev => ({
        ...prev,
        lm_name: role === 'lm' ? userProfile.full_name : '',
        abo: role === 'abo' ? userProfile.full_name : '',
      }))
    }
  }, [demand, userProfile])

  function handleStoreChange(storeName) {
    const selected = stores.find(s => s.store_name === storeName)
    setForm(prev => ({
      ...prev,
      store_name: storeName,
      lm_name: selected?.lm_name ?? prev.lm_name,
      abo: selected?.abo ?? prev.abo,
    }))
    setError('')
  }

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  async function handleSave() {
    if (!form.store_name.trim()) return setError('Store is required')
    if (!form.lm_name.trim()) return setError('LM Name is required')
    if (!form.original_ask.trim()) return setError('Ask is required')
    setSaving(true)
    try {
      // When demand is edited/resubmitted, clear clarification flag
      const saveData = isEdit
        ? { ...form, clarification_needed: false, clarification_note: null }
        : form
      await onSave(saveData)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const hasClarification = demand?.clarification_needed && demand?.clarification_note

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{isEdit ? 'Edit Demand' : 'Add New Demand'}</div>
          <button className="btn btn-icon" onClick={onClose} aria-label="Close">{Icons.x}</button>
        </div>

        <div className="modal-body">
          {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

          {/* Clarification banner — shown prominently when editing a flagged demand */}
          {hasClarification && (
            <div style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1.5px solid var(--amber)',
              borderRadius: 'var(--radius)',
              padding: '12px 14px',
              marginBottom: 16,
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Clarification Requested by Owner
                </div>
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                  {demand.clarification_note}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                  Please update the Ask below to address the owner's question, then save.
                </div>
              </div>
            </div>
          )}

          {/* Store */}
          <div className="field">
            <label>Store <span className="req">*</span></label>
            <select value={form.store_name} onChange={e => handleStoreChange(e.target.value)}>
              <option value="">Select store…</option>
              {stores.map(s => (
                <option key={s.store_id} value={s.store_name}>{s.store_name}</option>
              ))}
            </select>
            {stores.length === 0 && (
              <div className="field-hint" style={{ color: 'var(--danger)' }}>
                No stores found. Check your name matches store_master exactly.
              </div>
            )}
          </div>

          {/* LM + ABO */}
          <div className="field-row">
            <div className="field">
              <label>LM Name <span className="req">*</span></label>
              <input
                type="text"
                value={form.lm_name}
                disabled
                placeholder="Auto-filled from store"
                style={{ opacity: 0.7 }}
              />
            </div>
            <div className="field">
              <label>ABO</label>
              <input type="text" value={form.abo} disabled style={{ opacity: 0.7 }} placeholder="Auto-filled from store" />
            </div>
          </div>

          {/* Ask */}
          <div className="field">
            <label>
              Ask <span className="req">*</span>
              {hasClarification && (
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--amber)', fontWeight: 600 }}>
                  ← Update this to address the clarification
                </span>
              )}
            </label>
            <textarea
              value={form.original_ask}
              onChange={e => set('original_ask', e.target.value)}
              placeholder="What does the store need?"
              style={hasClarification ? { borderColor: 'var(--amber)', minHeight: 100 } : {}}
              autoFocus={hasClarification}
            />
          </div>

          <div className="field">
            <label>
              Reference Link
              <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="url"
              value={form.reference_link}
              onChange={e => set('reference_link', e.target.value)}
              placeholder="Google Sheet, Doc, Drive link, image URL…"
            />
            <div className="field-hint">Paste any link that helps explain the demand — SKU list, design reference, photo, etc.</div>
          </div>

          {/* Owner + Department */}
          <div className="field-row">
            <div className="field">
              <label>Action Owner</label>
              <select value={form.action_owner} onChange={e => set('action_owner', e.target.value)}>
                <option value="">Select owner…</option>
                {owners.map(o => <option key={o}>{o}</option>)}
              </select>
              {owners.length === 0 && (
                <div className="field-hint" style={{ color: 'var(--danger)' }}>
                  No owners found. Run the RLS policy SQL first.
                </div>
              )}
            </div>
            <div className="field">
              <label>Department</label>
              <select value={form.department} onChange={e => set('department', e.target.value)}>
                <option value="">Select department…</option>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Month */}
          <div className="field" style={{ maxWidth: 220 }}>
            <label>Month</label>
            <select value={form.month} onChange={e => set('month', e.target.value)}>
              {MONTHS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving
              ? <><div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} /> Saving…</>
              : <>{Icons.check} {isEdit ? 'Update Demand' : 'Save Demand'}</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}