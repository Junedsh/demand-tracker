import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Badge, Icons } from '../components/Icons'
import DemandModal from '../components/DemandModal'

export default function DashboardPage() {
  const { toast } = useOutletContext()
  const { profile } = useAuth()
  const [demands, setDemands] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [myStores, setMyStores] = useState(null)

  const [filterLM, setFilterLM] = useState('')
  const [filterABO, setFilterABO] = useState('')
  const [filterStore, setFilterStore] = useState('')

  const role = profile?.role

  useEffect(() => { if (profile) fetchMyStores() }, [profile])

  useEffect(() => {
    if (myStores === null) return
    if (role === 'admin') fetchDemands([])
    else if (myStores.length > 0) fetchDemands(myStores)
    else setLoading(false)
  }, [myStores])

  async function fetchMyStores() {
    if (role === 'admin') { setMyStores([]); return }
    const col = role === 'lm' ? 'lm_name' : 'abo'
    const { data } = await supabase.from('store_master').select('store_name').eq(col, profile.full_name)
    setMyStores((data ?? []).map(s => s.store_name))
  }

  async function fetchDemands(storeNames) {
    setLoading(true)
    let query = supabase.from('demands').select('*').order('created_at', { ascending: false }).limit(50)
    if (storeNames.length > 0) query = query.in('store_name', storeNames)
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

  // Dropdown options derived from demands
  const lmOptions = [...new Set(demands.map(d => d.lm_name).filter(Boolean))].sort()
  const aboOptions = [...new Set(demands.map(d => d.abo).filter(Boolean))].sort()
  const storeOptions = [...new Set(demands.map(d => d.store_name).filter(Boolean))].sort()

  // Apply filters
  const displayed = demands.filter(d => {
    if (filterLM && d.lm_name !== filterLM) return false
    if (filterABO && d.abo !== filterABO) return false
    if (filterStore && d.store_name !== filterStore) return false
    return true
  })

  const stats = {
    total: displayed.length,
    accepted: displayed.filter(d => d.decision === 'Accept').length,
    rejected: displayed.filter(d => d.decision === 'Reject').length,
    pending: displayed.filter(d => !d.decision).length,
  }

  const hasFilters = filterLM || filterABO || filterStore

  const patchLabel = role === 'admin'
    ? 'All stores'
    : role === 'lm'
      ? `${profile?.full_name}'s stores · ${myStores?.length ?? '…'} stores`
      : role === 'abo'
        ? `${profile?.full_name}'s patch · ${myStores?.length ?? '…'} stores`
        : ''

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">{patchLabel}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          {Icons.plus} Add Demand
        </button>
      </div>

      <div className="page-body">
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
        </div>

        <div className="table-wrap">
          <div className="table-toolbar">
            {/* LM filter */}
            <select className="filter-select" value={filterLM} onChange={e => { setFilterLM(e.target.value); setFilterStore('') }}>
              <option value="">All LMs</option>
              {lmOptions.map(l => <option key={l}>{l}</option>)}
            </select>

            {/* ABO filter — admin only */}
            {role === 'admin' && (
              <select className="filter-select" value={filterABO} onChange={e => { setFilterABO(e.target.value); setFilterStore('') }}>
                <option value="">All ABOs</option>
                {aboOptions.map(a => <option key={a}>{a}</option>)}
              </select>
            )}

            {/* Store filter */}
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
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(d => (
                    <tr key={d.id}>
                      <td><strong style={{ fontSize: 13 }}>{d.store_name}</strong></td>
                      <td style={{ fontSize: 12, color: 'var(--text2)' }}>{d.abo || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text2)' }}>{d.lm_name}</td>
                      <td className="td-truncate">{d.original_ask}</td>
                      <td style={{ fontSize: 12 }}>{d.action_owner || '—'}</td>
                      <td style={{ color: 'var(--text2)', fontSize: 12 }}>{d.department || '—'}</td>
                      <td><Badge type={d.decision || ''} /></td>
                      <td style={{ fontSize: 12, maxWidth: 180 }}>
                        {d.decision === 'Reject'
                          ? <span style={{ color: 'var(--danger)' }}>{d.reject_reason || '—'}</span>
                          : '—'}
                      </td>
                      <td>{d.status ? <Badge type={d.status} /> : '—'}</td>
                      <td style={{ fontSize: 12 }}>{d.promise_date || '—'}</td>
                      <td className="td-truncate" style={{ fontSize: 12, color: 'var(--text2)', maxWidth: 160 }}>
                        {d.remarks || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <DemandModal userProfile={profile} onClose={() => setShowAdd(false)} onSave={handleSave} />
      )}
    </>
  )
}