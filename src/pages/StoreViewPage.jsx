import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Badge, Icons } from '../components/Icons'
import DemandModal from '../components/DemandModal'

export default function StoreViewPage() {
  const { toast } = useOutletContext()
  const { profile } = useAuth()
  const [demands, setDemands] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => { fetchStoreDemands() }, [profile])

  async function fetchStoreDemands() {
    if (!profile) return
    setLoading(true)
    let query = supabase.from('demands').select('*').order('created_at', { ascending: false })
    if (profile.store_name) {
      query = query.eq('store_name', profile.store_name)
    }
    const { data, error } = await query
    if (error) toast(error.message, 'error')
    else setDemands(data ?? [])
    setLoading(false)
  }

  async function handleAdd(form) {
    const { error } = await supabase.from('demands').insert([{
      ...form,
      store_name: profile.store_name || form.store_name,
      lm_name: form.lm_name,
    }])
    if (error) throw error
    toast('Demand submitted!', 'success')
    setShowAdd(false)
    fetchStoreDemands()
  }

  const accepted = demands.filter(d => d.decision === 'Accept').length
  const rejected = demands.filter(d => d.decision === 'Reject').length
  const pending = demands.filter(d => !d.decision).length

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">My Store Demands</div>
          <div className="page-sub">{profile?.store_name || 'Your store'} · {demands.length} total demands</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          {Icons.plus} Submit Demand
        </button>
      </div>

      <div className="page-body">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total</div>
            <div className="stat-value blue">{demands.length}</div>
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
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="loading"><div className="spinner" /> Loading…</div>
          ) : demands.length === 0 ? (
            <div className="empty-state">
              {Icons.inbox}
              <div className="empty-state-title">No demands yet</div>
              <div className="empty-state-sub">Submit your first demand using the button above</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Your Ask</th>
                    <th>Polished Version</th>
                    <th>Owner</th>
                    <th>Dept</th>
                    <th>Month</th>
                    <th>Decision</th>
                    <th>Rejection Reason</th>
                    <th>Promise Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {demands.map(d => (
                    <tr key={d.id}>
                      <td><span className="tag">{d.s_no || '—'}</span></td>
                      <td className="td-truncate">{d.original_ask}</td>
                      <td className="td-truncate" style={{ color: 'var(--text2)', fontSize: 12 }}>{d.polished_ask || '—'}</td>
                      <td style={{ fontSize: 12 }}>{d.action_owner || '—'}</td>
                      <td style={{ fontSize: 11, color: 'var(--text3)' }}>{d.department || '—'}</td>
                      <td><span className="month-chip">{d.month || '—'}</span></td>
                      <td><Badge type={d.decision || ''} /></td>
                      <td className="td-truncate" style={{ fontSize: 12, color: 'var(--text2)' }}>{d.reject_reason || '—'}</td>
                      <td style={{ fontSize: 12 }}>{d.promise_date || '—'}</td>
                      <td>{d.status ? <Badge type={d.status} /> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <DemandModal
          userProfile={profile}
          onClose={() => setShowAdd(false)}
          onSave={handleAdd}
        />
      )}
    </>
  )
}
