import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Badge, Icons } from '../components/Icons'
import DemandModal from '../components/DemandModal'
import ReviewModal from '../components/ReviewModal'
import SatisfactionModal from '../components/SatisfactionModal'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function DemandsPage() {
  const { toast } = useOutletContext()
  const { profile } = useAuth()
  const [demands, setDemands] = useState([])
  const [loading, setLoading] = useState(true)
  const [myStores, setMyStores] = useState(null)

  const [search, setSearch] = useState('')
  const [filterLM, setFilterLM] = useState('')
  const [filterABO, setFilterABO] = useState('')
  const [filterStore, setFilterStore] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterDecision, setFilterDecision] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterOwner, setFilterOwner] = useState('')
  const [filterSatisfaction, setFilterSatisfaction] = useState('')

  const [editDemand, setEditDemand] = useState(null)
  const [reviewDemand, setReviewDemand] = useState(null)
  const [satisfactionDemand, setSatisfactionDemand] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  const role = profile?.role
  const canRespondSatisfaction = ['store', 'abo', 'lm'].includes(role)

  useEffect(() => { if (profile) fetchMyStores() }, [profile])

  useEffect(() => {
    if (myStores === null) return
    if (role === 'admin') fetchDemands([])
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
    let query = supabase.from('demands').select('*').order('created_at', { ascending: false })
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

  const lmOptions = [...new Set(demands.map(d => d.lm_name).filter(Boolean))].sort()
  const aboOptions = [...new Set(demands.map(d => d.abo).filter(Boolean))].sort()
  const storeOptions = [...new Set(demands.map(d => d.store_name).filter(Boolean))].sort()
  const depts = [...new Set(demands.map(d => d.department).filter(Boolean))]
  const owners = [...new Set(demands.map(d => d.action_owner).filter(Boolean))]

  const filtered = demands.filter(d => {
    const q = search.toLowerCase()
    if (q && !d.store_name?.toLowerCase().includes(q) && !d.lm_name?.toLowerCase().includes(q) && !d.original_ask?.toLowerCase().includes(q)) return false
    if (filterLM && d.lm_name !== filterLM) return false
    if (filterABO && d.abo !== filterABO) return false
    if (filterStore && d.store_name !== filterStore) return false
    if (filterDept && d.department !== filterDept) return false
    if (filterDecision && d.decision !== filterDecision) return false
    if (filterMonth && d.month !== filterMonth) return false
    if (filterOwner && d.action_owner !== filterOwner) return false
    if (filterSatisfaction === 'satisfied' && d.satisfaction !== 'satisfied') return false
    if (filterSatisfaction === 'not_satisfied' && d.satisfaction !== 'not_satisfied') return false
    if (filterSatisfaction === 'awaiting' && !(d.status === 'Done' && !d.satisfaction)) return false
    return true
  })

  function clearAll() {
    setSearch(''); setFilterLM(''); setFilterABO(''); setFilterStore('')
    setFilterDept(''); setFilterDecision(''); setFilterMonth(''); setFilterOwner('')
    setFilterSatisfaction('')
  }

  const hasFilters = search || filterLM || filterABO || filterStore || filterDept || filterDecision || filterMonth || filterOwner || filterSatisfaction

  async function handleAdd(form) {
    const { error } = await supabase.from('demands').insert([form])
    if (error) throw error
    toast('Demand added!', 'success')
    setShowAdd(false)
    refetch()
  }

  async function handleEdit(form) {
    const original = editDemand
    const ownerChanged = form.action_owner !== original.action_owner
    const updateData = {
      ...form,
      ...(ownerChanged && {
        decision: null,
        reject_reason: null,
        promise_date: null,
        status: 'Pending',
        remarks: null,
      })
    }
    const { error } = await supabase.from('demands').update(updateData).eq('id', original.id)
    if (error) throw error
    toast(ownerChanged ? 'Demand reassigned — review cleared' : 'Demand updated', 'success')
    setEditDemand(null)
    refetch()
  }

  async function handleReview(reviewData) {
    const updateData = { ...reviewData }

    if (reviewData.status === 'Done') {
      // Set completion timestamp + reset satisfaction for fresh re-evaluation
      updateData.completed_at = new Date().toISOString()
      updateData.satisfaction = null
      updateData.satisfaction_reason = null
      updateData.satisfaction_by = null
      updateData.satisfaction_at = null
    }

    if (reviewData.status === 'In Progress' || reviewData.status === 'Pending') {
      // If owner rolls back status, clear completion date too
      updateData.completed_at = null
    }

    const { error } = await supabase.from('demands').update(updateData).eq('id', reviewDemand.id)
    if (error) throw error
    toast('Review saved', 'success')
    setReviewDemand(null)
    refetch() // or fetchMyDemands() in MyActionsPage
  }

  async function handleSatisfaction({ satisfaction, satisfaction_reason }) {
    const updateData = {
      satisfaction,
      satisfaction_reason,
      satisfaction_by: profile?.full_name || profile?.email,
      satisfaction_at: new Date().toISOString(),
      // flip back to In Progress if not satisfied
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

  // Satisfaction badge helper
  function SatisfactionBadge({ demand }) {
    if (demand.status !== 'Done' && demand.satisfaction !== 'satisfied') {
      if (demand.satisfaction === 'not_satisfied') {
        // show even if status flipped back
      } else {
        return <span style={{ color: 'var(--text3)', fontSize: 11 }}>—</span>
      }
    }
    if (!demand.satisfaction) {
      if (demand.status === 'Done' && canRespondSatisfaction) {
        return (
          <button
            className="btn btn-sm"
            style={{ fontSize: 11, background: 'var(--amber)', color: '#fff', border: 'none' }}
            onClick={() => setSatisfactionDemand(demand)}
          >
            Respond
          </button>
        )
      }
      if (demand.status === 'Done') {
        return <span style={{ fontSize: 11, color: 'var(--text3)' }}>Awaiting</span>
      }
      return <span style={{ color: 'var(--text3)', fontSize: 11 }}>—</span>
    }
    if (demand.satisfaction === 'satisfied') {
      return <Badge type="satisfied" />
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Badge type="not_satisfied" />
        {demand.satisfaction_reason && (
          <span style={{ fontSize: 10, color: 'var(--danger)', maxWidth: 140, whiteSpace: 'normal', lineHeight: 1.3 }}>
            {demand.satisfaction_reason}
          </span>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">All Demands</div>
          <div className="page-sub">{filtered.length} of {demands.length} demands</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          {Icons.plus} Add Demand
        </button>
      </div>

      <div className="page-body">
        <div className="table-wrap">
          <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div className="search-wrap">
              {Icons.search}
              <input className="search-input" placeholder="Search store, LM, ask…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

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

            <select className="filter-select" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
              <option value="">All months</option>
              {MONTHS.map(m => <option key={m}>{m}</option>)}
            </select>

            <select className="filter-select" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
              <option value="">All departments</option>
              {depts.map(d => <option key={d}>{d}</option>)}
            </select>

            <select className="filter-select" value={filterDecision} onChange={e => setFilterDecision(e.target.value)}>
              <option value="">All decisions</option>
              <option value="Accept">Accepted</option>
              <option value="Reject">Rejected</option>
            </select>

            <select className="filter-select" value={filterOwner} onChange={e => setFilterOwner(e.target.value)}>
              <option value="">All owners</option>
              {owners.map(o => <option key={o}>{o}</option>)}
            </select>

            <select className="filter-select" value={filterSatisfaction} onChange={e => setFilterSatisfaction(e.target.value)}>
              <option value="">All satisfaction</option>
              <option value="satisfied">Satisfied</option>
              <option value="not_satisfied">Disputed</option>
              <option value="awaiting">Awaiting response</option>
            </select>

            {hasFilters && (
              <button className="btn btn-sm" onClick={clearAll}>Clear all</button>
            )}
          </div>

          {loading ? (
            <div className="loading"><div className="spinner" /> Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              {Icons.inbox}
              <div className="empty-state-title">No demands found</div>
              <div className="empty-state-sub">{hasFilters ? 'Try clearing the filters' : 'Add a new demand to get started'}</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ABO</th>
                    <th>LM</th>
                    <th>Store</th>
                    <th>Ask</th>
                    <th>Owner</th>
                    <th>Dept</th>
                    <th>Month</th>
                    <th>Decision</th>
                    <th>Rejection Reason</th>
                    <th>Status</th>
                    <th>Promise</th>
                    <th>Remarks</th>
                    <th>Satisfaction</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(d => (
                    <tr key={d.id}>
                      <td><span className="tag">{d.s_no || '—'}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text2)' }}>{d.abo || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text2)' }}>{d.lm_name}</td>
                      <td><strong style={{ fontSize: 13 }}>{d.store_name}</strong></td>
                      <td className="td-truncate">{d.original_ask}</td>
                      <td style={{ fontSize: 12 }}>{d.action_owner || '—'}</td>
                      <td style={{ fontSize: 11, color: 'var(--text3)' }}>{d.department || '—'}</td>
                      <td><span className="month-chip">{d.month || '—'}</span></td>
                      <td><Badge type={d.decision || ''} /></td>
                      <td style={{ fontSize: 12, maxWidth: 160 }}>
                        {d.decision === 'Reject'
                          ? <span style={{ color: 'var(--danger)' }}>{d.reject_reason || '—'}</span>
                          : '—'}
                      </td>
                      <td>{d.status ? <Badge type={d.status} /> : '—'}</td>
                      <td style={{ fontSize: 12 }}>{d.promise_date || '—'}</td>
                      <td className="td-truncate" style={{ fontSize: 12, color: 'var(--text2)', maxWidth: 140 }}>
                        {d.remarks || '—'}
                      </td>
                      <td style={{ minWidth: 100 }}>
                        <SatisfactionBadge demand={d} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-sm btn-icon" onClick={() => setEditDemand(d)} title="Edit" aria-label="Edit demand">
                            {Icons.edit}
                          </button>
                          {(role === 'owner' || role === 'admin') && (
                            <button className="btn btn-sm" onClick={() => setReviewDemand(d)} style={{ fontSize: 11 }}>
                              Review
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAdd && <DemandModal userProfile={profile} onClose={() => setShowAdd(false)} onSave={handleAdd} />}
      {editDemand && <DemandModal demand={editDemand} userProfile={profile} onClose={() => setEditDemand(null)} onSave={handleEdit} />}
      {reviewDemand && <ReviewModal demand={reviewDemand} onClose={() => setReviewDemand(null)} onSave={handleReview} />}
      {satisfactionDemand && <SatisfactionModal demand={satisfactionDemand} onClose={() => setSatisfactionDemand(null)} onSave={handleSatisfaction} />}
    </>
  )
}