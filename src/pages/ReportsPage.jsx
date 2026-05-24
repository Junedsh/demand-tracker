import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function getMonthRange() {
    const now = new Date()
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return {
        from: first.toISOString().slice(0, 10),
        to: last.toISOString().slice(0, 10),
    }
}

function pct(num, den) {
    if (!den) return '—'
    return Math.round((num / den) * 100) + '%'
}

function calcAvgTAT(demands) {
    const completed = demands.filter(d => d.completed_at && d.created_at)
    if (!completed.length) return '—'
    const avg = completed.reduce((sum, d) => {
        return sum + Math.round((new Date(d.completed_at) - new Date(d.created_at)) / (1000 * 60 * 60 * 24))
    }, 0) / completed.length
    return Math.round(avg) + 'd'
}

function Cell({ value, highlight }) {
    const style = {
        padding: '8px 12px',
        fontSize: 13,
        textAlign: 'center',
        whiteSpace: 'nowrap',
        ...(highlight === 'red' ? { background: 'rgba(220,53,69,0.1)', color: 'var(--danger)', fontWeight: 600 } : {}),
        ...(highlight === 'amber' ? { background: 'rgba(245,158,11,0.1)', color: '#92670a', fontWeight: 600 } : {}),
        ...(highlight === 'green' ? { color: 'var(--success, #16a34a)', fontWeight: 600 } : {}),
    }
    return <td style={style}>{value ?? '—'}</td>
}

export default function ReportsPage() {
    const { toast } = useOutletContext()
    const { profile } = useAuth()
    const [demands, setDemands] = useState([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState('owner')

    const defaultRange = getMonthRange()
    const [filterFrom, setFilterFrom] = useState(defaultRange.from)
    const [filterTo, setFilterTo] = useState(defaultRange.to)

    const role = profile?.role

    useEffect(() => { if (profile) fetchDemands() }, [profile])

    async function fetchDemands() {
        setLoading(true)
        let query = supabase.from('demands').select('*').order('created_at', { ascending: false })

        if (role === 'manager') {
            const { data: reportees } = await supabase.from('profiles').select('full_name')
                .eq('manager', profile.full_name).eq('role', 'owner')
            const names = (reportees ?? []).map(r => r.full_name).filter(Boolean)
            if (names.length > 0) query = query.in('action_owner', names)
        } else if (role === 'director') {
            const { data: reportees } = await supabase.from('profiles').select('full_name')
                .eq('director', profile.full_name).eq('role', 'owner')
            const names = (reportees ?? []).map(r => r.full_name).filter(Boolean)
            if (names.length > 0) query = query.in('action_owner', names)
        }

        const { data, error } = await query
        if (error) toast(error.message, 'error')
        else setDemands(data ?? [])
        setLoading(false)
    }

    // Apply date filter
    const filtered = demands.filter(d => {
        if (filterFrom && d.created_at && d.created_at.slice(0, 10) < filterFrom) return false
        if (filterTo && d.created_at && d.created_at.slice(0, 10) > filterTo) return false
        return true
    })

    // Group demands by selected view
    function groupBy(field) {
        const map = {}
        filtered.forEach(d => {
            const key = d[field] || '(Unassigned)'
            if (!map[key]) map[key] = []
            map[key].push(d)
        })
        return map
    }

    const fieldMap = {
        owner: 'action_owner',
        lm: 'lm_name',
        abo: 'abo',
    }

    const grouped = groupBy(fieldMap[view])

    // Build rows sorted by assigned count desc
    const rows = Object.entries(grouped)
        .map(([name, items]) => {
            const assigned = items.length
            const accepted = items.filter(d => d.decision === 'Accept').length
            const rejected = items.filter(d => d.decision === 'Reject').length
            const notResponded = items.filter(d => !d.decision).length
            const inProgress = items.filter(d => d.status === 'In Progress').length
            const completed = items.filter(d => d.status === 'Done').length
            const disputed = items.filter(d => d.satisfaction === 'not_satisfied').length
            const clarification = items.filter(d => d.clarification_needed).length
            const promiseAdded = items.filter(d => d.promise_date).length
            const promiseMissing = items.filter(d => d.decision === 'Accept' && !d.promise_date).length
            const attended = accepted + rejected
            const avgTAT = calcAvgTAT(items)

            return {
                name, assigned, accepted, rejected, notResponded,
                inProgress, completed, disputed, clarification,
                promiseAdded, promiseMissing, attended, avgTAT,
                attendedPct: pct(attended, assigned),
                acceptedPct: pct(accepted, assigned),
                rejectedPct: pct(rejected, assigned),
                completedPct: pct(completed, accepted || 1),
            }
        })
        .sort((a, b) => b.assigned - a.assigned)

    // Totals row
    const totals = rows.reduce((acc, r) => ({
        assigned: acc.assigned + r.assigned,
        accepted: acc.accepted + r.accepted,
        rejected: acc.rejected + r.rejected,
        notResponded: acc.notResponded + r.notResponded,
        inProgress: acc.inProgress + r.inProgress,
        completed: acc.completed + r.completed,
        disputed: acc.disputed + r.disputed,
        clarification: acc.clarification + r.clarification,
        promiseAdded: acc.promiseAdded + r.promiseAdded,
        promiseMissing: acc.promiseMissing + r.promiseMissing,
        attended: acc.attended + r.attended,
    }), { assigned: 0, accepted: 0, rejected: 0, notResponded: 0, inProgress: 0, completed: 0, disputed: 0, clarification: 0, promiseAdded: 0, promiseMissing: 0, attended: 0 })

    const dateFiltersChanged = filterFrom !== defaultRange.from || filterTo !== defaultRange.to

    const viewLabels = { owner: 'By Owner', lm: 'By LM', abo: 'By ABO' }

    return (
        <>
            <div className="page-header">
                <div>
                    <div className="page-title">Reports</div>
                    <div className="page-sub">Performance summary · {filtered.length} demands</div>
                </div>
            </div>

            <div className="page-body">
                <div className="table-wrap">
                    <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: 8 }}>

                        {/* View toggle */}
                        <div style={{ display: 'flex', gap: 4 }}>
                            {['owner', 'lm', 'abo'].map(v => (
                                <button
                                    key={v}
                                    className={`btn btn-sm ${view === v ? 'btn-primary' : ''}`}
                                    onClick={() => setView(v)}
                                >
                                    {viewLabels[v]}
                                </button>
                            ))}
                        </div>

                        {/* Date range */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>From</span>
                            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="filter-select" style={{ width: 140 }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>To</span>
                            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="filter-select" style={{ width: 140 }} />
                        </div>
                        {dateFiltersChanged && (
                            <button className="btn btn-sm" onClick={() => { setFilterFrom(defaultRange.from); setFilterTo(defaultRange.to) }}>
                                Reset dates
                            </button>
                        )}

                        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)' }}>{rows.length} {view === 'owner' ? 'owners' : view === 'lm' ? 'LMs' : 'ABOs'}</span>
                    </div>

                    {loading ? (
                        <div className="loading"><div className="spinner" /> Loading…</div>
                    ) : rows.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-title">No data found</div>
                            <div className="empty-state-sub">Try adjusting the date range</div>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', minWidth: 160 }}>{view === 'owner' ? 'Owner' : view === 'lm' ? 'LM' : 'ABO'}</th>
                                        <th>Assigned</th>
                                        <th>Accepted</th>
                                        <th>Rejected</th>
                                        <th>Not Responded</th>
                                        <th>In Progress</th>
                                        <th>Completed</th>
                                        <th>Disputed</th>
                                        <th>Needs Clarification</th>
                                        <th>Promise Date Added</th>
                                        <th>Promise Date Missing</th>
                                        <th>Avg TAT</th>
                                        <th>Attended %</th>
                                        <th>Accepted %</th>
                                        <th>Rejected %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map(r => (
                                        <tr key={r.name}>
                                            <td style={{ fontWeight: 600, fontSize: 13, padding: '8px 12px' }}>{r.name}</td>
                                            <Cell value={r.assigned} />
                                            <Cell value={r.accepted} highlight={r.accepted > 0 ? 'green' : ''} />
                                            <Cell value={r.rejected} highlight={r.rejected > 0 ? 'red' : ''} />
                                            <Cell value={r.notResponded} highlight={r.notResponded > 0 ? 'amber' : ''} />
                                            <Cell value={r.inProgress} />
                                            <Cell value={r.completed} highlight={r.completed > 0 ? 'green' : ''} />
                                            <Cell value={r.disputed} highlight={r.disputed > 0 ? 'red' : ''} />
                                            <Cell value={r.clarification} highlight={r.clarification > 0 ? 'amber' : ''} />
                                            <Cell value={r.promiseAdded} />
                                            <Cell value={r.promiseMissing} highlight={r.promiseMissing > 0 ? 'red' : ''} />
                                            <Cell value={r.avgTAT} />
                                            <Cell value={r.attendedPct} highlight={parseInt(r.attendedPct) < 80 ? 'amber' : 'green'} />
                                            <Cell value={r.acceptedPct} />
                                            <Cell value={r.rejectedPct} highlight={parseInt(r.rejectedPct) > 30 ? 'red' : ''} />
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--surface2)' }}>
                                        <td style={{ fontWeight: 700, fontSize: 13, padding: '8px 12px' }}>Grand Total</td>
                                        <Cell value={totals.assigned} />
                                        <Cell value={totals.accepted} highlight="green" />
                                        <Cell value={totals.rejected} highlight={totals.rejected > 0 ? 'red' : ''} />
                                        <Cell value={totals.notResponded} highlight={totals.notResponded > 0 ? 'amber' : ''} />
                                        <Cell value={totals.inProgress} />
                                        <Cell value={totals.completed} highlight="green" />
                                        <Cell value={totals.disputed} highlight={totals.disputed > 0 ? 'red' : ''} />
                                        <Cell value={totals.clarification} highlight={totals.clarification > 0 ? 'amber' : ''} />
                                        <Cell value={totals.promiseAdded} />
                                        <Cell value={totals.promiseMissing} highlight={totals.promiseMissing > 0 ? 'red' : ''} />
                                        <Cell value="—" />
                                        <Cell value={pct(totals.attended, totals.assigned)} highlight={parseInt(pct(totals.attended, totals.assigned)) < 80 ? 'amber' : 'green'} />
                                        <Cell value={pct(totals.accepted, totals.assigned)} />
                                        <Cell value={pct(totals.rejected, totals.assigned)} highlight={parseInt(pct(totals.rejected, totals.assigned)) > 30 ? 'red' : ''} />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}