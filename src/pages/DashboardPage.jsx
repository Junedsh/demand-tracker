import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Badge, Icons } from '../components/Icons'
import DemandModal from '../components/DemandModal'
import SatisfactionModal from '../components/SatisfactionModal'

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function calcTAT(created, completed) {
  if (!created || !completed) return null
  const days = Math.round((new Date(completed) - new Date(created)) / (1000 * 60 * 60 * 24))
  return days
}

function downloadCSV(data) {
  const headers = ['Store', 'ABO', 'LM', 'Ask', 'Owner', 'Department', 'Decision', 'Rejection Reason', 'Status', 'Promise Date', 'Remarks', 'Satisfaction', 'Satisfaction Reason', 'Satisfaction By', 'Created Date', 'Completed Date', 'TAT (days)']
  const rows = data.map(d => {
    const tat = calcTAT(d.created_at, d.completed_at)
    return [
      d.store_name || '',
      d.abo || '',
      d.lm_name || '',
      d.original_ask || '',
      d.action_owner || '',
      d.department || '',
      d.decision || '',
      d.reject_reason || '',
      d.status || '',
      d.promise_date || '',
      d.remarks || '',
      d.satisfaction || '',
      d.satisfaction_reason || '',
      d.satisfaction_by || '',
      d.created_at ? formatDate(d.created_at) : '',
      d.completed_at ? formatDate(d.completed_at) : '',
      tat !== null ? tat : '',
    ]
  })
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `demands-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const DownloadIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

// Truncated cell with tooltip
function TruncTd({ text, maxWidth = 160, fontSize = 12, color = 'var(--text2)' }) {
  if (!text || text === '—') return <td style={{ fontSize, color: 'var(--text3)' }}>—</td>
  return (
    <td title={text} style={{
      fontSize, color, maxWidth,
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'default'
    }}>
      {text}
    </td>
  )
}

export default function DashboardPage() {
  const { toast } = useOutletContext()
  const { profile } = useAuth()
  const [demands, setDemands] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [myStores, setMyStores] = useState(null)
  const [satisfactionDemand, setSatisfactionDemand] = useState(null)

  const [filterLM, setFilterLM] = useState('')
  const [filterABO, setFilterABO] = useState('')
  const [filterStore, setFilterStore] = useState('')

  const role = profile?.role
  const canRespondSatisfaction = ['store', 'abo', 'lm'].includes(role)

  useEffect(() => { if (profile) fetchMyStores() }, [profile])

  useEffect(() => {
    if (myStores === null) return
    if (role === 'admin' || role === 'owner') fetchDemands([])
    else if (myStores.length > 0) fetchDemands(myStores)
    else setLoading(false)
  }, [myStores])

  async function fetchMyStores() {
    if (role === 'admin' || role === 'owner') { setMyStores([]); return }
    const col = role === 'lm' ? 'lm_name' : 'abo'
    const { data } = await supabase.from('store_master').select('store_name').eq(col, profile.full_name)
    setMyStores((data ?? []).map(s => s.store_name))
  }

  async function fetchDemands(storeNames) {
    setLoading(true)
    let query = supabase.from('demands').select('*').order('created_at', { ascending: false }).limit(50)
    if (role === 'owner') query = query.ilike('action_owner', `%${profile.full_name}%`)
    else if (storeNames.length > 0) query = query.in('store_name', storeNames)
    const { data, error } = await query
    if (error) toast(error.message, 'error')
    else setDemands(data ?? [])
    setLoading(false)
  }

  function refetch() {
    if (role === 'admin') fetchDemands([])
    else if (myStores?.length > 0) fetchDemands(myStores)
  }

  async function handleSave(form) {
    const { error } = await supabase.from('demands').insert([form])
    if (error) throw error
    toast('Demand added!', 'success')
    setShowAdd(false)
    refetch()
  }

  async function handleSatisfaction({ satisfaction, satisfaction_reason }) {
    const updateData = {
      satisfaction,
      satisfaction_reason,
      satisfaction_by: profile?.full_name || profile?.email,
      satisfaction_at: new Date().toISOString(),
      ...(satisfaction === 'not_satisfied' && { status: 'In Progress' }),
    }
    const { error } = await supabase.from('demands').update(updateData).eq('id', satisfactionDemand.id)
    if (error) throw error
    toast(
      satisfaction === 'satisfied' ? 'Marked as satisfied ✓' : 'Dispute raised — status reset to In Progress',
      satisfaction === 'satisfied' ? 'success' : 'error'
    )
    setSatisfactionDemand(null)
    refetch()
  }

  const lmOptions = [...new Set(demands.map(d => d.lm_name).filter(Boolean))].sort()
  const aboOptions = [...new Set(demands.map(d => d.abo).filter(Boolean))].sort()
  const storeOptions = [...new Set(demands.map(d => d.store_name).filter(Boolean))].sort()

  const displayed = demands.filter(d => {
    if (filterLM && d.lm_name !== filterLM) return false
    if (filterABO && d.abo !== filterABO) return false
    if (filterStore && d.store_name !== filterStore) return false
    return true
  })

  // KPI calculations
  const completedDemands = displayed.filter(d => d.completed_at && d.created_at)
  const tatValues = completedDemands.map(d => calcTAT(d.created_at, d.completed_at)).filter(v => v !== null)
  const avgTAT = tatValues.length > 0 ? Math.round(tatValues.reduce((a, b) => a + b, 0) / tatValues.length) : null
  const satisfiedCount = displayed.filter(d => d.satisfaction === 'satisfied').length
  const completedCount = displayed.filter(d => d.status === 'Done').length
  const satisfactionRate = completedCount > 0 ? Math.round((satisfiedCount / completedCount) * 100) : null

  const stats = {
    total: displayed.length,
    accepted: displayed.filter(d => d.decision === 'Accept').length,
    rejected: displayed.filter(d => d.decision === 'Reject').length,
    pending: displayed.filter(d => !d.decision).length,
    done: completedCount,
    disputed: displayed.filter(d => d.satisfaction === 'not_satisfied').length,
  }

  const hasFilters = filterLM || filterABO || filterStore

  const patchLabel = role === 'admin'
    ? 'All stores'
    : role === 'lm'
      ? `${profile?.full_name}'s stores · ${myStores?.length ?? '…'} stores`
      : role === 'abo'
        ? `${profile?.full_name}'s patch · ${myStores?.length ?? '…'} stores`
        : role === 'owner'
          ? `Demands assigned to ${profile?.full_name}`
          : ''

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">{patchLabel}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => downloadCSV(displayed)} disabled={displayed.length === 0} title="Download as CSV">
            {DownloadIcon} Export
          </button>
          {role !== 'owner' && (
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              {Icons.plus} Add Demand
            </button>
          )}
        </div>
      </div>

      <div className="page-body">

        {/* KPI Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Demands</div>
            <div className="stat-value blue">{stats.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Accepted</div>
            <div className="stat-value green">{stats.accepted}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Rejected</div>
            <div className="stat-value red">{stats.rejected}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pending Review</div>
            <div className="stat-value amber">{stats.pending}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Completed</div>
            <div className="stat-value green">{stats.done}</div>
          </div>
          <div className="stat-card" style={stats.disputed > 0 ? { borderColor: 'var(--danger)' } : {}}>
            <div className="stat-label">Disputed</div>
            <div className="stat-value red">{stats.disputed}</div>
          </div>
          <div className="stat-card" title="Average days from demand creation to completion">
            <div className="stat-label">Avg TAT (days)</div>
            <div className="stat-value blue">{avgTAT !== null ? avgTAT : '—'}</div>
          </div>
          <div className="stat-card" title="% of completed demands marked Satisfied by store/LM/ABO">
            <div className="stat-label">Satisfaction Rate</div>
            <div className="stat-value green">{satisfactionRate !== null ? `${satisfactionRate}%` : '—'}</div>
          </div>
        </div>

        <div className="table-wrap">
          <div className="table-toolbar">
            <select className="filter-select" value={filterLM} onChange={e => { setFilterLM(e.target.value); setFilterStore('') }}>
              <option value="">All LMs</option>
              {lmOptions.map(l => <option key={l}>{l}</option>)}
            </select>

            {role === 'admin' && (
              <select className="filter-select" value={filterABO} onChange={e => { setFilterABO(e.target.value); setFilterStore('') }}>
                <option value="">All ABOs</option>
                {aboOptions.map(a => <option key={a}>{a}</option>)}
              </select>
            )}

            <select className="filter-select" value={filterStore} onChange={e => setFilterStore(e.target.value)}>
              <option value="">All Stores</option>
              {storeOptions
                .filter(s => !filterLM || demands.find(d => d.store_name === s && d.lm_name === filterLM))
                .filter(s => !filterABO || demands.find(d => d.store_name === s && d.abo === filterABO))
                .map(s => <option key={s}>{s}</option>)}
            </select>

            {hasFilters && (
              <button className="btn btn-sm" onClick={() => { setFilterLM(''); setFilterABO(''); setFilterStore('') }}>
                Clear filters
              </button>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)' }}>{displayed.length} demands</span>
          </div>

          {loading ? (
            <div className="loading"><div className="spinner" /> Loading…</div>
          ) : displayed.length === 0 ? (
            <div className="empty-state">
              {Icons.inbox}
              <div className="empty-state-title">{hasFilters ? 'No demands match filters' : 'No demands yet'}</div>
              <div className="empty-state-sub">
                {!hasFilters && myStores?.length === 0 && role !== 'admin'
                  ? `No stores found for "${profile?.full_name}". Check store_master matches your profile name.`
                  : hasFilters ? 'Try clearing the filters' : 'Click "Add Demand" to get started'}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Store</th>
                    <th>ABO</th>
                    <th>LM</th>
                    <th>Ask</th>
                    <th>Owner</th>
                    <th>Department</th>
                    <th>Decision</th>
                    <th>Rejection Reason</th>
                    <th>Status</th>
                    <th>Promise Date</th>
                    <th>Remarks</th>
                    <th>Created</th>
                    <th>Completed</th>
                    <th>TAT</th>
                    <th>Satisfaction</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(d => {
                    const tat = calcTAT(d.created_at, d.completed_at)
                    return (
                      <tr key={d.id}>
                        <td><strong style={{ fontSize: 13 }}>{d.store_name}</strong></td>
                        <td style={{ fontSize: 12, color: 'var(--text2)' }}>{d.abo || '—'}</td>
                        <td style={{ fontSize: 12, color: 'var(--text2)' }}>{d.lm_name}</td>

                        {/* Ask — full wrap */}
                        <td style={{ fontSize: 13, minWidth: 280, whiteSpace: 'normal', lineHeight: 1.5 }}>
                          {d.original_ask}
                        </td>

                        <td style={{ fontSize: 12 }}>{d.action_owner || '—'}</td>
                        <td style={{ color: 'var(--text2)', fontSize: 12 }}>{d.department || '—'}</td>
                        <td><Badge type={d.decision || ''} /></td>

                        {/* Rejection reason — tooltip */}
                        <td
                          title={d.decision === 'Reject' ? (d.reject_reason || '') : ''}
                          style={{ fontSize: 12, color: 'var(--danger)', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'default' }}
                        >
                          {d.decision === 'Reject' ? (d.reject_reason || '—') : '—'}
                        </td>

                        <td>{d.status ? <Badge type={d.status} /> : '—'}</td>
                        <td style={{ fontSize: 12 }}>{d.promise_date || '—'}</td>

                        {/* Remarks — tooltip */}
                        <td
                          title={d.remarks || ''}
                          style={{ fontSize: 12, color: 'var(--text2)', maxWidth: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'default' }}
                        >
                          {d.remarks || '—'}
                        </td>

                        {/* Created date */}
                        <td style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                          {formatDate(d.created_at)}
                        </td>

                        {/* Completed date */}
                        <td style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                          {formatDate(d.completed_at)}
                        </td>

                        {/* TAT */}
                        <td style={{ fontSize: 12, whiteSpace: 'nowrap', textAlign: 'center' }}>
                          {tat !== null ? (
                            <span style={{
                              fontWeight: 600,
                              color: tat <= 7 ? 'var(--success, #16a34a)' : tat <= 14 ? 'var(--amber)' : 'var(--danger)',
                            }}>
                              {tat}d
                            </span>
                          ) : '—'}
                        </td>

                        {/* Satisfaction */}
                        <td style={{ minWidth: 110 }}>
                          {!d.satisfaction && d.status === 'Done' && canRespondSatisfaction ? (
                            <button
                              className="btn btn-sm"
                              style={{ fontSize: 11, background: 'var(--amber)', color: '#fff', border: 'none' }}
                              onClick={() => setSatisfactionDemand(d)}
                            >
                              Respond
                            </button>
                          ) : !d.satisfaction && d.status === 'Done' ? (
                            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Awaiting</span>
                          ) : d.satisfaction === 'satisfied' ? (
                            <Badge type="satisfied" />
                          ) : d.satisfaction === 'not_satisfied' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <Badge type="not_satisfied" />
                              {d.satisfaction_reason && (
                                <span
                                  title={d.satisfaction_reason}
                                  style={{ fontSize: 10, color: 'var(--danger)', maxWidth: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'default' }}
                                >
                                  {d.satisfaction_reason}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text3)', fontSize: 11 }}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <DemandModal userProfile={profile} onClose={() => setShowAdd(false)} onSave={handleSave} />
      )}
      {satisfactionDemand && (
        <SatisfactionModal demand={satisfactionDemand} onClose={() => setSatisfactionDemand(null)} onSave={handleSatisfaction} />
      )}
    </>
  )
}