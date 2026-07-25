import { useState } from 'react'

interface NDVIMapModalProps {
  open: boolean
  onClose: () => void
}

export default function NDVIMapModal({ open, onClose }: NDVIMapModalProps) {
  const [selectedWeek, setSelectedWeek] = useState<string>('Week 4 (Current)')
  
  if (!open) return null

  return (
    <div className="sh-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="sh-detail-modal" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '520px', 
          width: 'calc(100vw - 24px)', 
          background: 'rgba(5, 20, 24, 0.95)',
          border: '1.5px solid #00f2ff',
          boxShadow: '0 0 30px rgba(0, 242, 255, 0.35)',
          borderRadius: '24px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>🛰️</span>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>Satellite NDVI Canopy Monitor</h2>
              <p style={{ fontSize: '12px', color: '#00f2ff', margin: 0 }}>Sentinel-2 Vegetation Index Analysis</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', borderRadius: '10px', width: '32px', height: '32px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Timeline Selector */}
        <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '14px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
            📅 Satellite Pass Date
          </label>
          <select 
            value={selectedWeek}
            onChange={e => setSelectedWeek(e.target.value)}
            style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,242,255,0.4)', borderRadius: '10px', padding: '10px', color: '#fff', fontSize: '13px', fontWeight: 700 }}
          >
            <option value="Week 4 (Current)">Jul 24 - Passes 4 (NDVI Avg: 0.76 - Healthy)</option>
            <option value="Week 3">Jul 10 - Passes 3 (NDVI Avg: 0.72 - Stable)</option>
            <option value="Week 2">Jun 26 - Passes 2 (NDVI Avg: 0.64 - Initial)</option>
          </select>
        </div>

        {/* Simulated Satellite Canopy Card */}
        <div style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden', marginBottom: '14px' }}>
          <div style={{ height: '180px', background: 'radial-gradient(circle at 40% 40%, rgba(34, 197, 94, 0.7) 0%, rgba(234, 179, 8, 0.5) 60%, rgba(239, 68, 68, 0.6) 100%)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', position: 'relative' }}>
            <span style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', color: '#00f2ff', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 800, border: '1px solid rgba(0,242,255,0.4)' }}>
              🟢 Field Coordinates: 18.5204° N, 73.8567° E
            </span>
          </div>

          <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textIndent: 0, textAlign: 'center' }}>
            <div style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px', padding: '8px' }}>
              <span style={{ fontSize: '10px', color: '#86efac', display: 'block', fontWeight: 700 }}>HEALTHY (0.7-1.0)</span>
              <span style={{ fontSize: '18px', fontWeight: 900, color: '#fff' }}>74%</span>
            </div>
            <div style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '10px', padding: '8px' }}>
              <span style={{ fontSize: '10px', color: '#fde047', display: 'block', fontWeight: 700 }}>MODERATE (0.4-0.6)</span>
              <span style={{ fontSize: '18px', fontWeight: 900, color: '#fff' }}>18%</span>
            </div>
            <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '8px' }}>
              <span style={{ fontSize: '10px', color: '#fca5a5', display: 'block', fontWeight: 700 }}>STRESSED (&lt;0.4)</span>
              <span style={{ fontSize: '18px', fontWeight: 900, color: '#fff' }}>8%</span>
            </div>
          </div>
        </div>

        {/* Action Advice */}
        <div style={{ background: 'rgba(0, 242, 255, 0.08)', border: '1.5px solid rgba(0, 242, 255, 0.4)', borderRadius: '14px', padding: '14px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#00f2ff', margin: '0 0 6px 0' }}>💡 Satellite Insights & Action Items</h3>
          <p style={{ fontSize: '12px', color: '#e2e8f0', margin: 0, lineHeight: 1.5 }}>
            South-east sector of your plot shows mild vegetative decline (-6% moisture stress). Suggest running targeted drip irrigation for 25 minutes in Zone 2.
          </p>
        </div>
      </div>
    </div>
  )
}
