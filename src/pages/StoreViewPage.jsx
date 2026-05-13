import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Badge, Icons } from '../components/Icons'

const STORAGE_KEY = 'demand_tracker_selected_store'

export default function StoreViewPage() {
  const { toast } = useOutletContext()
  const { profile } = useAuth()

  const [allStores, setAllStores] = useState([])
  const [selectedStore, setSelectedStore] = useState(() => localStorage.getItem(STORAGE_KEY) || '')
  const [demands, setDemands] = useState([])
  const [loading, setLoading] = useState(false)
  const [storesLoading, setStoresLoading] = useState(true)

  // Load all stores from store_master on mount
  useEffect(() => {
    fetchStores()
  }, [])

  // Fetch demands whenever selectedStore changes
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
    const { data } = await supabase
      .from('store_master')
      .select('store_name, lm_name, abo')
      .order('store_name')
    setAllStores(data ?? [])
    setStoresLoading(false)
  }

  async function fetchDemands(storeName) {
    setLoading(true)
    const { data, error } = await supabase
      .from('demands')
      .select('*')
      .eq('store_name', storeName)
      .order('created_at', { ascending: false })
    if (error) toast(error.message, 'error')
    else setDemands(data ?? [])
    setLoading(false)
  }

  const selectedStoreInfo = allStores.find(s => s.store_name === selectedStore)
  const accepted = demands.filter(d => d.decision === 'Accept').length
  const rejected = demands.filter(d => d.decision === 'Reject').length
  const pending = demands.filter(d => !d.decision).length

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
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 24
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Select Your Store
          </div>
          <select
            value={selectedStore}
            onChange={e => setSelectedStore(e.target.value)}
            style={{
              width: '100%', maxWidth: 420, padding: '9px 12px', fontSize: 14,
              border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font)',
            }}
          >
            <option value="">— Select your store —</option>
            {storesLoading
              ? <option disabled>Loading stores…</option>
              : allStores.map(s => (
                <option key={s.store_name} value={s.store_name}>{s.store_name}</option>
              ))
            }
          </select>
          {selectedStore && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text3)' }}>
              Your selection is saved. It will be remembered next time you log in.
            </div>
          )}
        </div>

        {/* Only show stats + table if a store is selected */}
        {selectedStore && (
          <>
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
                  <div className="empty-state-sub">No demands have been submitted for {selectedStore}</div>
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
                      </tr>
                    </thead>
                    <tbody>
                      {demands.map(d => (
                        <tr key={d.id}>
                          <td className="td-truncate">{d.original_ask}</td>
                          <td style={{ fontSize: 12 }}>{d.action_owner || '—'}</td>
                          <td style={{ fontSize: 11, color: 'var(--text3)' }}>{d.department || '—'}</td>
                          <td><span className="month-chip">{d.month || '—'}</span></td>
                          <td><Badge type={d.decision || ''} /></td>
                          <td className="td-truncate" style={{ fontSize: 12, color: 'var(--danger)' }}>
                            {d.decision === 'Reject' ? (d.reject_reason || '—') : '—'}
                          </td>
                          <td style={{ fontSize: 12 }}>{d.promise_date || '—'}</td>
                          <td>{d.status ? <Badge type={d.status} /> : '—'}</td>
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
          </>
        )}
      </div>
    </>
  )
}