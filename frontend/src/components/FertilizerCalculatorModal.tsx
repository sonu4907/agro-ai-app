import { useState } from 'react'

interface FertilizerCalculatorModalProps {
  open: boolean
  onClose: () => void
}

type LandUnit = 'acres' | 'bigha' | 'hectares' | 'guntha'

interface StageFertilizer {
  urea: number
  dap: number
  mop: number
  zinc?: number
  micronutrient?: string
}

interface CropNutrientData {
  name: string
  icon: string
  npkRatio: { N: number; P: number; K: number }
  stages: {
    basal: StageFertilizer
    vegetative: StageFertilizer
    flowering: StageFertilizer
    fruiting: StageFertilizer
  }
}

const CROP_DATA: Record<string, CropNutrientData> = {
  tomato: {
    name: 'Tomato (टमाटर)',
    icon: '🍅',
    npkRatio: { N: 60, P: 30, K: 50 },
    stages: {
      basal: { urea: 25, dap: 65, mop: 40, zinc: 10 },
      vegetative: { urea: 40, dap: 0, mop: 20 },
      flowering: { urea: 35, dap: 0, mop: 25, micronutrient: 'Boron 20% @ 250g/acre' },
      fruiting: { urea: 30, dap: 0, mop: 35 }
    }
  },
  wheat: {
    name: 'Wheat (गेहूं)',
    icon: '🌾',
    npkRatio: { N: 50, P: 25, K: 20 },
    stages: {
      basal: { urea: 30, dap: 55, mop: 30, zinc: 8 },
      vegetative: { urea: 45, dap: 0, mop: 0 },
      flowering: { urea: 30, dap: 0, mop: 10 },
      fruiting: { urea: 0, dap: 0, mop: 0 }
    }
  },
  rice: {
    name: 'Paddy / Rice (धान)',
    icon: '🍚',
    npkRatio: { N: 48, P: 24, K: 24 },
    stages: {
      basal: { urea: 25, dap: 50, mop: 40, zinc: 10 },
      vegetative: { urea: 40, dap: 0, mop: 0 },
      flowering: { urea: 30, dap: 0, mop: 20 },
      fruiting: { urea: 0, dap: 0, mop: 0 }
    }
  },
  cotton: {
    name: 'Cotton (कपास)',
    icon: '☁️',
    npkRatio: { N: 65, P: 30, K: 30 },
    stages: {
      basal: { urea: 20, dap: 65, mop: 25, zinc: 10 },
      vegetative: { urea: 50, dap: 0, mop: 15 },
      flowering: { urea: 45, dap: 0, mop: 20, micronutrient: 'Magnesium Sulphate @ 5kg/acre' },
      fruiting: { urea: 30, dap: 0, mop: 15 }
    }
  },
  sugarcane: {
    name: 'Sugarcane (गन्ना)',
    icon: '🎋',
    npkRatio: { N: 100, P: 35, K: 50 },
    stages: {
      basal: { urea: 45, dap: 75, mop: 45, zinc: 15 },
      vegetative: { urea: 90, dap: 0, mop: 20 },
      flowering: { urea: 80, dap: 0, mop: 35 },
      fruiting: { urea: 40, dap: 0, mop: 0 }
    }
  },
  potato: {
    name: 'Potato (आलू)',
    icon: '🥔',
    npkRatio: { N: 75, P: 40, K: 80 },
    stages: {
      basal: { urea: 55, dap: 85, mop: 70, zinc: 10 },
      vegetative: { urea: 65, dap: 0, mop: 30 },
      flowering: { urea: 45, dap: 0, mop: 35 },
      fruiting: { urea: 0, dap: 0, mop: 0 }
    }
  },
  onion: {
    name: 'Onion (प्याज)',
    icon: '🧅',
    npkRatio: { N: 45, P: 25, K: 40 },
    stages: {
      basal: { urea: 25, dap: 55, mop: 35, zinc: 8 },
      vegetative: { urea: 40, dap: 0, mop: 20 },
      flowering: { urea: 30, dap: 0, mop: 15 },
      fruiting: { urea: 0, dap: 0, mop: 0 }
    }
  }
}

function convertToAcres(val: number, unit: LandUnit): number {
  switch (unit) {
    case 'acres': return val
    case 'bigha': return val * 0.625
    case 'hectares': return val * 2.471
    case 'guntha': return val * 0.025
    default: return val
  }
}

export default function FertilizerCalculatorModal({ open, onClose }: FertilizerCalculatorModalProps) {
  const [activeTab, setActiveTab] = useState<'soil' | 'spray'>('soil')
  const [landValue, setLandValue] = useState<number>(1)
  const [landUnit, setLandUnit] = useState<LandUnit>('acres')
  const [selectedCropKey, setSelectedCropKey] = useState<string>('tomato')
  const [stageKey, setStageKey] = useState<'basal' | 'vegetative' | 'flowering' | 'fruiting'>('basal')

  const [chemicalType, setChemicalType] = useState<'insecticide' | 'fungicide' | 'foliar'>('insecticide')
  const [recDosePerAcre, setRecDosePerAcre] = useState<number>(250)
  const [tankSize, setTankSize] = useState<number>(15)

  if (!open) return null

  const acres = convertToAcres(landValue, landUnit)
  const crop = CROP_DATA[selectedCropKey] || CROP_DATA.tomato
  const stageFert = crop.stages[stageKey]

  const ureaKg = Math.round(stageFert.urea * acres)
  const dapKg = Math.round(stageFert.dap * acres)
  const mopKg = Math.round(stageFert.mop * acres)
  const zincKg = stageFert.zinc ? Math.round(stageFert.zinc * acres) : 0

  const totalWaterLiters = Math.round(150 * acres)
  const totalTanks = Math.ceil(totalWaterLiters / tankSize)
  const dosePerTank = Math.round((recDosePerAcre * acres) / totalTanks)

  return (
    <div className="sh-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="sh-detail-modal" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '520px', 
          width: 'calc(100vw - 24px)', 
          background: 'rgba(5, 20, 18, 0.95)',
          border: '1.5px solid #00ff9d',
          boxShadow: '0 0 30px rgba(0, 255, 157, 0.35)',
          borderRadius: '24px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>🧪</span>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>Fertilizer & Spray Calculator</h2>
              <p style={{ fontSize: '12px', color: '#00ff9d', margin: 0 }}>Precision Nutrient & Dosage Assistant</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', borderRadius: '10px', width: '32px', height: '32px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '12px' }}>
          <button
            onClick={() => setActiveTab('soil')}
            style={{
              padding: '10px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'soil' ? 'linear-gradient(135deg, #00ff9d, #10b981)' : 'transparent',
              color: activeTab === 'soil' ? '#041410' : '#94a3b8',
              boxShadow: activeTab === 'soil' ? '0 0 15px rgba(0,255,157,0.4)' : 'none'
            }}
          >
            🌱 Soil Fertilization
          </button>
          <button
            onClick={() => setActiveTab('spray')}
            style={{
              padding: '10px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'spray' ? 'linear-gradient(135deg, #00e5ff, #3b82f6)' : 'transparent',
              color: activeTab === 'spray' ? '#041410' : '#94a3b8',
              boxShadow: activeTab === 'spray' ? '0 0 15px rgba(0,229,255,0.4)' : 'none'
            }}
          >
            🚿 Spray Pump Tank
          </button>
        </div>

        {activeTab === 'soil' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
                📏 Land Area & Unit
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={landValue}
                  onChange={e => setLandValue(parseFloat(e.target.value) || 0)}
                  style={{
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(0,255,157,0.4)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: 800
                  }}
                />
                <select
                  value={landUnit}
                  onChange={e => setLandUnit(e.target.value as LandUnit)}
                  style={{
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 700
                  }}
                >
                  <option value="acres" style={{ background: '#0a1a17' }}>Acres (एकड़)</option>
                  <option value="bigha" style={{ background: '#0a1a17' }}>Bigha (बीघा)</option>
                  <option value="hectares" style={{ background: '#0a1a17' }}>Hectares (हेक्टेयर)</option>
                  <option value="guntha" style={{ background: '#0a1a17' }}>Guntha (गुंठा)</option>
                </select>
              </div>
              <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', marginBottom: 0 }}>
                Equivalent: <span style={{ color: '#00ff9d', fontWeight: 700 }}>{acres.toFixed(2)} Acres</span>
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  🌾 Target Crop
                </label>
                <select
                  value={selectedCropKey}
                  onChange={e => setSelectedCropKey(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '10px',
                    padding: '10px',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 700
                  }}
                >
                  {Object.entries(CROP_DATA).map(([key, data]) => (
                    <option key={key} value={key} style={{ background: '#0a1a17' }}>
                      {data.icon} {data.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  🌱 Growth Stage
                </label>
                <select
                  value={stageKey}
                  onChange={e => setStageKey(e.target.value as any)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '10px',
                    padding: '10px',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 700
                  }}
                >
                  <option value="basal" style={{ background: '#0a1a17' }}>1. Basal / Sowing</option>
                  <option value="vegetative" style={{ background: '#0a1a17' }}>2. Vegetative Stage</option>
                  <option value="flowering" style={{ background: '#0a1a17' }}>3. Flowering Stage</option>
                  <option value="fruiting" style={{ background: '#0a1a17' }}>4. Fruiting / Grain</option>
                </select>
              </div>
            </div>

            <div style={{ background: 'rgba(0, 255, 157, 0.06)', border: '1.5px solid rgba(0, 255, 157, 0.4)', borderRadius: '16px', padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#00ff9d', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>📦 Recommended Bag Split ({landValue} {landUnit})</span>
                <span style={{ fontSize: '11px', background: 'rgba(0,255,157,0.2)', padding: '2px 8px', borderRadius: '10px' }}>NPK Verified</span>
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', fontWeight: 700 }}>UREA (46% N)</span>
                  <span style={{ fontSize: '20px', fontWeight: 900, color: '#fff' }}>{ureaKg} <span style={{ fontSize: '11px' }}>kg</span></span>
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>~{(ureaKg / 45).toFixed(1)} Bags</span>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', fontWeight: 700 }}>DAP (18-46-0)</span>
                  <span style={{ fontSize: '20px', fontWeight: 900, color: '#00e5ff' }}>{dapKg} <span style={{ fontSize: '11px' }}>kg</span></span>
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>~{(dapKg / 50).toFixed(1)} Bags</span>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', fontWeight: 700 }}>MOP (60% K)</span>
                  <span style={{ fontSize: '20px', fontWeight: 900, color: '#facc15' }}>{mopKg} <span style={{ fontSize: '11px' }}>kg</span></span>
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>~{(mopKg / 50).toFixed(1)} Bags</span>
                </div>
              </div>

              {(zincKg > 0 || stageFert.micronutrient) && (
                <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', fontSize: '12px', color: '#86efac', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>💡</span>
                  <span>
                    {zincKg > 0 && `Add Zinc Sulphate: ${zincKg} kg. `}
                    {stageFert.micronutrient && stageFert.micronutrient}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'spray' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
                🧴 Chemical Spray Type
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                <button
                  onClick={() => { setChemicalType('insecticide'); setRecDosePerAcre(250); }}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: chemicalType === 'insecticide' ? '#ef4444' : 'rgba(255,255,255,0.06)',
                    color: '#fff'
                  }}
                >
                  🐛 Insecticide
                </button>
                <button
                  onClick={() => { setChemicalType('fungicide'); setRecDosePerAcre(300); }}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: chemicalType === 'fungicide' ? '#f59e0b' : 'rgba(255,255,255,0.06)',
                    color: '#fff'
                  }}
                >
                  🍄 Fungicide
                </button>
                <button
                  onClick={() => { setChemicalType('foliar'); setRecDosePerAcre(500); }}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: chemicalType === 'foliar' ? '#10b981' : 'rgba(255,255,255,0.06)',
                    color: '#fff'
                  }}
                >
                  🍃 Foliar Spray
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  💧 Dose / Acre (ml or g)
                </label>
                <input
                  type="number"
                  value={recDosePerAcre}
                  onChange={e => setRecDosePerAcre(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(0,229,255,0.4)',
                    borderRadius: '10px',
                    padding: '10px',
                    color: '#fff',
                    fontSize: '15px',
                    fontWeight: 800
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  🎒 Pump Tank Size
                </label>
                <select
                  value={tankSize}
                  onChange={e => setTankSize(parseInt(e.target.value) || 15)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '10px',
                    padding: '10px',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 700
                  }}
                >
                  <option value={15} style={{ background: '#0a1a17' }}>15 Liter Pump</option>
                  <option value={16} style={{ background: '#0a1a17' }}>16 Liter Battery Pump</option>
                  <option value={20} style={{ background: '#0a1a17' }}>20 Liter Heavy Duty</option>
                </select>
              </div>
            </div>

            <div style={{ background: 'rgba(0, 229, 255, 0.08)', border: '1.5px solid rgba(0, 229, 255, 0.4)', borderRadius: '16px', padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#00e5ff', marginBottom: '12px' }}>
                🚿 Knapsack Spray Mix per Tank
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', fontWeight: 700 }}>DOSE PER TANK</span>
                  <span style={{ fontSize: '24px', fontWeight: 900, color: '#00ff9d' }}>{dosePerTank} <span style={{ fontSize: '12px' }}>ml/g</span></span>
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Mix in 1 full {tankSize}L tank</span>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', fontWeight: 700 }}>TOTAL TANKS NEEDED</span>
                  <span style={{ fontSize: '24px', fontWeight: 900, color: '#facc15' }}>{totalTanks} <span style={{ fontSize: '12px' }}>Tanks</span></span>
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Total Water: {totalWaterLiters} Liters</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
