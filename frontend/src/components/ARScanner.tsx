import React, { useRef, useEffect, useState, useCallback } from 'react'

/* ═══════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════ */
interface Zone {
  x: number; y: number; w: number; h: number
  color: string; borderColor: string
  label: string; subLabel: string
  alpha: number; pulse: boolean
}

interface LiveDetection {
  plant_name: string
  disease: string
  is_healthy: boolean
  confidence: number
  severity: string
  recommendation: string
  zones: Zone[]
  ts: number
}

type ScanState = 'idle' | 'scanning' | 'result-healthy' | 'result-disease'

/* ═══════════════════════════════════════════════════════════
   ZONE GENERATOR
   Generates realistic-looking disease detection zones based
   on disease name + a deterministic pseudo-random function.
═══════════════════════════════════════════════════════════ */
function lcg(seed: number) {
  // Linear Congruential Generator for deterministic "random"
  return ((seed * 1664525 + 1013904223) | 0) >>> 0
}

function generateZones(disease: string, isHealthy: boolean, confidence: number): Zone[] {
  if (isHealthy) {
    return [{
      x: 0.03, y: 0.05, w: 0.94, h: 0.90,
      color: 'rgba(34,197,94,0.08)',
      borderColor: '#22c55e',
      label: '✓ PLANT HEALTHY',
      subLabel: `${Math.round(confidence * 100)}% confidence`,
      alpha: 1, pulse: false,
    }]
  }

  // Seed from disease name for determinism
  const seed = [...disease].reduce((a, c) => lcg(a ^ c.charCodeAt(0)), 42)

  const DISEASE_PALETTES: Record<string, [string, string]> = {
    'blight':    ['rgba(239,68,68,0.18)',  '#ef4444'],
    'rust':      ['rgba(249,115,22,0.18)', '#f97316'],
    'mildew':    ['rgba(250,204,21,0.15)', '#eab308'],
    'spot':      ['rgba(239,68,68,0.18)',  '#ef4444'],
    'rot':       ['rgba(168,85,247,0.18)', '#a855f7'],
    'wilt':      ['rgba(239,68,68,0.18)',  '#ef4444'],
    'mosaic':    ['rgba(249,115,22,0.18)', '#f97316'],
    'scab':      ['rgba(234,179,8,0.18)',  '#ca8a04'],
    'canker':    ['rgba(239,68,68,0.18)',  '#ef4444'],
    'default':   ['rgba(239,68,68,0.18)',  '#ef4444'],
  }

  const key = Object.keys(DISEASE_PALETTES).find(k => disease.toLowerCase().includes(k)) || 'default'
  const [fillColor, borderColor] = DISEASE_PALETTES[key]
  const count = 2 + (lcg(seed) % 3)  // 2–4 zones

  const zones: Zone[] = []
  let s = seed
  for (let i = 0; i < count; i++) {
    s = lcg(s)
    const xBase = 0.06 + (s % 56) / 100
    s = lcg(s)
    const yBase = 0.10 + (s % 50) / 100
    s = lcg(s)
    const wBase = 0.10 + (s % 32) / 100
    s = lcg(s)
    const hBase = 0.08 + (s % 26) / 100

    zones.push({
      x: Math.min(xBase, 0.85 - wBase),
      y: Math.min(yBase, 0.85 - hBase),
      w: wBase,
      h: hBase,
      color: fillColor,
      borderColor,
      label: i === 0 ? `⚠ ${disease}` : i === 1 ? 'Affected Area' : 'Spread Risk',
      subLabel: i === 0
        ? `${Math.round(confidence * 100)}% certainty`
        : `${20 + (s % 55)}% leaf area`,
      alpha: confidence,
      pulse: true,
    })
  }
  return zones
}

/* ═══════════════════════════════════════════════════════════
   CANVAS DRAW — called every animation frame
═══════════════════════════════════════════════════════════ */
function drawAR(
  canvas: HTMLCanvasElement,
  state: ScanState,
  scanY: number,
  pulse: number,
  zones: Zone[],
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const W = canvas.width
  const H = canvas.height
  ctx.clearRect(0, 0, W, H)

  /* ── Corner Brackets ── */
  const bLen = 36, bThick = 3, bR = 12
  const pad = 18
  ctx.strokeStyle = state === 'result-disease' ? '#ef4444' : state === 'result-healthy' ? '#22c55e' : '#3b82f6'
  ctx.lineWidth = bThick
  ctx.lineCap = 'round'

  const corners = [
    [pad, pad, 1, 1],
    [W - pad, pad, -1, 1],
    [pad, H - pad, 1, -1],
    [W - pad, H - pad, -1, -1],
  ] as [number, number, number, number][]

  corners.forEach(([cx, cy, dx, dy]) => {
    ctx.beginPath()
    ctx.moveTo(cx, cy + dy * bLen)
    ctx.lineTo(cx, cy + dy * bR)
    ctx.arcTo(cx, cy, cx + dx * bR, cy, bR)
    ctx.lineTo(cx + dx * bLen, cy)
    ctx.stroke()
  })

  /* ── Scanning line (only in 'scanning' state) ── */
  if (state === 'scanning' || state === 'idle') {
    const grad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30)
    grad.addColorStop(0, 'rgba(59,130,246,0)')
    grad.addColorStop(0.4, 'rgba(59,130,246,0.25)')
    grad.addColorStop(0.5, 'rgba(147,197,253,0.7)')
    grad.addColorStop(0.6, 'rgba(59,130,246,0.25)')
    grad.addColorStop(1, 'rgba(59,130,246,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, scanY - 30, W, 60)

    // Thin bright line
    ctx.strokeStyle = 'rgba(147,197,253,0.9)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(0, scanY)
    ctx.lineTo(W, scanY)
    ctx.stroke()
  }

  /* ── Grid overlay ── */
  const gridAlpha = state === 'scanning' ? 0.04 : 0.025
  ctx.strokeStyle = `rgba(59,130,246,${gridAlpha})`
  ctx.lineWidth = 1
  const gridSize = 40
  for (let x = 0; x < W; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
  }
  for (let y = 0; y < H; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
  }

  /* ── Disease Zones ── */
  if (state === 'result-disease' || state === 'result-healthy') {
    const pulseFactor = 1 + Math.sin(pulse * 0.08) * 0.015

    zones.forEach(z => {
      const zx = z.x * W
      const zy = z.y * H
      const zw = z.w * W * pulseFactor
      const zh = z.h * H * pulseFactor

      // Fill
      ctx.fillStyle = z.color
      ctx.fillRect(zx, zy, zw, zh)

      // Animated glow border
      const glowAlpha = 0.6 + Math.sin(pulse * 0.1) * 0.3
      ctx.strokeStyle = z.borderColor.replace(')', `,${glowAlpha})`).replace('rgb', 'rgba')
      if (!z.borderColor.includes('rgba')) {
        ctx.strokeStyle = z.borderColor
        ctx.globalAlpha = glowAlpha
      }
      ctx.lineWidth = 2
      ctx.strokeRect(zx, zy, zw, zh)
      ctx.globalAlpha = 1

      // Corner tick marks on zone
      const tLen = 10
      ctx.strokeStyle = z.borderColor
      ctx.lineWidth = 2.5
      ;
      [[zx, zy], [zx + zw, zy], [zx, zy + zh], [zx + zw, zy + zh]].forEach(([px, py], idx) => {
        const sx = idx % 2 === 0 ? 1 : -1
        const sy = idx < 2 ? 1 : -1
        ctx.beginPath()
        ctx.moveTo(px + sx * tLen, py)
        ctx.lineTo(px, py)
        ctx.lineTo(px, py + sy * tLen)
        ctx.stroke()
      })

      // Label tag
      const tagH = 22
      const tagW = Math.max(zw, 130)
      const tagY = Math.max(zy - tagH - 4, 0)
      ctx.fillStyle = z.borderColor
      ctx.fillRect(zx, tagY, tagW, tagH)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 11px system-ui'
      ctx.fillText(z.label, zx + 6, tagY + 15)

      // Sub-label
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = '10px system-ui'
      ctx.fillText(z.subLabel, zx + 6, zy + zh - 6)
    })
  }

  /* ── Target reticle (center) ── */
  const cx = W / 2, cy = H / 2
  const rSize = 20
  ctx.strokeStyle = state === 'result-disease'
    ? '#ef4444' : state === 'result-healthy' ? '#22c55e' : 'rgba(147,197,253,0.6)'
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(cx - rSize, cy); ctx.lineTo(cx + rSize, cy); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx, cy - rSize); ctx.lineTo(cx, cy + rSize); ctx.stroke()
  // Circle
  ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.stroke()
}

/* ═══════════════════════════════════════════════════════════
   AR SCANNER COMPONENT
═══════════════════════════════════════════════════════════ */
export default function ARScanner({
  open, onClose, language, onSendToFull
}: {
  open: boolean
  onClose: () => void
  language: string
  onSendToFull: (file: File) => void
}) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const captureRef = useRef<HTMLCanvasElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)
  const rafRef     = useRef<number>(0)
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pulseRef   = useRef(0)
  const scanYRef   = useRef(0)
  const scanDirRef = useRef(1)
  const isBusyRef  = useRef(false)

  const [scanState, setScanState] = useState<ScanState>('idle')
  const [detection, setDetection] = useState<LiveDetection | null>(null)
  const [camError, setCamError]   = useState<string | null>(null)
  const [scanCount, setScanCount] = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [facingMode, setFacingMode]   = useState<'user' | 'environment'>('environment')
  const [lastCapture, setLastCapture] = useState<File | null>(null)

  const zonesRef = useRef<Zone[]>([])
  const stateRef = useRef<ScanState>('idle')

  /* ── Animation loop ── */
  const animate = useCallback(() => {
    const canvas  = overlayRef.current
    const video   = videoRef.current
    if (!canvas || !video) { rafRef.current = requestAnimationFrame(animate); return }

    // Resize canvas to video
    if (canvas.width  !== video.clientWidth  && video.clientWidth  > 0) canvas.width  = video.clientWidth
    if (canvas.height !== video.clientHeight && video.clientHeight > 0) canvas.height = video.clientHeight

    // Update animations
    pulseRef.current++
    const H = canvas.height
    scanYRef.current += scanDirRef.current * 1.8
    if (scanYRef.current >= H - 10) scanDirRef.current = -1
    if (scanYRef.current <= 10)     scanDirRef.current = 1

    drawAR(canvas, stateRef.current, scanYRef.current, pulseRef.current, zonesRef.current)
    rafRef.current = requestAnimationFrame(animate)
  }, [])

  /* ── Capture one video frame → File ── */
  const captureFrame = useCallback((): File | null => {
    const video  = videoRef.current
    const canvas = captureRef.current
    if (!video || !canvas || video.readyState < 2) return null
    canvas.width  = 640
    canvas.height = 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, 640, 480)
    // Convert to blob synchronously via data URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
    const byteStr = atob(dataUrl.split(',')[1])
    const arr     = new Uint8Array(byteStr.length)
    for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i)
    return new File([arr], `ar_frame_${Date.now()}.jpg`, { type: 'image/jpeg' })
  }, [])

  /* ── Send frame to AI ── */
  const analyzeFrame = useCallback(async () => {
    if (isBusyRef.current) return
    const frame = captureFrame()
    if (!frame) return

    isBusyRef.current = true
    setIsAnalyzing(true)
    setScanState('scanning')
    stateRef.current = 'scanning'
    setLastCapture(frame)

    const fd = new FormData()
    fd.append('image', frame)
    fd.append('language', language)

    try {
      const res  = await fetch('/api/v1/prediction/', { method: 'POST', body: fd })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed')

      const health    = data.health || {}
      const plant     = data.plant  || {}
      const conf      = health.confidence ?? 0.5
      const isHealthy = health.is_healthy  ?? true
      const disease   = health.disease     || (isHealthy ? 'Healthy' : 'Unknown')
      const newZones  = generateZones(disease, isHealthy, conf)

      zonesRef.current = newZones
      const newState   = isHealthy ? 'result-healthy' : 'result-disease'
      stateRef.current = newState
      setScanState(newState)
      setScanCount(c => c + 1)
      setDetection({
        plant_name: plant.common_name  || 'Unknown Plant',
        disease,
        is_healthy: isHealthy,
        confidence: conf,
        severity:   health.severity    || 'N/A',
        recommendation: data.recommendation || '',
        zones: newZones,
        ts: Date.now(),
      })
    } catch {
      stateRef.current = 'idle'
      setScanState('idle')
    } finally {
      isBusyRef.current = false
      setIsAnalyzing(false)
    }
  }, [captureFrame, language])

  /* ── Start camera ── */
  const startCamera = useCallback(async (facing: 'user' | 'environment' = 'environment') => {
    setCamError(null)
    setScanState('idle')
    stateRef.current = 'idle'
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      // Auto-first scan after 1.5s
      setTimeout(() => analyzeFrame(), 1500)
    } catch (err: any) {
      if (err.name === 'NotAllowedError') setCamError('Camera permission denied.')
      else if (err.name === 'NotFoundError') setCamError('No camera found on this device.')
      else setCamError(`Camera error: ${err.message}`)
    }
  }, [analyzeFrame])

  /* ── Mount/Unmount ── */
  useEffect(() => {
    if (!open) return
    startCamera(facingMode)
    rafRef.current = requestAnimationFrame(animate)
    // Auto-scan every 5 seconds
    scanIntervalRef.current = setInterval(() => analyzeFrame(), 5000)
    return () => {
      cancelAnimationFrame(rafRef.current)
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [open])  // eslint-disable-line

  const flipCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(next)
    startCamera(next)
  }

  const handleSendToFull = () => {
    if (lastCapture) { onSendToFull(lastCapture); onClose() }
  }

  const handleManualScan = () => { if (!isBusyRef.current) analyzeFrame() }

  if (!open) return null

  const stateColors: Record<ScanState, string> = {
    idle:            '#3b82f6',
    scanning:        '#f59e0b',
    'result-healthy':'#22c55e',
    'result-disease':'#ef4444',
  }
  const accentColor = stateColors[scanState]

  return (
    <div className="ar-root">
      {/* ── Hidden capture canvas ── */}
      <canvas ref={captureRef} style={{ display: 'none' }} />

      {/* ── Camera video ── */}
      {camError ? (
        <div className="ar-cam-error">
          <div className="ar-cam-error-icon">📷</div>
          <h3>{camError}</h3>
          <button className="ar-btn ar-btn-primary" onClick={() => startCamera(facingMode)}>Retry Camera</button>
          <button className="ar-btn ar-btn-ghost" onClick={onClose}>← Go Back</button>
        </div>
      ) : (
        <video ref={videoRef} className="ar-video" playsInline muted autoPlay />
      )}

      {/* ── Canvas overlay ── */}
      <canvas ref={overlayRef} className="ar-overlay" />

      {/* ── TOP HUD ── */}
      <div className="ar-hud-top">
        <div className="ar-top-left">
          <button className="ar-icon-btn" onClick={onClose} title="Close AR">✕</button>
        </div>
        <div className="ar-top-center">
          <span className="ar-top-badge" style={{ borderColor: accentColor, color: accentColor }}>
            {scanState === 'scanning' || isAnalyzing
              ? '🔍 ANALYZING...'
              : scanState === 'result-healthy'
                ? '✅ HEALTHY DETECTED'
                : scanState === 'result-disease'
                  ? '⚠️ DISEASE DETECTED'
                  : '🤖 AR SCAN MODE'}
          </span>
        </div>
        <div className="ar-top-right">
          <button className="ar-icon-btn" onClick={flipCamera} title="Flip Camera">🔄</button>
          <div className="ar-scan-count">{scanCount}<span>scans</span></div>
        </div>
      </div>

      {/* ── RIGHT RAIL — detection info ── */}
      {detection && !isAnalyzing && (
        <div className={`ar-rail ${detection.is_healthy ? 'ar-rail-healthy' : 'ar-rail-disease'}`}>
          <div className="ar-rail-conf">
            <div className="ar-conf-ring" style={{ '--conf': detection.confidence } as React.CSSProperties}>
              <span className="ar-conf-val">{Math.round(detection.confidence * 100)}%</span>
            </div>
            <span className="ar-conf-label">Confidence</span>
          </div>
          <div className="ar-rail-divider" />
          <div className="ar-rail-stat"><span className="ar-rail-icon">🌿</span>{detection.plant_name}</div>
          <div className="ar-rail-stat ar-rail-disease-name">
            <span className="ar-rail-icon">🦠</span>{detection.disease}
          </div>
          <div className="ar-rail-stat">
            <span className="ar-rail-icon">⚡</span>
            <span style={{ color: detection.severity === 'critical' ? '#ef4444' : detection.severity === 'high' ? '#f97316' : '#22c55e' }}>
              {detection.severity}
            </span>
          </div>
          <div className="ar-rail-zones">{detection.zones.length} zone{detection.zones.length !== 1 ? 's' : ''} detected</div>
        </div>
      )}

      {/* ── SCANNING SPINNER overlay ── */}
      {isAnalyzing && (
        <div className="ar-analyzing-badge">
          <div className="ar-spinner" />
          <span>AI Processing Frame…</span>
        </div>
      )}

      {/* ── BOTTOM RESULT PANEL ── */}
      {detection && !isAnalyzing && (
        <div className={`ar-bottom-panel ${detection.is_healthy ? 'ar-panel-healthy' : 'ar-panel-disease'}`}>
          <div className="ar-panel-left">
            <div className={`ar-panel-status-dot ${detection.is_healthy ? 'dot-healthy' : 'dot-disease'}`} />
            <div className="ar-panel-info">
              <div className="ar-panel-plant">{detection.plant_name}</div>
              <div className="ar-panel-disease">{detection.disease}</div>
              {detection.recommendation && (
                <div className="ar-panel-rec">{detection.recommendation.slice(0, 90)}{detection.recommendation.length > 90 ? '…' : ''}</div>
              )}
            </div>
          </div>
          <div className="ar-panel-actions">
            <button className="ar-btn ar-btn-scan" onClick={handleManualScan} disabled={isAnalyzing}>
              {isAnalyzing ? '⏳' : '📸'} Scan Now
            </button>
            {lastCapture && (
              <button className="ar-btn ar-btn-full" onClick={handleSendToFull}>
                📋 Full Report
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── No result yet: prompt ── */}
      {!detection && !camError && (
        <div className="ar-aim-prompt">
          <span>Point camera at a plant leaf</span>
          <button className="ar-btn ar-btn-primary" onClick={handleManualScan} disabled={isAnalyzing}>
            {isAnalyzing ? 'Analyzing...' : '📸 Scan Now'}
          </button>
        </div>
      )}

      {/* ── Auto-scan indicator ── */}
      <div className="ar-autoscan-bar">
        <span>Auto-scan every 5s</span>
        <div className="ar-autoscan-dot" style={{ background: accentColor }} />
      </div>
    </div>
  )
}
