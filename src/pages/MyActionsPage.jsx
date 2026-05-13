import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Badge, Icons } from '../components/Icons'
import ReviewModal from '../components/ReviewModal'

export default function MyActionsPage() {
  const { toast } = useOutletContext()
  const { profile } = useAuth()
  const [demands, setDemands] = useState([])
  const [loading, setLoading] = useState(true)
  const [reviewDemand, setReviewDemand] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => { fetchMyDemands() }, [profile])

  async function fetchMyDemands() {
    if (!profile) return
    setLoading(true)
    let query = supabase.from('demands').select('*').order('created_at', { ascending: false })

    if (profile.role === 'owner') {
      query = query.ilike('action_owner', `%${profile.full_name}%`)
    }

    const { data, error } = await query
    if (error) toast(error.message, 'error')
    else setDemands(data ?? [])
    setLoading(false)
  }

  const filtered = demands.filter(d => {
    if (filter === 'pending') return !d.decision
    if (filter === 'accepted') return d.decision === 'Accept'
    if (filter === 'rejected') return d.decision === 'Reject'
    return true
  })

  const pending = demands.filter(d => !d.decision).length

  async function handleReview(reviewData) {
    const { error } = await supabase.from('demands').update(reviewData).eq('id', reviewDemand.id)
    if (error) throw error
    toast('Review saved', 'success')
    setReviewDemand(null)
    fetchMyDemands()
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">My Actions</div>
          <div className="page-sub">
            {profile?.role === 'owner' ? `Demands assigned to ${profile.full_name}` : 'All demands requiring action'}
            {pending > 0 && <span style={{ marginLeft: 8 }}><Badge type="Pending" label={`${pending} pending`} /></span>}
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="table-wrap">
          <div className="table-toolbar">
            {['all', 'pending', 'accepted', 'rejected'].map(f => (
              <button
                key={f}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : ''}`}
                onClick={() => setFilter(f)}
                style={{ textTransform: 'capitalize' }}
              >
                {f}
              </button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)' }}>{filtered.length} demands</span>
          </div>

          {loading ? (
            <div className="loading"><div className="spinner" /> Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              {Icons.check}
              <div className="empty-state-title">All clear!</div>
              <div className="empty-state-sub">No demands match this filter</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Store</th>
                    <th>Ask (polished)</th>
                    <th>Dept</th>
                    <th>Month</th>
                    <th>Decision</th>
                    <th>Promise Date</th>
                    <th>Status</th>
                    <th>Remarks</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(d => (
                    <tr key={d.id}>
                      <td><span className="tag">{d.s_no || '—'}</span></td>
                      <td><strong style={{ fontSize: 13 }}>{d.store_name}</strong><div style={{ fontSize: 11, color: 'var(--text3)' }}>{d.lm_name}</div></td>
                      <td className="td-truncate">{d.polished_ask || d.original_ask}</td>
                      <td style={{ fontSize: 11, color: 'var(--text3)' }}>{d.department || '—'}</td>
                      <td><span className="month-chip">{d.month || '—'}</span></td>
                      <td><Badge type={d.decision || ''} /></td>
                      <td style={{ fontSize: 12 }}>{d.promise_date || '—'}</td>
                      <td>{d.status ? <Badge type={d.status} /> : '—'}</td>
                      <td className="td-truncate" style={{ fontSize: 12, maxWidth: 160, color: 'var(--text2)' }}>{d.remarks || '—'}</td>
                      <td>
                        <button
                          className={`btn btn-sm ${!d.decision ? 'btn-primary' : ''}`}
                          onClick={() => setReviewDemand(d)}
                        >
                          {d.decision ? 'Edit' : 'Review'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {reviewDemand && <ReviewModal demand={reviewDemand} onClose={() => setReviewDemand(null)} onSave={handleReview} />}
    </>
  )
}
