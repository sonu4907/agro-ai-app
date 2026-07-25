import { useState } from 'react'

interface IrrigationSchedulerModalProps {
  open: boolean
  onClose: () => void
}

interface ScheduleDay {
  day: string
  date: string
  action: 'IRRIGATE' | 'SKIP' | 'RAIN_EXPECTED'
  durationMins: number
  moisturePercent: number
  recommendation: string
}

const SCHEDULE: ScheduleDay[] = [
  { day: 'Today', date: 'Jul 24', action: 'IRRIGATE', durationMins: 45, moisturePercent: 38, recommendation: 'Soil moisture is 38% (<45% threshold). Run drip cycle at 06:00 AM.' },
  { day: 'Tomorrow', date: 'Jul 25', action: 'SKIP', durationMins: 0, moisturePercent: 65, recommendation: 'Adequate moisture level after today watering.' },
  { day: 'Saturday', date: 'Jul 26', action: 'RAIN_EXPECTED', durationMins: 0, moisturePercent: 78, recommendation: '85% Rain probability (12mm expected). Auto-skip irrigation pump.' },
  { day: 'Sunday', date: 'Jul 27', action: 'SKIP', durationMins: 0, moisturePercent: 72, recommendation: 'Post-rain natural soil saturation.' },
  { day: 'Monday', date: 'Jul 28', action: 'IRRIGATE', durationMins: 30, moisturePercent: 42, recommendation: 'Light 30-min maintenance drip cycle.' }
]

export default function IrrigationSchedulerModal({ open, onClose }: IrrigationSchedulerModalProps) {
  const [schedule] = useState<ScheduleDay[]>(SCHEDULE)

  if (!open) return null

  return (
    <div className="sh-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="sh-detail-modal" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '520px', 
          width: 'calc(100vw - 24px)', 
          background: 'rgba(5, 22, 28, 0.95)',
          border: '1.5px solid #06b6d4',
          boxShadow: '0 0 30px rgba(6, 182, 212, 0.35)',
          borderRadius: '24px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>💧</span>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>Smart AI Irrigation Scheduler</h2>
              <p style={{ fontSize: '12px', color: '#06b6d4', margin: 0 }}>Sensor + Weather Forecast Water Optimization</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', borderRadius: '10px', width: '32px', height: '32px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Water Savings Badge */}
        <div style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '14px', padding: '12px 16px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>ESTIMATED WATER SAVED THIS WEEK</span>
            <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#06b6d4', margin: 0 }}>~3,200 Liters (35%)</h3>
          </div>
          <span style={{ fontSize: '32px' }}>🌱</span>
        </div>

        {/* 5-Day Schedule List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {schedule.map((item, idx) => (
            <div 
              key={idx} 
              style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.08)', 
                borderRadius: '14px', 
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, color: '#fff', fontSize: '13px' }}>{item.day} ({item.date})</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  padding: '3px 10px',
                  borderRadius: '12px',
                  background: item.action === 'IRRIGATE' ? '#10b981' : item.action === 'RAIN_EXPECTED' ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                  color: item.action === 'IRRIGATE' ? '#041410' : '#fff'
                }}>
                  {item.action === 'IRRIGATE' ? `💧 RUN PUMP ${item.durationMins} MINS` : item.action === 'RAIN_EXPECTED' ? '🌧️ RAIN EXPECTED' : '⏸️ SKIP'}
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>{item.recommendation}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
