/**
 * historyService.ts
 * Scan history stored in localStorage — auto-expires after 14 days.
 */

import type { AgroAIResponse } from './types'

/* ── Constants ─────────────────────────────────────────── */
const STORAGE_KEY    = 'agroai_scan_history'
const MAX_AGE_DAYS   = 14
const MAX_RECORDS    = 200          // hard cap to protect storage
const THUMB_SIZE     = 96           // px — square thumbnail

/* ── Types ─────────────────────────────────────────────── */
export interface ScanRecord {
  id:             string
  timestamp:      number            // ms since epoch
  plant_name:     string
  scientific:     string
  disease:        string
  is_healthy:     boolean
  confidence:     number            // 0–1
  severity:       string
  language:       string
  thumbnail:      string            // base64 JPEG data-url
  recommendation: string
  result:         AgroAIResponse
}

/* ── Thumbnail helper ──────────────────────────────────── */
export async function buildThumbnail(imageFile: File): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(imageFile)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const size = THUMB_SIZE
      canvas.width = size; canvas.height = size
      const ctx = canvas.getContext('2d')!
      // Center-crop
      const aspect = img.width / img.height
      let sw = img.width, sh = img.height, sx = 0, sy = 0
      if (aspect > 1) { sw = img.height; sx = (img.width - sw) / 2 }
      else { sh = img.width; sy = (img.height - sh) / 2 }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.75))
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve('') }
    img.src = url
  })
}

/* ── Storage helpers ───────────────────────────────────── */
function load(): ScanRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function save(records: ScanRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch (e) {
    // localStorage full — trim oldest 20 and retry
    const trimmed = records.slice(20)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed)) } catch {}
  }
}

/* ── Expiry ────────────────────────────────────────────── */
function purgeExpired(records: ScanRecord[]): ScanRecord[] {
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  return records.filter(r => r.timestamp >= cutoff)
}

/* ── Public API ────────────────────────────────────────── */
export function addScanRecord(
  result:    AgroAIResponse,
  _imageFile: File | null,
  language:  string,
  thumbnail: string
): ScanRecord {
  const record: ScanRecord = {
    id:             `scan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp:      Date.now(),
    plant_name:     result.plant?.common_name   || 'Unknown Plant',
    scientific:     result.plant?.scientific_name || '',
    disease:        result.health?.disease       || (result.health?.is_healthy ? 'Healthy' : 'Unknown'),
    is_healthy:     result.health?.is_healthy    ?? true,
    confidence:     result.health?.confidence    ?? 0,
    severity:       result.health?.severity      || 'N/A',
    language,
    thumbnail,
    recommendation: result.recommendation || '',
    result,
  }

  let records = purgeExpired(load())
  records = [record, ...records].slice(0, MAX_RECORDS)
  save(records)
  return record
}

export function getScanHistory(): ScanRecord[] {
  return purgeExpired(load())
}

export function deleteScanRecord(id: string) {
  save(load().filter(r => r.id !== id))
}

export function clearAllHistory() {
  localStorage.removeItem(STORAGE_KEY)
}

/* ── Analytics helpers ─────────────────────────────────── */
export interface HistoryStats {
  total:         number
  healthy:       number
  diseased:      number
  healthPct:     number
  avgConfidence: number
  topDisease:    string
  streak:        number   // consecutive healthy days
  last14days:    DayBucket[]
}

export interface DayBucket {
  date:        string   // "YYYY-MM-DD"
  label:       string   // "Mon", "Tue", etc.
  scans:       number
  healthScore: number   // avg confidence of healthy scans, 0 if all diseased
  hasDisease:  boolean
}

export function computeStats(records: ScanRecord[]): HistoryStats {
  const total     = records.length
  const healthy   = records.filter(r => r.is_healthy).length
  const diseased  = total - healthy
  const healthPct = total ? Math.round((healthy / total) * 100) : 0
  const avgConf   = total
    ? Math.round(records.reduce((s, r) => s + r.confidence, 0) / total * 100)
    : 0

  // Top disease
  const diseaseCounts: Record<string, number> = {}
  records.filter(r => !r.is_healthy).forEach(r => {
    diseaseCounts[r.disease] = (diseaseCounts[r.disease] || 0) + 1
  })
  const topDisease = Object.entries(diseaseCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None'

  // Healthy streak (consecutive days with only healthy scans)
  let streak = 0
  const byDay = groupByDay(records)
  for (const day of byDay) {
    if (!day.hasDisease && day.scans > 0) streak++
    else break
  }

  // Last 14 days buckets
  const last14days = buildLast14Days(records)

  return { total, healthy, diseased, healthPct, avgConfidence: avgConf, topDisease, streak, last14days }
}

function groupByDay(records: ScanRecord[]): DayBucket[] {
  const map: Record<string, ScanRecord[]> = {}
  records.forEach(r => {
    const key = new Date(r.timestamp).toISOString().slice(0, 10)
    if (!map[key]) map[key] = []
    map[key].push(r)
  })
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0])).map(([date, recs]) => ({
    date,
    label: new Date(date).toLocaleDateString('en-IN', { weekday: 'short' }),
    scans: recs.length,
    healthScore: recs.length
      ? Math.round(recs.reduce((s, r) => s + r.confidence * 100, 0) / recs.length)
      : 0,
    hasDisease: recs.some(r => !r.is_healthy),
  }))
}

function buildLast14Days(records: ScanRecord[]): DayBucket[] {
  const buckets: DayBucket[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - (13 - i))
    const key = d.toISOString().slice(0, 10)
    const recs = records.filter(r => new Date(r.timestamp).toISOString().slice(0, 10) === key)
    buckets.push({
      date: key,
      label: i === 13 ? 'Today' : i === 12 ? 'Yday' : d.toLocaleDateString('en-IN', { weekday: 'short' }),
      scans: recs.length,
      healthScore: recs.length
        ? Math.round(recs.reduce((s, r) => s + r.confidence * 100, 0) / recs.length)
        : 0,
      hasDisease: recs.some(r => !r.is_healthy),
    })
  }
  return buckets
}

/* ── Date label helper for timeline groups ─────────────── */
export function getDateLabel(timestamp: number): string {
  const d    = new Date(timestamp)
  const now  = new Date()
  const diff = Math.floor((now.setHours(0,0,0,0) - new Date(d).setHours(0,0,0,0)) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7)  return d.toLocaleDateString('en-IN', { weekday: 'long' })
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
