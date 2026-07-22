import React, { useState, useEffect, useCallback } from 'react'
import {
  getScanHistory,
  deleteScanRecord,
  clearAllHistory,
  computeStats,
  getDateLabel,
} from '../historyService'
import { useAuth } from '../context/AuthContext'
import { getUserScans, deleteUserScan } from '../scanService'
import type { ScanRecord, HistoryStats, DayBucket } from '../historyService'
import { sharePDFReport, generatePDFDocument, getTextReportForSharing } from '../services/reportService'

/* ── Health score → colour ─────────────────────────────── */
function scoreColor(score: number, isHealthy: boolean): string {
  if (!isHealthy) {
    if (score < 40) return '#ef4444'
    if (score < 70) return '#f97316'
    return '#f59e0b'
  }
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#86efac'
  return '#f59e0b'
}

function severityBadge(sev: string, healthy: boolean) {
  if (healthy) return <span className="sh-badge sh-badge-healthy">✅ Healthy</span>
  const map: Record<string, string> = {
    low: 'sh-badge-low', moderate: 'sh-badge-mod',
    high: 'sh-badge-high', critical: 'sh-badge-crit',
  }
  return (
    <span className={`sh-badge ${map[sev?.toLowerCase()] || 'sh-badge-mod'}`}>
      ⚠️ {sev || 'Diseased'}
    </span>
  )
}

/* ── 14-Day Trend Bar Chart ────────────────────────────── */
function TrendChart({ days }: { days: DayBucket[] }) {
  const maxScans = Math.max(...days.map(d => d.scans), 1)
  return (
    <div className="trend-chart">
      <div className="trend-bars">
        {days.map((d, i) => (
          <div key={i} className="trend-col">
            <div className="trend-bar-wrap">
              {d.scans > 0 ? (
                <div
                  className={`trend-bar ${d.hasDisease ? 'tbar-disease' : 'tbar-healthy'}`}
                  style={{ height: `${(d.scans / maxScans) * 100}%` }}
                  title={`${d.date}: ${d.scans} scan(s), ${d.hasDisease ? 'Disease detected' : 'Healthy'}`}
                />
              ) : (
                <div className="trend-bar-empty" />
              )}
            </div>
            <div className="trend-label">{d.label}</div>
            {d.scans > 0 && <div className="trend-count">{d.scans}</div>}
          </div>
        ))}
      </div>
      <div className="trend-legend">
        <span className="tleg tleg-healthy">🟢 Healthy</span>
        <span className="tleg tleg-disease">🔴 Disease</span>
        <span className="tleg tleg-none">⬜ No scan</span>
      </div>
    </div>
  )
}

/* ── Stats Row ─────────────────────────────────────────── */
function StatsRow({ stats }: { stats: HistoryStats }) {
  return (
    <div className="sh-stats-row">
      <div className="sh-stat sh-stat-total">
        <div className="sh-stat-num">{stats.total}</div>
        <div className="sh-stat-label">Total Scans</div>
      </div>
      <div className="sh-stat sh-stat-healthy">
        <div className="sh-stat-num">{stats.healthPct}%</div>
        <div className="sh-stat-label">Healthy Rate</div>
      </div>
      <div className="sh-stat sh-stat-conf">
        <div className="sh-stat-num">{stats.avgConfidence}%</div>
        <div className="sh-stat-label">Avg Confidence</div>
      </div>
      <div className="sh-stat sh-stat-streak">
        <div className="sh-stat-num">{stats.streak}d</div>
        <div className="sh-stat-label">Healthy Streak</div>
      </div>
    </div>
  )
}

/* ── Single scan card ──────────────────────────────────── */
function ScanCard({
  record,
  onDelete,
  onView,
}: {
  record: ScanRecord
  onDelete: (id: string) => void
  onView: (r: ScanRecord) => void
}) {
  const scoreVal = Math.round(record.confidence * 100)
  const color    = scoreColor(scoreVal, record.is_healthy)
  const timeStr  = new Date(record.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`scan-card ${record.is_healthy ? 'sc-healthy' : 'sc-disease'}`} onClick={() => onView(record)}>
      <div className="sc-thumb-wrap">
        {record.thumbnail
          ? <img src={record.thumbnail} alt="scan" className="sc-thumb" />
          : <div className="sc-thumb-placeholder">🌿</div>
        }
        {/* Confidence ring overlay */}
        <div className="sc-score-ring" style={{ '--ring-color': color } as React.CSSProperties}>
          <span className="sc-score-num" style={{ color }}>{scoreVal}%</span>
        </div>
      </div>

      <div className="sc-body">
        <div className="sc-top-row">
          {severityBadge(record.severity, record.is_healthy)}
          <span className="sc-time">{timeStr}</span>
        </div>
        <div className="sc-plant">{record.plant_name}</div>
        <div className="sc-disease">{record.disease}</div>
        {record.recommendation && (
          <div className="sc-rec">{record.recommendation.slice(0, 80)}{record.recommendation.length > 80 ? '…' : ''}</div>
        )}
      </div>

      <button
        className="sc-delete"
        onClick={e => { e.stopPropagation(); onDelete(record.id) }}
        title="Delete scan"
      >
        🗑
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   MAIN SCAN HISTORY PANEL
══════════════════════════════════════════════════════════ */
export default function ScanHistory({
  open,
  onClose,
  onRestore,
}: {
  open: boolean
  onClose: () => void
  onRestore: (r: ScanRecord) => void
}) {
  const [records, setRecords]       = useState<ScanRecord[]>([])
  const [stats, setStats]           = useState<HistoryStats | null>(null)
  const [activeTab, setActiveTab]   = useState<'timeline' | 'chart'>('timeline')
  const [selected, setSelected]     = useState<ScanRecord | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [filter, setFilter]         = useState<'all' | 'healthy' | 'diseased'>('all')
  const [showShareModal, setShowShareModal] = useState(false)
  const [copied, setCopied]                 = useState(false)

  const { user } = useAuth()

  const reload = useCallback(async () => {
    if (user && user.uid) {
      try {
        const docs = await getUserScans(user.uid)
        // normalize Firestore docs to ScanRecord shape
        const mapped = docs.map(d => ({
          id: d.id,
          timestamp: d.createdAt && typeof d.createdAt.toMillis === 'function' ? d.createdAt.toMillis() : (d.createdAt ? new Date(d.createdAt).getTime() : Date.now()),
          plant_name: d.plant_name || 'Unknown Plant',
          scientific: d.scientific || '',
          disease: d.disease || 'Unknown',
          is_healthy: d.is_healthy ?? true,
          confidence: d.confidence ?? 0,
          severity: d.severity || 'N/A',
          language: d.language || 'english',
          thumbnail: d.thumbnail || '',
          recommendation: d.recommendation || '',
          result: d.result || null,
        }))
        setRecords(mapped)
        setStats(computeStats(mapped))
        return
      } catch (e) {
        console.warn('Failed to load user scans from Firestore', e)
        // fallback to local history
      }
    }
    const h = getScanHistory()
    setRecords(h)
    setStats(computeStats(h))
  }, [user])

  useEffect(() => { if (open) reload() }, [open, reload])

  const handleDelete = async (id: string) => {
    if (user && user.uid) {
      try { await deleteUserScan(user.uid, id) } catch (e) { console.warn('Failed to delete user scan', e) }
    } else {
      deleteScanRecord(id)
    }
    await reload()
    if (selected?.id === id) setSelected(null)
  }

  const handleClearAll = async () => {
    if (user && user.uid) {
      // delete all user scans from Firestore
      try {
        const docs = await getUserScans(user.uid)
        await Promise.all(docs.map(d => deleteUserScan(user.uid, d.id)))
      } catch (e) { console.warn('Failed to clear user scans', e) }
      setConfirmClear(false)
      await reload()
      setSelected(null)
      return
    }
    clearAllHistory()
    setConfirmClear(false)
    setRecords([]); setStats(null); setSelected(null)
  }

  /* Group records by date label */
  const filtered = records.filter(r =>
    filter === 'all' ? true : filter === 'healthy' ? r.is_healthy : !r.is_healthy
  )
  const groups: { label: string; items: ScanRecord[] }[] = []
  filtered.forEach(r => {
    const lbl = getDateLabel(r.timestamp)
    const g   = groups.find(g => g.label === lbl)
    if (g) g.items.push(r)
    else groups.push({ label: lbl, items: [r] })
  })

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="sh-backdrop" onClick={onClose} />

      {/* Panel */}
      <div className="sh-panel">

        {/* ── Header ── */}
        <div className="sh-header">
          <div className="sh-header-left">
            <span className="sh-header-icon">📋</span>
            <div>
              <h2 className="sh-title">Scan History</h2>
              <p className="sh-subtitle">Last 14 days · {records.length} scan{records.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="sh-header-actions">
            {records.length > 0 && (
              confirmClear ? (
                <div className="sh-confirm-row">
                  <span className="sh-confirm-text">Delete all?</span>
                  <button className="sh-btn sh-btn-danger" onClick={handleClearAll}>Yes, Clear</button>
                  <button className="sh-btn sh-btn-ghost" onClick={() => setConfirmClear(false)}>Cancel</button>
                </div>
              ) : (
                <button className="sh-btn sh-btn-ghost" onClick={() => setConfirmClear(true)}>🗑 Clear All</button>
              )
            )}
            <button className="sh-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {records.length === 0 ? (
          /* Empty state */
          <div className="sh-empty">
            <div className="sh-empty-icon">🌱</div>
            <h3>No scans yet</h3>
            <p>Your plant scan history will appear here after you analyze your first crop photo.</p>
            <button className="sh-btn sh-btn-primary" onClick={onClose}>Start Scanning</button>
          </div>
        ) : (
          <div className="sh-body">

            {/* ── Stats Cards ── */}
            {stats && <StatsRow stats={stats} />}

            {/* ── Tabs ── */}
            <div className="sh-tabs">
              <button className={`sh-tab ${activeTab === 'timeline' ? 'sh-tab-active' : ''}`}
                onClick={() => setActiveTab('timeline')}>📅 Timeline</button>
              <button className={`sh-tab ${activeTab === 'chart' ? 'sh-tab-active' : ''}`}
                onClick={() => setActiveTab('chart')}>📊 14-Day Chart</button>
            </div>

            {/* ══ CHART TAB ══ */}
            {activeTab === 'chart' && stats && (
              <div className="sh-chart-view">
                <div className="sh-chart-title">
                  <span>📈 Scan Activity — Last 14 Days</span>
                  {stats.topDisease !== 'None' && (
                    <span className="sh-top-disease">⚠️ Most common: <strong>{stats.topDisease}</strong></span>
                  )}
                </div>
                <TrendChart days={stats.last14days} />

                {/* Disease breakdown */}
                <div className="sh-breakdown">
                  <div className="sh-breakdown-item sh-bk-green">
                    <span className="sh-bk-num">{stats.healthy}</span>
                    <span className="sh-bk-label">Healthy Scans</span>
                  </div>
                  <div className="sh-breakdown-item sh-bk-red">
                    <span className="sh-bk-num">{stats.diseased}</span>
                    <span className="sh-bk-label">Disease Found</span>
                  </div>
                  <div className="sh-breakdown-item sh-bk-blue">
                    <span className="sh-bk-num">{stats.avgConfidence}%</span>
                    <span className="sh-bk-label">Avg Confidence</span>
                  </div>
                  <div className="sh-breakdown-item sh-bk-purple">
                    <span className="sh-bk-num">{stats.streak}d</span>
                    <span className="sh-bk-label">Healthy Streak</span>
                  </div>
                </div>
              </div>
            )}

            {/* ══ TIMELINE TAB ══ */}
            {activeTab === 'timeline' && (
              <>
                {/* Filter pills */}
                <div className="sh-filter-row">
                  {(['all', 'healthy', 'diseased'] as const).map(f => (
                    <button key={f} className={`sh-filter-btn ${filter === f ? 'sh-filter-active' : ''}`}
                      onClick={() => setFilter(f)}>
                      {f === 'all' ? '🌿 All' : f === 'healthy' ? '✅ Healthy' : '⚠️ Diseased'}
                    </button>
                  ))}
                  <span className="sh-filter-count">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Timeline groups */}
                <div className="sh-timeline">
                  {groups.length === 0 ? (
                    <p className="sh-no-filter">No {filter} scans found.</p>
                  ) : (
                    groups.map(g => (
                      <div key={g.label} className="sh-group">
                        <div className="sh-group-label">
                          <span className="sh-group-dot" />
                          {g.label}
                          <span className="sh-group-count">{g.items.length} scan{g.items.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="sh-cards-list">
                          {g.items.map(r => (
                            <ScanCard key={r.id} record={r} onDelete={handleDelete} onView={setSelected} />
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ══ DETAIL MODAL ══ */}
      {selected && (
        <div className="sh-detail-backdrop" onClick={() => setSelected(null)}>
          <div className="sh-detail-modal" onClick={e => e.stopPropagation()}>
            <button className="sh-detail-close" onClick={() => setSelected(null)}>✕</button>

            <div className="sh-detail-top">
              {selected.thumbnail && (
                <img src={selected.thumbnail} alt="scan" className="sh-detail-img" />
              )}
              <div className="sh-detail-info">
                {severityBadge(selected.severity, selected.is_healthy)}
                <h3 className="sh-detail-plant">{selected.plant_name}</h3>
                {selected.scientific && <p className="sh-detail-sci">{selected.scientific}</p>}
                <p className="sh-detail-disease">{selected.disease}</p>
                <div className="sh-detail-meta">
                  <span>🎯 {Math.round(selected.confidence * 100)}% confidence</span>
                  <span>📅 {new Date(selected.timestamp).toLocaleString('en-IN')}</span>
                  <span>🌐 {selected.language}</span>
                </div>
              </div>
            </div>

            {selected.recommendation && (
              <div className="sh-detail-rec">
                <span>💡</span>
                <p>{selected.recommendation}</p>
              </div>
            )}

            <div className="sh-detail-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
              <button 
                className="sh-btn sh-btn-primary" 
                onClick={() => { onRestore(selected); setSelected(null); onClose() }}
                style={{ flex: '1', minWidth: '120px' }}
              >
                🔄 View Full
              </button>
               <button 
                className="sh-btn" 
                onClick={() => sharePDFReport(selected.result, selected.thumbnail, () => setShowShareModal(true))}
                style={{ 
                  flex: '1', 
                  minWidth: '120px', 
                  background: 'rgba(59, 130, 246, 0.15)', 
                  borderColor: '#3b82f6', 
                  color: '#60a5fa',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                📤 Share PDF
              </button>
              <button 
                className="sh-btn" 
                onClick={async () => {
                  const doc = await generatePDFDocument(selected.result, selected.thumbnail);
                  const filename = `${selected.result.plant?.common_name.replace(/\s+/g, '_') || 'plant'}_health_report.pdf`;
                  doc.save(filename);
                }}
                style={{ 
                  flex: '1', 
                  minWidth: '120px', 
                  background: 'rgba(16, 185, 129, 0.15)', 
                  borderColor: '#10b981', 
                  color: '#34d399',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                📥 Download PDF
              </button>
              <button 
                className="sh-btn sh-btn-danger" 
                onClick={() => { handleDelete(selected.id); setSelected(null) }}
                style={{ flex: '1', minWidth: '120px' }}
              >
                🗑 Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {showShareModal && selected && (
        <div className="sh-detail-backdrop" style={{ zIndex: 300 }} onClick={() => setShowShareModal(false)}>
          <div className="sh-detail-modal share-fallback-modal" onClick={e => e.stopPropagation()}>
            <button className="sh-detail-close" onClick={() => setShowShareModal(false)}>✕</button>
            <h3 className="share-modal-title">📤 Share Plant Report</h3>
            <p className="share-modal-desc">Native sharing is not supported on this browser. Choose an option below to share or download the report.</p>
            
            <div className="share-options-grid">
              <button 
                className="share-option-btn download-btn" 
                onClick={async () => { 
                  const doc = await generatePDFDocument(selected.result, selected.thumbnail);
                  const filename = `${selected.result.plant?.common_name.replace(/\s+/g, '_') || 'plant'}_health_report.pdf`;
                  doc.save(filename);
                  setShowShareModal(false);
                }}
              >
                <span className="share-icon">📄</span>
                <span className="share-label">Download PDF Report</span>
              </button>
              
              <button 
                className="share-option-btn copy-btn" 
                onClick={() => {
                  const text = getTextReportForSharing(selected.result);
                  navigator.clipboard.writeText(text).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
              >
                <span className="share-icon">📋</span>
                <span className="share-label">{copied ? "Copied!" : "Copy Text Report"}</span>
              </button>
              
              <a 
                className="share-option-btn whatsapp-btn" 
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(getTextReportForSharing(selected.result))}`}
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => setShowShareModal(false)}
              >
                <span className="share-icon">💬</span>
                <span className="share-label">Share on WhatsApp</span>
              </a>
              
              <a 
                className="share-option-btn telegram-btn" 
                href={`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(getTextReportForSharing(selected.result))}`}
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => setShowShareModal(false)}
              >
                <span className="share-icon">✈️</span>
                <span className="share-label">Share on Telegram</span>
              </a>

              <a 
                className="share-option-btn email-btn" 
                href={`mailto:?subject=${encodeURIComponent(`AgroAI Plant Health Report: ${selected.result.plant?.common_name || 'Plant'}`)}&body=${encodeURIComponent(getTextReportForSharing(selected.result))}`}
                onClick={() => setShowShareModal(false)}
              >
                <span className="share-icon">✉️</span>
                <span className="share-label">Share via Email</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
