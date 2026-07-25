import { useState } from 'react'

interface OutbreakRadarModalProps {
  open: boolean
  onClose: () => void
}

interface OutbreakAlert {
  id: string
  diseaseName: string
  crop: string
  distanceKm: number
  urgency: 'CRITICAL' | 'WARNING' | 'CAUTION'
  location: string
  reportedDate: string
  preventiveAction: string
}

const SAMPLE_ALERTS: OutbreakAlert[] = [
  {
    id: '1',
    diseaseName: 'Fall Armyworm (Spodoptera frugiperda)',
    crop: 'Maize / Corn',
    distanceKm: 8.5,
    urgency: 'CRITICAL',
    location: 'Hadapsar Sector 4',
    reportedDate: '2 hours ago',
    preventiveAction: 'Spray Emamectin Benzoate 5% SG @ 80g/acre immediately before larvae enter whorls.'
  },
  {
    id: '2',
    diseaseName: 'Late Blight (Phytophthora infestans)',
    crop: 'Tomato & Potato',
    distanceKm: 14.2,
    urgency: 'WARNING',
    location: 'Khed Block B',
    reportedDate: '5 hours ago',
    preventiveAction: 'Apply preventive foliage spray of Mancozeb 75% WP @ 600g/acre due to high humidity.'
  },
  {
    id: '3',
    diseaseName: 'Pink Bollworm',
    crop: 'Cotton',
    distanceKm: 22.0,
    urgency: 'CAUTION',
    location: 'Shirur APMC Belt',
    reportedDate: 'Yesterday',
    preventiveAction: 'Install Pheromone traps @ 5 traps/acre for adult moth monitoring.'
  }
]

export default function OutbreakRadarModal({ open, onClose }: OutbreakRadarModalProps) {
  const [alerts] = useState<OutbreakAlert[]>(SAMPLE_ALERTS)
  const [radiusKm, setRadiusKm] = useState<number>(25)

  if (!open) return null

  const filtered = alerts.filter(a => a.distanceKm <= radiusKm)

  return (
    <div className="sh-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="sh-detail-modal" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '520px', 
          width: 'calc(100vw - 24px)', 
          background: 'rgba(20, 8, 8, 0.95)',
          border: '1.5px solid #ef4444',
          boxShadow: '0 0 30px rgba(239, 68, 68, 0.35)',
          borderRadius: '24px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>🚨</span>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>Disease Outbreak Radar</h2>
              <p style={{ fontSize: '12px', color: '#ef4444', margin: 0 }}>Local Farm Contagion Warning System</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', borderRadius: '10px', width: '32px', height: '32px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Radius Filter Slider */}
        <div style={{ background: 'rgba(255,255,255,0.04)', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px' }}>
            <span>📡 Alert Radius: <strong style={{ color: '#fff' }}>{radiusKm} km</strong></span>
            <span style={{ color: '#ef4444' }}>{filtered.length} Outbreaks Nearby</span>
          </div>
          <input
            type="range"
            min="5"
            max="50"
            step="5"
            value={radiusKm}
            onChange={e => setRadiusKm(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: '#ef4444' }}
          />
        </div>

        {/* Outbreak Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(alert => (
            <div 
              key={alert.id}
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '14px',
                padding: '14px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 900,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: alert.urgency === 'CRITICAL' ? '#ef4444' : alert.urgency === 'WARNING' ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                  color: '#fff'
                }}>
                  {alert.urgency} ({alert.distanceKm} km away)
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{alert.reportedDate}</span>
              </div>

              <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#fff', margin: '4px 0' }}>{alert.diseaseName}</h4>
              <p style={{ fontSize: '12px', color: '#fdba74', margin: '0 0 8px 0', fontWeight: 600 }}>Crops at Risk: {alert.crop} ({alert.location})</p>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '10px', fontSize: '11px', color: '#86efac', borderLeft: '3px solid #10b981' }}>
                <strong>🛡️ Recommended Action:</strong> {alert.preventiveAction}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
