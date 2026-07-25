import { useState } from 'react'

interface SoilCardScannerModalProps {
  open: boolean
  onClose: () => void
}

interface SoilData {
  ph: number
  nitrogen: number // kg/ha
  phosphorus: number // kg/ha
  potassium: number // kg/ha
  organicCarbon: number // %
  ec: number // dS/m
  healthStatus: 'Excellent' | 'Deficient' | 'Acidic' | 'Alkaline'
  recommendations: string[]
}

export default function SoilCardScannerModal({ open, onClose }: SoilCardScannerModalProps) {
  const [analyzing, setAnalyzing] = useState(false)
  const [soilReport, setSoilReport] = useState<SoilData | null>(null)
  
  // Manual input fallback state
  const [phInput, setPhInput] = useState<number>(6.8)
  const [nInput, setNInput] = useState<number>(210)
  const [pInput, setPInput] = useState<number>(18)
  const [kInput, setKInput] = useState<number>(195)
  const [ocInput, setOcInput] = useState<number>(0.55)

  if (!open) return null

  const handleSimulatedScan = () => {
    setAnalyzing(true)
    setTimeout(() => {
      setSoilReport({
        ph: 7.2,
        nitrogen: 185, // Low <280
        phosphorus: 22, // Medium 11-25
        potassium: 240, // High >210
        organicCarbon: 0.48, // Low <0.5
        ec: 0.65, // Normal <1.0
        healthStatus: 'Deficient',
        recommendations: [
          'Nitrogen is LOW (185 kg/ha). Apply +25% extra Urea split dose.',
          'Organic Carbon is LOW (0.48%). Apply 4-5 Tons/acre Farm Yard Manure (FYM) or Vermicompost.',
          'Phosphorus & Potassium levels are balanced. Maintain standard basal dosage.',
          'Soil pH 7.2 is optimal for nutrient uptake.'
        ]
      })
      setAnalyzing(false)
    }, 1500)
  }

  const handleManualAnalyze = () => {
    let status: 'Excellent' | 'Deficient' | 'Acidic' | 'Alkaline' = 'Excellent'
    const recs: string[] = []

    if (phInput < 6.0) {
      status = 'Acidic'
      recs.push('Soil is ACIDIC (pH < 6.0). Apply Agricultural Lime (Calcium Carbonate) @ 250 kg/acre.')
    } else if (phInput > 8.0) {
      status = 'Alkaline'
      recs.push('Soil is ALKALINE (pH > 8.0). Apply Gypsum @ 300 kg/acre + Elemental Sulphur.')
    }

    if (nInput < 280) {
      if (status === 'Excellent') status = 'Deficient'
      recs.push(`Nitrogen is LOW (${nInput} kg/ha). Increase Urea application by 20%.`)
    }
    if (pInput < 11) {
      if (status === 'Excellent') status = 'Deficient'
      recs.push(`Phosphorus is LOW (${pInput} kg/ha). Apply extra Single Super Phosphate (SSP).`)
    }
    if (kInput < 110) {
      if (status === 'Excellent') status = 'Deficient'
      recs.push(`Potassium is LOW (${kInput} kg/ha). Apply Muriate of Potash (MOP).`)
    }
    if (ocInput < 0.5) {
      recs.push(`Organic Carbon is LOW (${ocInput}%). Incorporate green manure or FYM.`)
    }

    if (recs.length === 0) {
      recs.push('Soil nutrients are well-balanced! Continue current organic fertilization routine.')
    }

    setSoilReport({
      ph: phInput,
      nitrogen: nInput,
      phosphorus: pInput,
      potassium: kInput,
      organicCarbon: ocInput,
      ec: 0.5,
      healthStatus: status,
      recommendations: recs
    })
  }

  return (
    <div className="sh-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="sh-detail-modal" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '520px', 
          width: 'calc(100vw - 24px)', 
          background: 'rgba(6, 18, 26, 0.95)',
          border: '1.5px solid #00e5ff',
          boxShadow: '0 0 30px rgba(0, 229, 255, 0.35)',
          borderRadius: '24px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>📄</span>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>Soil Health Card Reader</h2>
              <p style={{ fontSize: '12px', color: '#00e5ff', margin: 0 }}>OCR Report Scanner & Nutrient Analyzer</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', borderRadius: '10px', width: '32px', height: '32px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Upload Lab Card Area */}
        {!soilReport && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div 
              onClick={handleSimulatedScan}
              style={{
                border: '2px dashed rgba(0, 229, 255, 0.4)',
                borderRadius: '16px',
                padding: '28px 16px',
                textAlign: 'center',
                background: 'rgba(0, 229, 255, 0.03)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ fontSize: '42px', display: 'block', marginBottom: '8px' }}>📷</span>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: '0 0 4px 0' }}>Scan Soil Test Lab Report</h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Upload photo of Government Soil Health Card</p>
              <button 
                disabled={analyzing}
                style={{
                  marginTop: '14px',
                  background: 'linear-gradient(135deg, #00e5ff, #3b82f6)',
                  color: '#041410',
                  fontWeight: 800,
                  fontSize: '14px',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '20px',
                  cursor: 'pointer'
                }}
              >
                {analyzing ? 'Scanning OCR Data...' : 'Upload Report Photo'}
              </button>
            </div>

            <div style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', fontWeight: 700 }}>OR ENTER MANUALLY</div>

            {/* Manual NPK Form */}
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>Soil pH (4.0 - 10.0)</label>
                <input type="number" step="0.1" value={phInput} onChange={e => setPhInput(parseFloat(e.target.value) || 7)} style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '8px', color: '#fff', borderRadius: '8px', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>Nitrogen N (kg/ha)</label>
                <input type="number" value={nInput} onChange={e => setNInput(parseFloat(e.target.value) || 0)} style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '8px', color: '#fff', borderRadius: '8px', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>Phosphorus P (kg/ha)</label>
                <input type="number" value={pInput} onChange={e => setPInput(parseFloat(e.target.value) || 0)} style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '8px', color: '#fff', borderRadius: '8px', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>Potassium K (kg/ha)</label>
                <input type="number" value={kInput} onChange={e => setKInput(parseFloat(e.target.value) || 0)} style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '8px', color: '#fff', borderRadius: '8px', marginTop: '4px' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>Organic Carbon OC (%)</label>
                <input type="number" step="0.05" value={ocInput} onChange={e => setOcInput(parseFloat(e.target.value) || 0)} style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '8px', color: '#fff', borderRadius: '8px', marginTop: '4px' }} />
              </div>
            </div>

            <button 
              onClick={handleManualAnalyze}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #00ff9d, #10b981)',
                color: '#041410',
                fontSize: '15px',
                fontWeight: 800,
                padding: '14px',
                border: 'none',
                borderRadius: '14px',
                cursor: 'pointer'
              }}
            >
              Analyze Soil Health
            </button>
          </div>
        )}

        {/* Report Output */}
        {soilReport && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', textAlign: 'center' }}>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>pH LEVEL</span>
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#00e5ff' }}>{soilReport.ph}</span>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>NITROGEN</span>
                <span style={{ fontSize: '18px', fontWeight: 900, color: soilReport.nitrogen < 280 ? '#ef4444' : '#00ff9d' }}>{soilReport.nitrogen}</span>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>PHOSPHORUS</span>
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#facc15' }}>{soilReport.phosphorus}</span>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>POTASSIUM</span>
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#00ff9d' }}>{soilReport.potassium}</span>
              </div>
            </div>

            <div style={{ background: 'rgba(0, 229, 255, 0.08)', border: '1.5px solid rgba(0, 229, 255, 0.4)', borderRadius: '14px', padding: '14px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#00e5ff', margin: '0 0 8px 0' }}>🧪 Soil Amendment Plan</h3>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {soilReport.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            <button 
              onClick={() => setSoilReport(null)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                padding: '12px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              🔄 Scan Another Card
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
