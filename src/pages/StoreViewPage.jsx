import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Badge, Icons } from '../components/Icons'
import SatisfactionModal from '../components/SatisfactionModal'

const STORAGE_KEY = 'demand_tracker_selected_store'

function getMonthRange() {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    from: first.toISOString().slice(0, 10),
    to: last.toISOString().slice(0, 10),
  }
}

export default function StoreViewPage() {
  const { toast } = useOutletContext()
  const { profile } = useAuth()

  const [allStores, setAllStores] = useState([])
  const [selectedStore, setSelectedStore] = useState(() => localStorage.getItem(STORAGE_KEY) || '')
  const [demands, setDemands] = useState([])
  const [loading, setLoading] = useState(false)
  const [storesLoading, setStoresLoading] = useState(true)
  const [satisfactionDemand, setSatisfactionDemand] = useState(null)

  const defaultRange = getMonthRange()
  const [filterFrom, setFilterFrom] = useState(defaultRange.from)
  const [filterTo, setFilterTo] = useState(defaultRange.to)

  useEffect(() => { fetchStores() }, [])

  useEffect(() => {
    if (selectedStore) {
      localStorage.setItem(STORAGE_KEY, selectedStore)
      fetchDemands(selectedStore)
    } else {
      setDemands([])
    }
  }, [selectedStore])

  async function fetchStores() {
    setStoresLoading(true)
    const { data } = await supabase.from('store_master').select('store_name, lm_name, abo').order('store_name')
    setAllStores(data ?? [])
    setStoresLoading(false)
  }

  async function fetchDemands(storeName) {
    setLoading(true)
    const { data, error } = await supabase
      .from('demands').select('*').eq('store_name', storeName).order('created_at', { ascending: false })
    if (error) toast(error.message, 'error')
    else setDemands(data ?? [])
    setLoading(false)
  }

  async function handleSatisfaction({ satisfaction, satisfaction_reason }) {
    const updateData = {
      satisfaction,
      satisfaction_reason,
      satisfaction_by: selectedStore,
      satisfaction_at: new Date().toISOString(),
      ...(satisfaction === 'not_satisfied' && { status: 'In Progress', completed_at: null }),
    }
    const { error } = await supabase.from('demands').update(updateData).eq('id', satisfactionDemand.id)
    if (error) { toast(error.message, 'error'); return }
    toast(
      satisfaction === 'satisfied' ? 'Marked as satisfied ✓' : 'Dispute raised — owner will be notified',
      satisfaction === 'satisfied' ? 'success' : 'error'
    )
    setSatisfactionDemand(null)
    fetchDemands(selectedStore)
  }

  const selectedStoreInfo = allStores.find(s => s.store_name === selectedStore)

  // Apply date filter client-side
  const filtered = demands.filter(d => {
    if (filterFrom && d.created_at && d.created_at.slice(0, 10) < filterFrom) return false
    if (filterTo && d.created_at && d.created_at.slice(0, 10) > filterTo) return false
    return true
  })

  const accepted = filtered.filter(d => d.decision === 'Accept').length
  const rejected = filtered.filter(d => d.decision === 'Reject').length
  const pending = filtered.filter(d => !d.decision).length
  const disputed = filtered.filter(d => d.satisfaction === 'not_satisfied').length
  const awaitingResponse = filtered.filter(d => d.status === 'Done' && !d.satisfaction).length
  const clarificationCount = filtered.filter(d => d.clarification_needed).length

  const dateFiltersChanged = filterFrom !== defaultRange.from || filterTo !== defaultRange.to

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Store Demands</div>
          <div className="page-sub">
            {selectedStore
              ? `${selectedStore} · LM: ${selectedStoreInfo?.lm_name || '—'} · ABO: ${selectedStoreInfo?.abo || '—'}`
              : 'Select your store to view demands'}
          </div>
        </div>
      </div>

      <div className="page-body">

        {/* Store selector */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Select Your Store
          </div>
          <select
            value={selectedStore}
            onChange={e => setSelectedStore(e.target.value)}
            style={{ width: '100%', maxWidth: 420, padding: '9px 12px', fontSize: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font)' }}
          >
            <option value="">— Select your store —</option>
            {storesLoading
              ? <option disabled>Loading stores…</option>
              : allStores.map(s => <option key={s.store_name} value={s.store_name}>{s.store_name}</option>)
            }
          </select>
          {selectedStore && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text3)' }}>
              Your selection is saved. It will be remembered next time you log in.
            </div>
          )}
        </div>

        {selectedStore && (
          <>
            {/* Stats — based on filtered data */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total</div>
                <div className="stat-value blue">{filtered.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Accepted</div>
                <div className="stat-value green">{accepted}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Rejected</div>
                <div className="stat-value red">{rejected}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Awaiting Review</div>
                <div className="stat-value amber">{pending}</div>
              </div>
              <div className="stat-card" style={awaitingResponse > 0 ? { borderColor: 'var(--amber)' } : {}}>
                <div className="stat-label">Needs Your Response</div>
                <div className="stat-value amber">{awaitingResponse}</div>
              </div>
              {disputed > 0 && (
                <div className="stat-card" style={{ borderColor: 'var(--danger)' }}>
                  <div className="stat-label">Disputed</div>
                  <div className="stat-value red">{disputed}</div>
                </div>
              )}
              {clarificationCount > 0 && (
                <div className="stat-card" style={{ borderColor: 'var(--amber)' }}>
                  <div className="stat-label">Needs Clarification</div>
                  <div className="stat-value amber">{clarificationCount}</div>
                </div>
              )}
            </div>

            {/* Awaiting response banner */}
            {awaitingResponse > 0 && (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid var(--amber)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 12, fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>⏳</span>
                <span>
                  <strong>{awaitingResponse} demand{awaitingResponse > 1 ? 's' : ''}</strong> marked Done by the owner — please respond whether they were fulfilled to your satisfaction.
                </span>
              </div>
            )}

            {/* Clarification banner */}
            {clarificationCount > 0 && (
              <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid var(--amber)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>❓</span>
                <span>
                  <strong>{clarificationCount} demand{clarificationCount > 1 ? 's' : ''}</strong> need more details from you — please check the clarification notes below and ask your LM/ABO to update the demand.
                </span>
              </div>
            )}

            {/* Date filters */}
            <div className="table-wrap">
              <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>From</span>
                  <input
                    type="date"
                    value={filterFrom}
                    onChange={e => setFilterFrom(e.target.value)}
                    className="filter-select"
                    style={{ width: 140 }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>To</span>
                  <input
                    type="date"
                    value={filterTo}
                    onChange={e => setFilterTo(e.target.value)}
                    className="filter-select"
                    style={{ width: 140 }}
                  />
                </div>
                {dateFiltersChanged && (
                  <button className="btn btn-sm" onClick={() => { setFilterFrom(defaultRange.from); setFilterTo(defaultRange.to) }}>
                    Reset dates
                  </button>
                )}
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)' }}>{filtered.length} demands</span>
              </div>

              {loading ? (
                <div className="loading"><div className="spinner" /> Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="empty-state">
                  {Icons.inbox}
                  <div className="empty-state-title">No demands found</div>
                  <div className="empty-state-sub">{dateFiltersChanged ? 'Try adjusting the date range' : `No demands have been submitted for ${selectedStore}`}</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Ask</th>
                        <th>Owner</th>
                        <th>Dept</th>
                        <th>Month</th>
                        <th>Decision</th>
                        <th>Rejection Reason</th>
                        <th>Promise Date</th>
                        <th>Status</th>
                        <th>Remarks</th>
                        <th>Satisfaction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(d => (
                        <tr
                          key={d.id}
                          style={
                            d.clarification_needed
                              ? { background: 'rgba(245,158,11,0.06)', borderLeft: '3px solid var(--amber)' }
                              : d.status === 'Done' && !d.satisfaction
                                ? { background: 'rgba(245,158,11,0.04)' }
                                : d.satisfaction === 'not_satisfied'
                                  ? { background: 'rgba(220,53,69,0.05)' }
                                  : {}
                          }
                        >
                          {/* Ask — wide, full wrap */}
                          <td style={{ fontSize: 13, minWidth: 240, maxWidth: 320, whiteSpace: 'normal', lineHeight: 1.6 }}>
                            {d.original_ask}
                          </td>

                          <td style={{ fontSize: 12 }}>{d.action_owner || '—'}</td>
                          <td style={{ fontSize: 11, color: 'var(--text3)' }}>{d.department || '—'}</td>
                          <td><span className="month-chip">{d.month || '—'}</span></td>
                          <td><Badge type={d.decision || ''} /></td>

                          {/* Rejection reason — wide, wraps */}
                          <td style={{ fontSize: 12, color: 'var(--danger)', minWidth: 180, maxWidth: 240, whiteSpace: 'normal', lineHeight: 1.5 }}>
                            {d.decision === 'Reject' ? (d.reject_reason || '—') : '—'}
                          </td>

                          <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{d.promise_date || '—'}</td>

                          {/* Status + Clarification note */}
                          <td style={{ minWidth: 120 }}>
                            {d.status ? <Badge type={d.status} /> : '—'}
                            {d.clarification_needed && (
                              <div style={{ marginTop: 6 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  ⚠ Needs Clarification
                                </span>
                                {d.clarification_note && (
                                  <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 3, maxWidth: 200, whiteSpace: 'normal', lineHeight: 1.4 }}>
                                    {d.clarification_note}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Remarks — wide, wraps */}
                          <td style={{ fontSize: 12, color: 'var(--text2)', minWidth: 160, maxWidth: 220, whiteSpace: 'normal', lineHeight: 1.5 }}>
                            {d.remarks || '—'}
                          </td>

                          {/* Satisfaction */}
                          <td style={{ minWidth: 120 }}>
                            {!d.satisfaction && d.status === 'Done' ? (
                              <button
                                className="btn btn-sm"
                                style={{ fontSize: 11, background: 'var(--amber)', color: '#fff', border: 'none', whiteSpace: 'nowrap' }}
                                onClick={() => setSatisfactionDemand(d)}
                              >
                                Respond
                              </button>
                            ) : d.satisfaction === 'satisfied' ? (
                              <Badge type="satisfied" />
                            ) : d.satisfaction === 'not_satisfied' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Badge type="not_satisfied" />
                                {d.satisfaction_reason && (
                                  <span title={d.satisfaction_reason} style={{ fontSize: 10, color: 'var(--danger)', maxWidth: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'default' }}>
                                    {d.satisfaction_reason}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text3)', fontSize: 11 }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {satisfactionDemand && (
        <SatisfactionModal
          demand={satisfactionDemand}
          onClose={() => setSatisfactionDemand(null)}
          onSave={handleSatisfaction}
        />
      )}
    </>
  )
}