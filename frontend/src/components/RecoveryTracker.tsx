import { useState, useEffect, useMemo } from 'react'
import { getApiUrl } from '../services/apiConfig'
import type { AgroAIResponse } from '../types'

function severityScore(s: string | undefined): number {
  if (!s) return 0
  const v = s.toLowerCase()
  if (v.includes('critical')) return 4
  if (v.includes('high'))     return 3
  if (v.includes('moderate')) return 2
  if (v.includes('low'))      return 1
  return 2
}

interface GrowthLog {
  day: number
  date: string
  height: number
  status: 'diseased' | 'recovering' | 'healthy'
}

export default function RecoveryTracker({ originalResult, originalImage: _originalImage, language, initialStartDate }:
  { originalResult: AgroAIResponse | null, originalImage?: string | null, language?: string, initialStartDate?: string | null }) {
  const [startDate, setStartDate] = useState<string | null>(null)
  const [daysElapsed, setDaysElapsed] = useState<number>(0)
  const [afterFile, setAfterFile] = useState<File | null>(null)
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Growth logs state
  const [growthLogs, setGrowthLogs] = useState<GrowthLog[]>([])
  
  // Input form state
  const [newLogHeight, setNewLogHeight] = useState<string>('')
  const [newLogStatus, setNewLogStatus] = useState<'diseased' | 'recovering' | 'healthy'>('diseased')
  const [newLogDay, setNewLogDay] = useState<number>(1)
  
  // Tooltip state
  const [hoveredLog, setHoveredLog] = useState<GrowthLog | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const plantKey = useMemo(() => {
    return originalResult?.plant?.common_name || 'default_plant'
  }, [originalResult])

  useEffect(() => {
    if (initialStartDate) setStartDate(initialStartDate)
  }, [initialStartDate])

  useEffect(() => {
    if (!startDate) return
    
    // Set days elapsed immediately
    const sd = new Date(startDate)
    const diff = Math.max(0, Math.floor((Date.now() - sd.getTime()) / (1000 * 60 * 60 * 24)))
    setDaysElapsed(diff)

    // Load or generate logs
    const storageKey = `agro_growth_logs_${plantKey}`
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        setGrowthLogs(JSON.parse(saved))
        return
      } catch (e) {}
    }

    // Generate simulated logs up to current days elapsed (max 14 days initially)
    const logsCount = Math.max(1, Math.min(diff, 14))
    const generated: GrowthLog[] = []
    const startMs = sd.getTime()

    for (let d = 1; d <= logsCount; d++) {
      const logDate = new Date(startMs + (d - 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      let status: 'diseased' | 'recovering' | 'healthy' = 'diseased'
      let height = 15.0

      if (d <= 4) {
        status = 'diseased'
        height = 15.0 + (d - 1) * 0.3
      } else {
        // Default simulation stays in "recovering" (orange/yellow) until AI or user sets "healthy"
        status = 'recovering'
        height = 15.9 + (d - 4) * 0.6
      }

      generated.push({
        day: d,
        date: logDate,
        height: Math.round(height * 10) / 10,
        status
      })
    }
    
    setGrowthLogs(generated)
    localStorage.setItem(storageKey, JSON.stringify(generated))

    // Interval to keep checking days elapsed
    const t = setInterval(() => {
      const sdNow = new Date(startDate)
      const diffNow = Math.max(0, Math.floor((Date.now() - sdNow.getTime()) / (1000 * 60 * 60 * 24)))
      setDaysElapsed(diffNow)
    }, 1000 * 60)

    return () => clearInterval(t)
  }, [startDate, plantKey])

  // Automatically update form's Day input based on next available day
  useEffect(() => {
    if (growthLogs.length > 0) {
      setNewLogDay(growthLogs[growthLogs.length - 1].day + 1)
      // Autofill status recommendation based on previous status
      const lastStatus = growthLogs[growthLogs.length - 1].status
      setNewLogStatus(lastStatus)
      // Autofill height increment recommendation
      const lastHeight = growthLogs[growthLogs.length - 1].height
      setNewLogHeight(String(Math.round((lastHeight + 0.8) * 10) / 10))
    } else {
      setNewLogDay(1)
      setNewLogStatus('diseased')
      setNewLogHeight('15.0')
    }
  }, [growthLogs])

  const handleSetToday = () => setStartDate(new Date().toISOString().slice(0, 10))
  const handleAfterFile = (f?: File) => setAfterFile(f || null)

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault()
    const heightVal = parseFloat(newLogHeight)
    if (isNaN(heightVal) || heightVal <= 0) return alert('Please enter a valid height')
    if (newLogDay <= 0) return alert('Day must be greater than 0')

    const logDate = startDate
      ? new Date(new Date(startDate).getTime() + (newLogDay - 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)

    const newLog: GrowthLog = {
      day: newLogDay,
      date: logDate,
      height: Math.round(heightVal * 10) / 10,
      status: newLogStatus
    }

    let updated = [...growthLogs]
    const existingIdx = updated.findIndex(l => l.day === newLogDay)
    if (existingIdx >= 0) {
      updated[existingIdx] = newLog
    } else {
      updated.push(newLog)
    }
    
    // Sort logs by day
    updated.sort((a, b) => a.day - b.day)
    
    setGrowthLogs(updated)
    localStorage.setItem(`agro_growth_logs_${plantKey}`, JSON.stringify(updated))
  }

  async function uploadAndCompare() {
    if (!afterFile) return setMessage('Please select an after-treatment image')
    setChecking(true); setMessage(null)
    try {
      const fd = new FormData()
      fd.append('image', afterFile)
      fd.append('language', language || 'english')

      const res = await fetch(getApiUrl('/api/v1/prediction/'), {
        method: 'POST', body: fd
      })
      const data: AgroAIResponse = await res.json()
      
      const origSeverity = severityScore(originalResult?.health?.severity)
      const afterSeverity = severityScore(data.health?.severity)
      let msg = ''
      let verifiedStatus: 'diseased' | 'recovering' | 'healthy' = 'diseased'
      let finalHeight = 16.0
      
      if (data.success && (data.health?.is_healthy || afterSeverity < origSeverity)) {
        if (data.health?.is_healthy) {
          msg = '✅ AI confirms the treatment is working — signs of recovery detected.'
          verifiedStatus = 'healthy'
          finalHeight = 26.5 // Full recovery height
        } else {
          msg = '✅ AI confirms the treatment is working — signs of recovery detected.'
          verifiedStatus = 'recovering'
          finalHeight = 21.0 // Recovering height
        }
      } else if (data.success && afterSeverity === origSeverity) {
        msg = 'ℹ️ No significant change detected. Continue treatment and re-check after 7 days.'
        verifiedStatus = 'diseased'
        finalHeight = 16.5 // Little or no growth
      } else {
        msg = '⚠️ Treatment may not be effective. Consider consulting an expert or re-applying treatment.'
        verifiedStatus = 'diseased'
        finalHeight = 15.5 // No growth
      }
      
      setMessage(msg)

      // Automatically append/update the growth log for the recovery verification day!
      const targetDay = Math.max(daysElapsed, 14)
      const logDate = startDate
        ? new Date(new Date(startDate).getTime() + (targetDay - 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)

      const recoveryLog: GrowthLog = {
        day: targetDay,
        date: logDate,
        height: finalHeight,
        status: verifiedStatus
      }

      // Update growth logs list and transition intermediate states
      setGrowthLogs(prev => {
        let updated = [...prev]
        const existingIdx = updated.findIndex(l => l.day === targetDay)
        if (existingIdx >= 0) {
          updated[existingIdx] = recoveryLog
        } else {
          updated.push(recoveryLog)
        }
        
        // If recovery was verified as healthy/recovering, transition older logs to match this state
        if (verifiedStatus === 'healthy') {
          updated = updated.map(log => {
            if (log.day > 4 && log.day < targetDay) {
              return {
                ...log,
                status: 'recovering',
                height: Math.round((15.9 + (log.day - 4) * (26.5 - 15.9) / (targetDay - 4)) * 10) / 10
              }
            }
            return log
          })
        } else if (verifiedStatus === 'recovering') {
          updated = updated.map(log => {
            if (log.day > 4 && log.day < targetDay) {
              return {
                ...log,
                status: 'recovering',
                height: Math.round((15.9 + (log.day - 4) * (21.0 - 15.9) / (targetDay - 4)) * 10) / 10
              }
            }
            return log
          })
        }
        
        updated.sort((a, b) => a.day - b.day)
        localStorage.setItem(`agro_growth_logs_${plantKey}`, JSON.stringify(updated))
        return updated
      })

      // Persist small record
      try {
        const key = 'agro_recovery_records'
        const rec = { 
          at: new Date().toISOString(), 
          originalSeverity: originalResult?.health?.severity || '', 
          afterSeverity: data.health?.severity || '', 
          message: msg 
        }
        const prev = JSON.parse(localStorage.getItem(key) || '[]')
        prev.unshift(rec)
        localStorage.setItem(key, JSON.stringify(prev.slice(0, 20)))
      } catch (e) {}

    } catch (e: any) {
      setMessage('Upload failed: ' + (e?.message || String(e)))
    } finally { setChecking(false) }
  }

  // Calculate SVG dimensions and parameters
  const svgWidth = 450
  const svgHeight = 220
  const chartPadding = { top: 20, right: 20, bottom: 35, left: 45 }
  const plotWidth = svgWidth - chartPadding.left - chartPadding.right
  const plotHeight = svgHeight - chartPadding.top - chartPadding.bottom

  const maxLogHeight = useMemo(() => {
    if (growthLogs.length === 0) return 30
    return Math.max(...growthLogs.map(l => l.height), 20)
  }, [growthLogs])

  const yMax = Math.ceil(maxLogHeight / 5) * 5 // Round up to nearest 5 for gridline labels
  const yTicks = [0, yMax / 4, yMax / 2, (yMax * 3) / 4, yMax].map(v => Math.round(v))

  return (
    <div className="recovery-tracker">
      <style>{`
        .recovery-tracker {
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 12px;
          padding: 16px;
          color: #cbd5e1;
        }
        .recovery-tracker h3 {
          font-size: 16px;
          font-weight: 700;
          color: #fff;
          margin: 0;
          text-align: left;
        }
        .rt-desc {
          font-size: 12px;
          color: #94a3b8;
          margin: 0;
          line-height: 1.4;
          text-align: left;
        }
        .rt-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
        }
        .rt-row label {
          font-size: 12px;
          font-weight: 600;
          color: #cbd5e1;
        }
        .rt-row div {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .rt-row input[type="date"] {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #fff;
          padding: 4px 8px;
          border-radius: 6px;
          font-family: inherit;
          font-size: 12px;
        }
        .rt-row button {
          font-size: 11px;
          padding: 4px 8px;
          min-height: 28px;
          border-radius: 6px;
        }
        .rt-row input[type="file"] {
          font-size: 11px;
          color: #94a3b8;
        }
        .rt-actions {
          margin-top: 10px;
          display: flex;
          gap: 10px;
          justify-content: flex-start;
        }
        .rt-message {
          padding: 10px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2) !important;
          border-radius: 6px;
          font-size: 12px;
          color: #93c5fd;
          text-align: left;
        }
        .rt-chart-container {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.05) !important;
          border-radius: 8px;
          padding: 12px;
          margin-top: 6px;
          position: relative;
        }
        .rt-chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          flex-wrap: wrap;
          gap: 6px;
        }
        .rt-chart-title {
          font-size: 13px;
          font-weight: 700;
          color: #fff;
        }
        .rt-chart-legend {
          display: flex;
          gap: 8px;
          font-size: 10px;
        }
        .rt-legend-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .rt-legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .rt-dot-diseased { background: #ef4444; }
        .rt-dot-recovering { background: #fb923c; }
        .rt-dot-healthy { background: #10b981; }

        .rt-axis {
          stroke: rgba(255,255,255,0.15);
          stroke-width: 1px;
        }
        .rt-gridline {
          stroke: rgba(255,255,255,0.05);
          stroke-dasharray: 2 2;
          stroke-width: 1px;
        }
        .rt-chart-text {
          fill: rgba(255,255,255,0.4);
          font-size: 9px;
          font-family: inherit;
        }
        .rt-bar {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }
        .rt-bar:hover {
          filter: brightness(1.2);
          opacity: 0.9;
        }
        .rt-chart-tooltip {
          position: absolute;
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 11px;
          color: #cbd5e1;
          pointer-events: none;
          z-index: 100;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          white-space: nowrap;
          text-align: left;
        }
        .rt-tooltip-title {
          font-weight: bold;
          color: #fff;
          margin-bottom: 2px;
        }

        .rt-log-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05) !important;
          padding: 10px;
          border-radius: 8px;
          margin-top: 6px;
          text-align: left;
        }
        .rt-log-form-title {
          font-size: 12px;
          font-weight: 700;
          color: #fff;
        }
        .rt-form-inputs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .rt-form-inputs input, .rt-form-inputs select {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #fff;
          padding: 5px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-family: inherit;
        }
        .rt-form-inputs input[type="number"] {
          width: 60px;
        }
        .rt-form-inputs input[type="text"] {
          width: 80px;
        }
        .rt-btn-add {
          padding: 5px 12px;
          font-size: 11px;
          background: #10b981;
          color: #fff;
          border: none !important;
          cursor: pointer;
          font-weight: bold;
          border-radius: 6px;
          min-height: 28px;
        }
        .rt-btn-add:hover {
          background: #059669;
        }
      `}</style>

      <h3>📸 Before / After Recovery Tracker</h3>
      <p className="rt-desc">Log treatment start date and add daily growth measurements to track recovery. Upload an after-treatment image (≥14 days) to let AI verify recovery.</p>

      <div className="rt-row">
        <label>Treatment start date</label>
        <div>
          <input type="date" value={startDate ?? ''} onChange={e => setStartDate(e.target.value)} />
          <button onClick={handleSetToday}>Set Today</button>
        </div>
      </div>

      <div className="rt-row">
        <label>Days elapsed</label>
        <div>{daysElapsed} days</div>
      </div>

      {/* ── Growth and Recovery Bar Graph ── */}
      {startDate && growthLogs.length > 0 && (
        <div className="rt-chart-container">
          <div className="rt-chart-header">
            <span className="rt-chart-title">🌱 Recovery & Growth Chart (Height over time)</span>
            <div className="rt-chart-legend">
              <div className="rt-legend-item">
                <span className="rt-legend-dot rt-dot-diseased" />
                <span>Diseased</span>
              </div>
              <div className="rt-legend-item">
                <span className="rt-legend-dot rt-dot-recovering" />
                <span>Improving</span>
              </div>
              <div className="rt-legend-item">
                <span className="rt-legend-dot rt-dot-healthy" />
                <span>Healthy</span>
              </div>
            </div>
          </div>

          <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
            <defs>
              <linearGradient id="diseasedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#991b1b" />
              </linearGradient>
              <linearGradient id="recoveringGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#c2410c" />
              </linearGradient>
              <linearGradient id="healthyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#065f46" />
              </linearGradient>
            </defs>

            {/* Gridlines */}
            {yTicks.map((tick, i) => {
              const yVal = chartPadding.top + plotHeight - (tick / yMax) * plotHeight
              return (
                <g key={i}>
                  <line x1={chartPadding.left} y1={yVal} x2={svgWidth - chartPadding.right} y2={yVal} className="rt-gridline" />
                  <text x={chartPadding.left - 8} y={yVal + 3} textAnchor="end" className="rt-chart-text">{tick} cm</text>
                </g>
              )
            })}

            {/* X Axis Ticks */}
            {growthLogs.map((log, i) => {
              const xVal = chartPadding.left + (i * plotWidth) / growthLogs.length + plotWidth / growthLogs.length / 2
              const showLabel = growthLogs.length <= 10 || i === 0 || i === growthLogs.length - 1 || log.day % 2 !== 0
              return showLabel ? (
                <text key={i} x={xVal} y={svgHeight - chartPadding.bottom + 14} textAnchor="middle" className="rt-chart-text">
                  Day {log.day}
                </text>
              ) : null
            })}

            {/* Bars */}
            {growthLogs.map((log, i) => {
              const barWidth = Math.max(12, plotWidth / growthLogs.length - 6)
              const xVal = chartPadding.left + (i * plotWidth) / growthLogs.length + (plotWidth / growthLogs.length - barWidth) / 2
              const barHeight = (log.height / yMax) * plotHeight
              const yVal = chartPadding.top + plotHeight - barHeight
              const fill = log.status === 'diseased' ? 'url(#diseasedGrad)' : log.status === 'recovering' ? 'url(#recoveringGrad)' : 'url(#healthyGrad)'

              return (
                <rect
                  key={i}
                  x={xVal}
                  y={yVal}
                  width={barWidth}
                  height={Math.max(2, barHeight)}
                  rx="4"
                  ry="4"
                  fill={fill}
                  className="rt-bar"
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const container = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect()
                    if (rect && container) {
                      setHoveredLog(log)
                      setTooltipPos({
                        x: rect.left - container.left + barWidth / 2,
                        y: rect.top - container.top - 80
                      })
                    }
                  }}
                  onMouseLeave={() => setHoveredLog(null)}
                />
              )
            })}

            {/* Axis Lines */}
            <line x1={chartPadding.left} y1={chartPadding.top} x2={chartPadding.left} y2={svgHeight - chartPadding.bottom} className="rt-axis" />
            <line x1={chartPadding.left} y1={svgHeight - chartPadding.bottom} x2={svgWidth - chartPadding.right} y2={svgHeight - chartPadding.bottom} className="rt-axis" />
          </svg>

          {/* Floating Tooltip */}
          {hoveredLog && (
            <div className="rt-chart-tooltip" style={{ left: tooltipPos.x, top: tooltipPos.y, transform: 'translateX(-50%)' }}>
              <div className="rt-tooltip-title">Day {hoveredLog.day} ({hoveredLog.date})</div>
              <div>📏 Height: <strong>{hoveredLog.height} cm</strong></div>
              <div>💓 Status: <strong>{hoveredLog.status.toUpperCase()}</strong></div>
            </div>
          )}
        </div>
      )}

      {/* ── Growth Log Entry Form ── */}
      {startDate && (
        <form onSubmit={handleAddLog} className="rt-log-form">
          <span className="rt-log-form-title">✏️ Log Daily Height & Status</span>
          <div className="rt-form-inputs">
            <div>
              <label style={{ fontSize: '10px', color: '#94a3b8' }}>Day:</label>
              <input type="number" min="1" max="100" value={newLogDay} onChange={e => setNewLogDay(parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#94a3b8' }}>Height (cm):</label>
              <input type="text" placeholder="e.g. 18.5" value={newLogHeight} onChange={e => setNewLogHeight(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#94a3b8' }}>Status:</label>
              <select value={newLogStatus} onChange={e => setNewLogStatus(e.target.value as any)}>
                <option value="diseased">🍂 Diseased</option>
                <option value="recovering">🩹 Recovering</option>
                <option value="healthy">🌿 Healthy</option>
              </select>
            </div>
            <button type="submit" className="rt-btn-add">Log Entry</button>
          </div>
        </form>
      )}

      <div className="rt-row">
        <label>After-treatment image</label>
        <div>
          <input type="file" accept="image/*" onChange={e => handleAfterFile(e.target.files?.[0])} />
        </div>
      </div>

      <div className="rt-actions">
        <button disabled={daysElapsed < 14 || checking} onClick={uploadAndCompare} className="gs-btn gs-btn-apply">
          {checking ? 'Checking...' : (daysElapsed >= 14 ? 'Upload & Verify Recovery' : 'Wait 14 days to verify')}
        </button>
      </div>

      {message && (<div className="rt-message">{message}</div>)}
    </div>
  )
}
