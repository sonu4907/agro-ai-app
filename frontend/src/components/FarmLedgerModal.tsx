import { useState } from 'react'

interface FarmLedgerModalProps {
  open: boolean
  onClose: () => void
}

interface ExpenseItem {
  id: string
  category: string
  amount: number
  note: string
}

export default function FarmLedgerModal({ open, onClose }: FarmLedgerModalProps) {
  const [revenue, setRevenue] = useState<number>(145000) // ₹ Revenue
  const [expenses, setExpenses] = useState<ExpenseItem[]>([
    { id: '1', category: '🌱 Seeds & Nursery', amount: 12500, note: 'Tomato Hybrid Seeds' },
    { id: '2', category: '🧪 Fertilizers & NPK', amount: 18400, note: 'Urea, DAP, MOP' },
    { id: '3', category: '👨‍🌾 Labor & Harvesting', amount: 22000, note: 'Picking labor 4 days' },
    { id: '4', category: '⛽ Fuel & Irrigation', amount: 8500, note: 'Diesel pump' }
  ])

  // New item input
  const [newCat, setNewCat] = useState('🧪 Fertilizers')
  const [newAmt, setNewAmt] = useState<number>(0)
  const [newNote, setNewNote] = useState('')

  if (!open) return null

  const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0)
  const netProfit = revenue - totalExpense

  const handleAddExpense = () => {
    if (newAmt <= 0) return
    setExpenses(prev => [
      ...prev,
      { id: Date.now().toString(), category: newCat, amount: newAmt, note: newNote || newCat }
    ])
    setNewAmt(0)
    setNewNote('')
  }

  return (
    <div className="sh-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="sh-detail-modal" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '520px', 
          width: 'calc(100vw - 24px)', 
          background: 'rgba(18, 14, 6, 0.95)',
          border: '1.5px solid #f97316',
          boxShadow: '0 0 30px rgba(249, 115, 22, 0.35)',
          borderRadius: '24px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>💰</span>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>Farm Expense & Profit Ledger</h2>
              <p style={{ fontSize: '12px', color: '#f97316', margin: 0 }}>Input Cost & Net Income Calculator</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', borderRadius: '10px', width: '32px', height: '32px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Profit Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px', textAlign: 'center' }}>
          <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', padding: '10px 4px', borderRadius: '12px' }}>
            <span style={{ fontSize: '10px', color: '#86efac', display: 'block', fontWeight: 700 }}>REVENUE</span>
            <span style={{ fontSize: '16px', fontWeight: 900, color: '#fff' }}>₹{revenue.toLocaleString()}</span>
          </div>

          <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', padding: '10px 4px', borderRadius: '12px' }}>
            <span style={{ fontSize: '10px', color: '#fca5a5', display: 'block', fontWeight: 700 }}>EXPENSES</span>
            <span style={{ fontSize: '16px', fontWeight: 900, color: '#fff' }}>₹{totalExpense.toLocaleString()}</span>
          </div>

          <div style={{ background: 'rgba(249,115,22,0.15)', border: '1.5px solid #f97316', padding: '10px 4px', borderRadius: '12px' }}>
            <span style={{ fontSize: '10px', color: '#fdba74', display: 'block', fontWeight: 700 }}>NET PROFIT</span>
            <span style={{ fontSize: '16px', fontWeight: 900, color: '#00ff9d' }}>₹{netProfit.toLocaleString()}</span>
          </div>
        </div>

        {/* Total Revenue Editor */}
        <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '14px' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>🌾 Total Crop Sale Revenue (₹)</label>
          <input
            type="number"
            value={revenue}
            onChange={e => setRevenue(parseFloat(e.target.value) || 0)}
            style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '8px', padding: '8px 12px', color: '#00ff9d', fontSize: '16px', fontWeight: 900 }}
          />
        </div>

        {/* Expenses List */}
        <div style={{ marginBottom: '14px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>📋 Expense Items ({expenses.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
            {expenses.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <span style={{ fontWeight: 700, color: '#fff', display: 'block' }}>{item.category}</span>
                  <span style={{ color: '#64748b', fontSize: '11px' }}>{item.note}</span>
                </div>
                <span style={{ fontWeight: 900, color: '#fca5a5', fontSize: '14px' }}>₹{item.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Add New Expense Form */}
        <div style={{ background: 'rgba(249,115,22,0.08)', padding: '12px', borderRadius: '14px', border: '1px solid rgba(249,115,22,0.3)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#f97316' }}>➕ Add New Input Expense</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <input
              type="text"
              placeholder="Category (e.g. Pesticide)"
              value={newCat}
              onChange={e => setNewCat(e.target.value)}
              style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '8px', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
            />
            <input
              type="number"
              placeholder="Amount (₹)"
              value={newAmt || ''}
              onChange={e => setNewAmt(parseFloat(e.target.value) || 0)}
              style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '8px', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
            />
          </div>
          <button
            onClick={handleAddExpense}
            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}
          >
            Add Expense
          </button>
        </div>
      </div>
    </div>
  )
}
