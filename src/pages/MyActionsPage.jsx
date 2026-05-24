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

  useEffect(() => { if (profile) fetchMyDemands() }, [profile])

  async function fetchMyDemands() {
    if (!profile) return
    setLoading(true)

    let query = supabase.from('demands').select('*').order('created_at', { ascending: false })

    if (profile.role === 'owner') {
      // Own demands only
      query = query.ilike('action_owner', `%${profile.full_name}%`)

    } else if (profile.role === 'manager') {
      // Fetch all owners who report to this manager
      const { data: reportees } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('manager', profile.full_name)
        .eq('role', 'owner')
      const names = (reportees ?? []).map(r => r.full_name).filter(Boolean)
      if (names.length === 0) { setDemands([]); setLoading(false); return }
      query = query.in('action_owner', names)

    } else if (profile.role === 'director') {
      // Fetch all owners under this director
      const { data: reportees } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('director', profile.full_name)
        .eq('role', 'owner')
      const names = (reportees ?? []).map(r => r.full_name).filter(Boolean)
      if (names.length === 0) { setDemands([]); setLoading(false); return }
      query = query.in('action_owner', names)
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
    if (filter === 'disputed') return d.satisfaction === 'not_satisfied'
    if (filter === 'clarification') return d.clarification_needed
    return true
  })

  const pending = demands.filter(d => !d.decision).length
  const disputed = demands.filter(d => d.satisfaction === 'not_satisfied').length
  const clarification = demands.filter(d => d.clarification_needed).length

  // Only owners can review — managers/directors are read-only on this page
  const canReview = profile?.role === 'owner'

  const pageSubtitle = {
    owner: `Demands assigned to ${profile?.full_name}`,
    manager: `Team demands — ${profile?.full_name}`,
    director: `All team demands — ${profile?.full_name}`,
  }[profile?.role] ?? 'All demands'

  async function handleReview(reviewData) {
    console.log('reviewDemand.id:', reviewDemand?.id)
    console.log('reviewData:', reviewData)
    const updateData = { ...reviewData }

    // If reassigning — skip all the status logic, just update directly
    if (reviewData.action_owner && reviewData.action_owner !== reviewDemand.action_owner) {
      const { error } = await supabase.from('demands').update(updateData).eq('id', reviewDemand.id)
      if (error) throw error
      toast('Demand reassigned', 'success')
      setReviewDemand(null)
      fetchMyDemands()
      return
    }

    if (reviewData.status === 'Done') {
      updateData.completed_at = new Date().toISOString()
      updateData.satisfaction = null
      updateData.satisfaction_reason = null
      updateData.satisfaction_by = null
      updateData.satisfaction_at = null
    }
    if (reviewData.status === 'In Progress' || reviewData.status === 'Pending') {
      updateData.completed_at = null
    }
    const { error } = await supabase.from('demands').update(updateData).eq('id', reviewDemand.id)
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
          <div className="page-sub" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {pageSubtitle}
            {pending > 0 && <Badge type="Pending" label={`${pending} pending`} />}
            {disputed > 0 && (
              <span style={{ background: 'var(--danger)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>
                ⚠ {disputed} disputed
              </span>
            )}
            {clarification > 0 && (
              <span style={{ background: 'var(--amber)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>
                ? {clarification} need clarification
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="table-wrap">
          <div className="table-toolbar">
            {['all', 'pending', 'accepted', 'rejected', 'disputed', 'clarification'].map(f => (
              <button
                key={f}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : ''}`}
                onClick={() => setFilter(f)}
                style={{
                  textTransform: 'capitalize',
                  ...(f === 'disputed' && filter !== f && disputed > 0 ? { borderColor: 'var(--danger)', color: 'var(--danger)' } : {}),
                  ...(f === 'clarification' && filter !== f && clarification > 0 ? { borderColor: 'var(--amber)', color: 'var(--amber)' } : {}),
                }}
              >
                {f === 'disputed' && disputed > 0 ? `⚠ Disputed (${disputed})`
                  : f === 'clarification' && clarification > 0 ? `? Clarification (${clarification})`
                    : f}
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
                    {(profile?.role === 'manager' || profile?.role === 'director') && <th>Owner</th>}
                    <th>Ask</th>
                    <th>Reference</th>
                    <th>Dept</th>
                    <th>Month</th>
                    <th>Decision</th>
                    <th>Promise Date</th>
                    <th>Status</th>
                    <th>Remarks</th>
                    <th>Dispute</th>
                    {canReview && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(d => (
                    <tr
                      key={d.id}
                      style={d.satisfaction === 'not_satisfied'
                        ? { background: 'rgba(220,53,69,0.06)', borderLeft: '3px solid var(--danger)' }
                        : d.clarification_needed
                          ? { background: 'rgba(245,158,11,0.05)', borderLeft: '3px solid var(--amber)' }
                          : {}
                      }
                    >
                      <td><span className="tag">{d.s_no || '—'}</span></td>
                      <td>
                        <strong style={{ fontSize: 13 }}>{d.store_name}</strong>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{d.lm_name}</div>
                      </td>
                      {(profile?.role === 'manager' || profile?.role === 'director') && (
                        <td style={{ fontSize: 12, fontWeight: 600 }}>{d.action_owner || '—'}</td>
                      )}
                      <td style={{ fontSize: 13, maxWidth: 220, whiteSpace: 'normal', lineHeight: 1.5 }}>
                        {d.original_ask}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {d.reference_link ? (
                          <a href={d.reference_link} target="_blank" rel="noopener noreferrer"
                            style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                            View ↗
                          </a>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text3)' }}>{d.department || '—'}</td>
                      <td><span className="month-chip">{d.month || '—'}</span></td>
                      <td><Badge type={d.decision || ''} /></td>
                      <td style={{ fontSize: 12 }}>{d.promise_date || '—'}</td>
                      <td>
                        {d.status ? <Badge type={d.status} /> : '—'}
                        {d.clarification_needed && (
                          <div style={{ marginTop: 4 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              ⚠ Needs Clarification
                            </span>
                            {d.clarification_note && (
                              <div title={d.clarification_note} style={{ fontSize: 11, color: 'var(--amber)', marginTop: 2, maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'default' }}>
                                {d.clarification_note}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td title={d.remarks || ''} style={{ fontSize: 12, maxWidth: 140, color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'default' }}>
                        {d.remarks || '—'}
                      </td>
                      <td style={{ minWidth: 140 }}>
                        {d.satisfaction === 'not_satisfied' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>⚠ Disputed</span>
                            {d.satisfaction_reason && (
                              <span title={d.satisfaction_reason} style={{ fontSize: 11, color: 'var(--danger)', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'default', display: 'block' }}>
                                {d.satisfaction_reason}
                              </span>
                            )}
                            {d.satisfaction_by && <span style={{ fontSize: 10, color: 'var(--text3)' }}>by {d.satisfaction_by}</span>}
                          </div>
                        ) : d.satisfaction === 'satisfied' ? (
                          <Badge type="satisfied" />
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>—</span>
                        )}
                      </td>
                      {canReview && (
                        <td>
                          <button
                            className={`btn btn-sm ${!d.decision ? 'btn-primary' : ''}`}
                            onClick={() => setReviewDemand(d)}
                          >
                            {d.decision ? 'Edit' : 'Review'}
                          </button>
                        </td>
                      )}
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