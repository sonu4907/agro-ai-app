import { useEffect, useMemo, useState, useRef } from 'react'
import './GardenDashboard.css'
import { useAuth } from '../context/AuthContext'
import { useLanguage, LanguageSelector } from '../context/LanguageContext'
import { collection, addDoc, deleteDoc, doc, getDocs, onSnapshot, query, orderBy, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

type GardenDashboardProps = { onClose: () => void }
type Page = 'dashboard' | 'controls' | 'assistant' | 'notifications'
type Telemetry = {
  water_level: number
  soil_moisture: number
  nitrogen: number
  phosphorus: number
  potassium: number
  ph: number
  pump_on: boolean
  grow_lights_on: boolean
  auto_mode: boolean
}

type NotificationSettings = {
  telegram_notifications_enabled: boolean
  soil_moisture_threshold: number
  water_level_threshold: number
  npk_alerts_enabled: boolean
}

type SmartIrrigation = {
  decision_code: string
  status_label: string
  reason: string
  should_water: boolean
  rain_expected: boolean
  rain_details: string
  adjusted_threshold: number
  base_threshold: number
  et_info: any
}

const api = '/api/v1/garden'

export default function GardenDashboard({ onClose }: GardenDashboardProps) {
  const [token, setToken] = useState<string | null>('bypass-token')
  const [page, setPage] = useState<Page>('dashboard')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null)
  const [smartIrrigation, setSmartIrrigation] = useState<SmartIrrigation | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant', text: string, time: string }>>([
    { sender: 'assistant', text: 'Based on the local weather, a rain forecast detected a significant probability of precipitation. Watering paused due to rain forecast. 🌿🌧️', time: '10:15 AM' }
  ])
  const [busy, setBusy] = useState(false)

  const { t } = useLanguage()
  const { user } = useAuth()
  const [notifSettings, setNotifSettings] = useState<NotificationSettings | null>(null)
  const [alerts, setAlerts] = useState<any[]>([])
  const [localAlertStates, setLocalAlertStates] = useState<{ [key: string]: boolean }>({
    low_water_level: false,
    low_soil_moisture: false,
    low_nitrogen: false,
    high_nitrogen: false,
    low_phosphorus: false,
    high_phosphorus: false,
    low_potassium: false,
    high_potassium: false,
    low_ph: false,
    high_ph: false,
  })

  const settingsRef = useRef<NotificationSettings | null>(null)
  const alertStatesRef = useRef<any>(null)

  useEffect(() => {
    settingsRef.current = notifSettings
  }, [notifSettings])

  useEffect(() => {
    alertStatesRef.current = localAlertStates
  }, [localAlertStates])

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token])

  const triggerAlert = async (type: string, severity: 'danger' | 'warning', message: string, value: number, threshold: number) => {
    const alertObj = {
      id: 'local-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      type,
      severity,
      message,
      value,
      threshold,
      resolved: false,
      createdAt: new Date().toISOString()
    }

    // 1. Save to Local App State & LocalStorage
    try {
      const savedLocal = JSON.parse(localStorage.getItem('agroai_local_alerts') || '[]')
      const updatedLocal = [alertObj, ...savedLocal].slice(0, 50)
      localStorage.setItem('agroai_local_alerts', JSON.stringify(updatedLocal))
      setAlerts(prev => [alertObj, ...prev])
    } catch (e) {
      console.error('Failed to save local alert:', e)
    }

    // 2. Save to Firebase Firestore if user logged in
    if (user) {
      try {
        await addDoc(collection(db, 'users', user.uid, 'alerts'), {
          type,
          severity,
          message,
          value,
          threshold,
          resolved: false,
          createdAt: new Date().toISOString()
        })
      } catch (error) {
        console.error('Failed to save Firebase alert:', error)
      }
    }

    // 3. Browser Push Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`🚨 AgroAI Farm Alert: ${message}`, {
          body: `Value: ${value} (Threshold: ${threshold})`,
          icon: '/favicon.svg'
        })
      } catch (e) {
        console.error('Browser push error:', e)
      }
    }
  }

  const resolveAlert = async (type: string, restoreMessage: string) => {
    if (!user) return
    try {
      const snapshot = await getDocs(collection(db, 'users', user.uid, 'alerts'))
      const unresolvedDocs = snapshot.docs.filter(doc => {
        const data = doc.data()
        return data.type === type && data.resolved === false
      })
      for (const alertDoc of unresolvedDocs) {
        await setDoc(doc(db, 'users', user.uid, 'alerts', alertDoc.id), {
          ...alertDoc.data(),
          resolved: true,
          resolvedAt: new Date().toISOString(),
          restoreMessage
        })
      }
    } catch (error) {
      console.error('Failed to resolve Firebase alert:', error)
    }
  }

  const checkAlerts = async (tel: Telemetry, configs: NotificationSettings) => {
    if (!configs || !user) return
    
    const waterThresh = configs.water_level_threshold
    const moistureThresh = configs.soil_moisture_threshold
    const currentStates = alertStatesRef.current || {}

    // 1. Water Level
    if (tel.water_level < waterThresh) {
      if (!currentStates.low_water_level) {
        setLocalAlertStates(prev => ({ ...prev, low_water_level: true }))
        await triggerAlert(
          'low_water_level',
          'danger',
          `Critical Low Water Level: ${tel.water_level.toFixed(1)}% (Threshold: ${waterThresh.toFixed(1)}%)`,
          tel.water_level,
          waterThresh
        )
      }
    } else if (tel.water_level >= (waterThresh + 2.0)) {
      if (currentStates.low_water_level) {
        setLocalAlertStates(prev => ({ ...prev, low_water_level: false }))
        await resolveAlert(
          'low_water_level',
          `Water Level Restored: ${tel.water_level.toFixed(1)}%`
        )
      }
    }

    // 2. Soil Moisture
    if (tel.soil_moisture < moistureThresh) {
      if (!currentStates.low_soil_moisture) {
        setLocalAlertStates(prev => ({ ...prev, low_soil_moisture: true }))
        await triggerAlert(
          'low_soil_moisture',
          'danger',
          `Critical Low Soil Moisture: ${tel.soil_moisture.toFixed(1)}% (Threshold: ${moistureThresh.toFixed(1)}%)`,
          tel.soil_moisture,
          moistureThresh
        )
      }
    } else if (tel.soil_moisture >= (moistureThresh + 2.0)) {
      if (currentStates.low_soil_moisture) {
        setLocalAlertStates(prev => ({ ...prev, low_soil_moisture: false }))
        await resolveAlert(
          'low_soil_moisture',
          `Soil Moisture Restored: ${tel.soil_moisture.toFixed(1)}%`
        )
      }
    }

    // 3. NPK & pH Alerts
    if (configs.npk_alerts_enabled) {
      // Nitrogen
      if (tel.nitrogen < 50) {
        if (!currentStates.low_nitrogen) {
          setLocalAlertStates(prev => ({ ...prev, low_nitrogen: true }))
          await triggerAlert('low_nitrogen', 'warning', `Low Nitrogen: ${tel.nitrogen.toFixed(0)} mg/kg (Optimal: 50-150)`, tel.nitrogen, 50)
        }
      } else if (tel.nitrogen >= 50 && tel.nitrogen <= 150) {
        if (currentStates.low_nitrogen || currentStates.high_nitrogen) {
          setLocalAlertStates(prev => ({ ...prev, low_nitrogen: false, high_nitrogen: false }))
          await resolveAlert('low_nitrogen', `Nitrogen Restored: ${tel.nitrogen.toFixed(0)} mg/kg`)
          await resolveAlert('high_nitrogen', `Nitrogen Restored: ${tel.nitrogen.toFixed(0)} mg/kg`)
        }
      } else if (tel.nitrogen > 150) {
        if (!currentStates.high_nitrogen) {
          setLocalAlertStates(prev => ({ ...prev, high_nitrogen: true }))
          await triggerAlert('high_nitrogen', 'warning', `High Nitrogen: ${tel.nitrogen.toFixed(0)} mg/kg (Optimal: 50-150)`, tel.nitrogen, 150)
        }
      }

      // Phosphorus
      if (tel.phosphorus < 30) {
        if (!currentStates.low_phosphorus) {
          setLocalAlertStates(prev => ({ ...prev, low_phosphorus: true }))
          await triggerAlert('low_phosphorus', 'warning', `Low Phosphorus: ${tel.phosphorus.toFixed(0)} mg/kg (Optimal: 30-100)`, tel.phosphorus, 30)
        }
      } else if (tel.phosphorus >= 30 && tel.phosphorus <= 100) {
        if (currentStates.low_phosphorus || currentStates.high_phosphorus) {
          setLocalAlertStates(prev => ({ ...prev, low_phosphorus: false, high_phosphorus: false }))
          await resolveAlert('low_phosphorus', `Phosphorus Restored: ${tel.phosphorus.toFixed(0)} mg/kg`)
          await resolveAlert('high_phosphorus', `Phosphorus Restored: ${tel.phosphorus.toFixed(0)} mg/kg`)
        }
      } else if (tel.phosphorus > 100) {
        if (!currentStates.high_phosphorus) {
          setLocalAlertStates(prev => ({ ...prev, high_phosphorus: true }))
          await triggerAlert('high_phosphorus', 'warning', `High Phosphorus: ${tel.phosphorus.toFixed(0)} mg/kg (Optimal: 30-100)`, tel.phosphorus, 100)
        }
      }

      // Potassium
      if (tel.potassium < 120) {
        if (!currentStates.low_potassium) {
          setLocalAlertStates(prev => ({ ...prev, low_potassium: true }))
          await triggerAlert('low_potassium', 'warning', `Low Potassium: ${tel.potassium.toFixed(0)} mg/kg (Optimal: 120-250)`, tel.potassium, 120)
        }
      } else if (tel.potassium >= 120 && tel.potassium <= 250) {
        if (currentStates.low_potassium || currentStates.high_potassium) {
          setLocalAlertStates(prev => ({ ...prev, low_potassium: false, high_potassium: false }))
          await resolveAlert('low_potassium', `Potassium Restored: ${tel.potassium.toFixed(0)} mg/kg`)
          await resolveAlert('high_potassium', `Potassium Restored: ${tel.potassium.toFixed(0)} mg/kg`)
        }
      } else if (tel.potassium > 250) {
        if (!currentStates.high_potassium) {
          setLocalAlertStates(prev => ({ ...prev, high_potassium: true }))
          await triggerAlert('high_potassium', 'warning', `High Potassium: ${tel.potassium.toFixed(0)} mg/kg (Optimal: 120-250)`, tel.potassium, 250)
        }
      }

      // pH
      if (tel.ph < 6.0) {
        if (!currentStates.low_ph) {
          setLocalAlertStates(prev => ({ ...prev, low_ph: true }))
          await triggerAlert('low_ph', 'warning', `Acidic Soil pH: ${tel.ph.toFixed(1)} (Optimal: 6.0-7.5)`, tel.ph, 6.0)
        }
      } else if (tel.ph >= 6.0 && tel.ph <= 7.5) {
        if (currentStates.low_ph || currentStates.high_ph) {
          setLocalAlertStates(prev => ({ ...prev, low_ph: false, high_ph: false }))
          await resolveAlert('low_ph', `Soil pH Restored: ${tel.ph.toFixed(1)}`)
          await resolveAlert('high_ph', `Soil pH Restored: ${tel.ph.toFixed(1)}`)
        }
      } else if (tel.ph > 7.5) {
        if (!currentStates.high_ph) {
          setLocalAlertStates(prev => ({ ...prev, high_ph: true }))
          await triggerAlert('high_ph', 'warning', `Alkaline Soil pH: ${tel.ph.toFixed(1)} (Optimal: 6.0-7.5)`, tel.ph, 7.5)
        }
      }
    }
  }

  useEffect(() => {
    if (!token) return
    const loadSettings = async () => {
      try {
        const response = await fetch(`${api}/notifications/settings`, { headers })
        const data = await response.json()
        if (response.ok) {
          setNotifSettings(data.settings)
        }
      } catch (e) {
        console.error('Failed to load notification settings:', e)
      }
    }
    void loadSettings()
  }, [token, headers])

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'users', user.uid, 'alerts'),
      orderBy('createdAt', 'desc')
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setAlerts(list)
      
      const activeTypes = list.filter((a: any) => !a.resolved).map((a: any) => a.type)
      setLocalAlertStates(prev => {
        const next = { ...prev }
        Object.keys(next).forEach(key => {
          next[key] = activeTypes.includes(key)
        })
        return next
      })
    }, (error) => {
      console.error("Failed to fetch Firestore alerts:", error)
    })
    return () => unsubscribe()
  }, [user])

  useEffect(() => {
    if (!token) return
    const load = async () => {
      try {
        const response = await fetch(`${api}/status`, { headers })
        const data = await response.json()
        if (!response.ok) throw new Error(data.detail || 'Unable to read garden status')
        setTelemetry(data.telemetry)
        setSmartIrrigation(data.smart_irrigation || null)
        setUpdatedAt(data.updated_at)
        setNotice(data.connected ? '' : 'Waiting for an authenticated ESP32 update…')
        if (data.telemetry && settingsRef.current) {
          void checkAlerts(data.telemetry, settingsRef.current)
        }
      } catch (error) {
        setNotice(error instanceof Error ? error.message : 'Unable to read garden status')
      }
    }
    void load()
    const interval = window.setInterval(() => void load(), 2000)
    return () => window.clearInterval(interval)
  }, [token, headers])

  const login = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true); setNotice('')
    try {
      const response = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Login failed')
      setToken(data.access_token)
      setPassword('')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Login failed')
    } finally { setBusy(false) }
  }

  const sendCommand = async (target: 'pump' | 'grow_lights' | 'auto_mode', enabled: boolean) => {
    setBusy(true); setNotice('')
    try {
      const response = await fetch(`${api}/commands`, { method: 'POST', headers, body: JSON.stringify({ target, enabled }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Command was not queued')
      setNotice('Command queued. The ESP32 will collect it during its next two-second poll.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Command failed')
    } finally { setBusy(false) }
  }

  const askAssistant = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!question.trim()) return
    const userMsg = question.trim()
    setQuestion('')
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    
    setMessages(prev => [...prev, { sender: 'user', text: userMsg, time: timeStr }])
    setBusy(true); setNotice('')
    try {
      const response = await fetch(`${api}/assistant`, { method: 'POST', headers, body: JSON.stringify({ question: userMsg }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Assistant is unavailable')
      
      const assistantTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setMessages(prev => [...prev, { sender: 'assistant', text: data.reply, time: assistantTime }])
    } catch (error) {
      const assistantTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setMessages(prev => [...prev, { 
        sender: 'assistant', 
        text: error instanceof Error ? error.message : 'Assistant is temporarily unavailable.', 
        time: assistantTime 
      }])
    } finally { setBusy(false) }
  }

  const updateSettings = async (settingsToSave: NotificationSettings) => {
    setBusy(true); setNotice('')
    try {
      const response = await fetch(`${api}/notifications/settings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(settingsToSave)
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Failed to update settings')
      setNotifSettings(data.settings)
      setNotice('Notification settings saved successfully.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to update settings')
    } finally { setBusy(false) }
  }

  const testNotifications = async () => {
    setBusy(true); setNotice('')
    try {
      const response = await fetch(`${api}/notifications/test`, {
        method: 'POST',
        headers
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Test notification failed')
      setNotice('Test telegram alert sent successfully!')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Test notification failed')
    } finally { setBusy(false) }
  }

  const deleteAlert = async (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId))
    try {
      const savedLocal = JSON.parse(localStorage.getItem('agroai_local_alerts') || '[]')
      const updatedLocal = savedLocal.filter((a: any) => a.id !== alertId)
      localStorage.setItem('agroai_local_alerts', JSON.stringify(updatedLocal))
    } catch (e) {}

    if (user && !alertId.startsWith('local-')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'alerts', alertId))
      } catch (error) {
        console.error('Failed to delete Firebase alert:', error)
      }
    }
  }

  const clearAllAlerts = async () => {
    setAlerts([])
    localStorage.removeItem('agroai_local_alerts')
    if (user) {
      try {
        const snapshot = await getDocs(collection(db, 'users', user.uid, 'alerts'))
        for (const alertDoc of snapshot.docs) {
          await deleteDoc(doc(db, 'users', user.uid, 'alerts', alertDoc.id))
        }
      } catch (error) {
        console.error('Failed to clear all alerts:', error)
      }
    }
  }

  if (!token) return (
    <div className="garden-modal-overlay">
      <section className="garden-page garden-login-page garden-modal-content animate-popup">
        <div className="garden-login-card">
          <p className="garden-eyebrow">Smart Farm</p>
          <h1>Farm administrator login</h1>
          <p>Use the credentials configured only on the backend. This unlocks live telemetry and ESP32 controls.</p>
          <form onSubmit={login}>
            <label>Username<input value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" required /></label>
            <label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required /></label>
            <button disabled={busy} type="submit" className="neon-btn-submit">{busy ? 'Signing in…' : 'Open live farm'}</button>
          </form>
          {notice && <div className="garden-notice">{notice}</div>}
          <button className="garden-close neon-btn-close" onClick={onClose}>Back to Plant Medic</button>
        </div>
      </section>
    </div>
  )

  return (
    <div className="garden-modal-overlay">
      <section className="garden-page garden-modal-content animate-popup" aria-label="Live smart farm dashboard">
        <div className="garden-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="garden-logo-leaf">🌱</span>
            <div>
              <h1>{t('smartFarmControl')}</h1>
              <p className="garden-eyebrow" style={{ margin: 0, textShadow: 'none' }}>Authenticated ESP32 connection</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="system-status-indicator">
              <span className="live-clock">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="status-wifi">📶</span>
              <span className="status-battery">🔋</span>
            </div>
            <LanguageSelector />
            <button className="garden-close neon-btn-close" onClick={onClose}>Back to Plant Medic</button>
          </div>
        </div>
        <nav className="garden-tabs">
          <button className={page === 'dashboard' ? 'active' : ''} onClick={() => setPage('dashboard')}>{t('liveDashboard')}</button>
          <button className={page === 'notifications' ? 'active' : ''} onClick={() => setPage('notifications')}>
            {t('notifications')} {alerts.filter(a => !a.resolved).length > 0 && (
              <span className="tab-badge">{alerts.filter(a => !a.resolved).length}</span>
            )}
          </button>
        </nav>
        {notice && <div className="garden-notice">{notice}</div>}
        {page === 'dashboard' && (
          <Dashboard 
            telemetry={telemetry} 
            smartIrrigation={smartIrrigation} 
            updatedAt={updatedAt} 
            busy={busy}
            sendCommand={sendCommand}
            messages={messages}
            question={question}
            setQuestion={setQuestion}
            askAssistant={askAssistant}
          />
        )}
        {page === 'notifications' && (
          <Notifications
            alerts={alerts}
            settings={notifSettings}
            onSaveSettings={updateSettings}
            onTestNotifications={testNotifications}
            onDeleteAlert={deleteAlert}
            onClearAllAlerts={clearAllAlerts}
            busy={busy}
          />
        )}
      </section>
    </div>
  )
}

function getFertilizerAdvice(telemetry: Telemetry | null) {
  if (!telemetry) return [];
  const advices = [];
  if (telemetry.nitrogen < 50) {
    advices.push({
      nutrient: 'Nitrogen (N) is Low',
      status: 'warning',
      quantity: 'Urea: 20-25g / sq.m',
      reason: 'To stimulate vegetative leafy growth. Alternatively, apply 1kg of rich organic compost per sq. meter.'
    });
  } else if (telemetry.nitrogen > 150) {
    advices.push({
      nutrient: 'Nitrogen (N) is High',
      status: 'danger',
      quantity: 'Suspend Nitrogen feeding',
      reason: 'Over-nitrogen causes vegetative burn and weak stems. Flush soil with clean water if severe.'
    });
  }

  if (telemetry.phosphorus < 30) {
    advices.push({
      nutrient: 'Phosphorus (P) is Low',
      status: 'warning',
      quantity: 'Single Super Phosphate: 15g / sq.m',
      reason: 'To stimulate robust root development and early flowering. Alternatively, apply bone meal.'
    });
  } else if (telemetry.phosphorus > 100) {
    advices.push({
      nutrient: 'Phosphorus (P) is High',
      status: 'danger',
      quantity: 'Avoid Phosphate fertilizers',
      reason: 'Excess phosphorus blocks iron and zinc absorption.'
    });
  }

  if (telemetry.potassium < 120) {
    advices.push({
      nutrient: 'Potassium (K) is Low',
      status: 'warning',
      quantity: 'Muriate of Potash: 15g / sq.m',
      reason: 'To improve disease resistance and fruit quality. Alternatively, apply organic wood ash.'
    });
  } else if (telemetry.potassium > 250) {
    advices.push({
      nutrient: 'Potassium (K) is High',
      status: 'danger',
      quantity: 'Stop Potassium feeding',
      reason: 'Excess potassium restricts magnesium uptake.'
    });
  }

  if (telemetry.ph < 6.0) {
    advices.push({
      nutrient: 'Soil pH is Acidic',
      status: 'warning',
      quantity: 'Agricultural Lime: 50-100g / sq.m',
      reason: 'To raise soil pH back into the optimal 6.0-7.0 range for nutrient availability.'
    });
  } else if (telemetry.ph > 7.5) {
    advices.push({
      nutrient: 'Soil pH is Alkaline',
      status: 'warning',
      quantity: 'Elemental Sulfur: 20-30g / sq.m',
      reason: 'To lower soil pH. Alternatively, mix in peat moss or organic compost.'
    });
  }

  return advices;
}

function SmartIrrigationCard({ smartIrrigation, telemetry }: { smartIrrigation: SmartIrrigation | null, telemetry: Telemetry | null }) {
  const { t } = useLanguage()
  if (!smartIrrigation) return null

  const getStatusStyle = (code: string) => {
    switch (code) {
      case 'DELAYED_RAIN_PREDICTED':
        return {
          bg: 'rgba(14, 165, 233, 0.12)',
          border: '1px solid rgba(14, 165, 233, 0.4)',
          color: '#38bdf8',
          icon: '🌧️',
          badgeBg: 'rgba(14, 165, 233, 0.2)',
          label: t('statusDelayedRain')
        }
      case 'IRRIGATE_ACTIVE':
        return {
          bg: 'rgba(34, 197, 94, 0.12)',
          border: '1px solid rgba(34, 197, 94, 0.4)',
          color: '#4ade80',
          icon: '💧',
          badgeBg: 'rgba(34, 197, 94, 0.2)',
          label: t('statusIrrigateActive')
        }
      case 'BLOCKED_TANK_LOW':
        return {
          bg: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#f87171',
          icon: '⚠️',
          badgeBg: 'rgba(239, 68, 68, 0.2)',
          label: t('statusBlockedLowTank')
        }
      default:
        return {
          bg: 'rgba(148, 163, 184, 0.08)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          color: '#cbd5e1',
          icon: '⏸️',
          badgeBg: 'rgba(148, 163, 184, 0.15)',
          label: t('statusMoistureSufficient')
        }
    }
  }

  const style = getStatusStyle(smartIrrigation.decision_code)

  return (
    <article className="garden-card smart-irrigation-card" style={{ marginTop: '20px', textAlign: 'left', background: style.bg, border: style.border }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
        <div>
          <p className="garden-eyebrow" style={{ color: '#94a3b8' }}>{t('weatherAwareCare')}</p>
          <h2 style={{ margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', color: '#f8fafc' }}>
            <span>{style.icon}</span> {t('smartIrrigationScheduler')}
          </h2>
        </div>
        <span style={{
          padding: '6px 14px',
          borderRadius: '999px',
          background: style.badgeBg,
          color: style.color,
          fontSize: '13px',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {style.label}
        </span>
      </div>

      <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#e2e8f0', lineHeight: '1.5' }}>
        {smartIrrigation.reason}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '12px' }}>
        <div>
          <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>{t('rainForecast12h')}</span>
          <strong style={{ fontSize: '14px', color: smartIrrigation.rain_expected ? '#38bdf8' : '#cbd5e1' }}>
            {smartIrrigation.rain_expected ? t('rainPredicted') : t('dryNoRain')}
          </strong>
          {smartIrrigation.rain_details && (
            <small style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              {smartIrrigation.rain_details}
            </small>
          )}
        </div>

        <div>
          <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>{t('targetSoilMoisture')}</span>
          <strong style={{ fontSize: '14px', color: '#34d399' }}>
            {smartIrrigation.adjusted_threshold.toFixed(1)}%
          </strong>
          {smartIrrigation.et_info && (
            <small style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              ET0 Rate: {smartIrrigation.et_info.et_rate} mm/day ({smartIrrigation.et_info.level})
            </small>
          )}
        </div>

        <div>
          <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>{t('automatedMode')}</span>
          <strong style={{ fontSize: '14px', color: telemetry?.auto_mode ? '#a7f3d0' : '#fca5a5' }}>
            {telemetry?.auto_mode ? t('activeWeatherGuided') : t('manualOverride')}
          </strong>
        </div>
      </div>
    </article>
  )
}

function MetricChart({ color, points }: { color: string, points: string }) {
  return (
    <div className="metric-chart-container" style={{ width: '100%', height: '35px', marginTop: 'auto', overflow: 'hidden' }}>
      <svg className="metric-chart-svg" viewBox="0 0 120 30" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
        <path d={points} fill="none" stroke={color} strokeWidth="1.8" style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
      </svg>
    </div>
  )
}

function Dashboard({
  telemetry,
  smartIrrigation,
  updatedAt,
  busy,
  sendCommand,
  messages,
  question,
  setQuestion,
  askAssistant
}: {
  telemetry: Telemetry | null
  smartIrrigation: SmartIrrigation | null
  updatedAt: string | null
  busy: boolean
  sendCommand: (target: 'pump' | 'grow_lights' | 'auto_mode', enabled: boolean) => Promise<void>
  messages: Array<{ sender: 'user' | 'assistant', text: string, time: string }>
  question: string
  setQuestion: (val: string) => void
  askAssistant: (event: React.FormEvent) => Promise<void>
}) {
  const [listening, setListening] = useState(false)

  const toggleMicListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported on this browser.')
      return
    }

    if (listening) {
      setListening(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false

      recognition.onstart = () => {
        setListening(true)
      }

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        if (transcript) {
          setQuestion(transcript)
        }
        setListening(false)
      }

      recognition.onerror = (err: any) => {
        console.error('Speech recognition error:', err)
        setListening(false)
      }

      recognition.onend = () => {
        setListening(false)
      }

      recognition.start()
    } catch (e) {
      console.error(e)
      setListening(false)
    }
  }

  return (
    <>
      <div className={`garden-status ${telemetry ? 'garden-status-healthy' : 'garden-status-warning'}`}>
        <span className="garden-live-dot" />
        <strong>{telemetry ? 'Live ESP32 telemetry connected' : 'ESP32 not connected yet'}</strong>
        <span>{updatedAt ? `Updated ${new Date(updatedAt).toLocaleTimeString()}` : 'Waiting for first device report'}</span>
      </div>

      {/* ── ULTRA-SIMPLIFIED VISUAL STATUS GLANCE BAR ── */}
      {(() => {
        const moisture = telemetry ? telemetry.soil_moisture : 50;
        const nitrogen = telemetry ? telemetry.nitrogen : 120;
        const ph = telemetry ? telemetry.ph : 6.5;

        // 🚿 Watering Can Status (Irrigation)
        let waterStatus = { label: 'Optimal Moisture', icon: '🚿', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)', border: '#22c55e', desc: 'Soil moisture is healthy (40-70%)' };
        if (moisture < 30) {
          waterStatus = { label: 'Watering Recommended', icon: '🚿', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: '#f59e0b', desc: 'Soil moisture is low (<30%). Turn on pump soon.' };
        } else if (moisture < 15) {
          waterStatus = { label: 'Critical Dry Danger', icon: '🚿', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', desc: 'Severe water deficit (<15%). Immediate watering needed!' };
        }

        // 🐛 Pest & Disease Risk (Bug Control)
        let pestStatus = { label: 'Zero Pest Risk', icon: '🐛', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)', border: '#22c55e', desc: 'Humidity & temperature levels low risk for pests' };
        if (ph < 5.5 || ph > 8.0) {
          pestStatus = { label: 'Pest Risk Alert', icon: '🐛', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', desc: 'Extreme pH stresses crop immunity against pests!' };
        } else if (ph < 6.0 || ph > 7.5) {
          pestStatus = { label: 'Monitor Canopy', icon: '🐛', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: '#f59e0b', desc: 'Moderate pH drift. Check undersides of leaves.' };
        }

        // 🍃 Plant Medicine & Nutrients (NPK Leaf)
        let medStatus = { label: 'NPK Balanced', icon: '🍃', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)', border: '#22c55e', desc: 'Soil nitrogen and minerals optimal' };
        if (nitrogen < 60) {
          medStatus = { label: 'Low Nitrogen Alert', icon: '🍃', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', desc: 'Nitrogen severe deficit (<60 ppm). Apply Urea or NPK.' };
        } else if (nitrogen < 100) {
          medStatus = { label: 'Nutrient Top-up', icon: '🍃', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: '#f59e0b', desc: 'Nitrogen moderate level. Apply compost.' };
        }

        return (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '14px',
            margin: '16px 0 24px 0'
          }}>
            {/* Card 1: Irrigation */}
            <div style={{
              background: waterStatus.bg,
              border: `1.5px solid ${waterStatus.border}`,
              borderRadius: '16px',
              padding: '16px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: `0 0 15px ${waterStatus.color}20`
            }}>
              <div style={{ fontSize: '32px', filter: `drop-shadow(0 0 8px ${waterStatus.color})` }}>{waterStatus.icon}</div>
              <div>
                <span style={{ background: waterStatus.color, color: '#000', fontWeight: 900, fontSize: '10px', padding: '2px 8px', borderRadius: '999px', display: 'inline-block', marginBottom: '4px' }}>
                  {waterStatus.label.toUpperCase()}
                </span>
                <strong style={{ display: 'block', fontSize: '14px', color: '#fff' }}>Irrigation (Watering)</strong>
                <p style={{ margin: 0, fontSize: '11px', color: '#cbd5e1' }}>{waterStatus.desc}</p>
              </div>
            </div>

            {/* Card 2: Pest Control */}
            <div style={{
              background: pestStatus.bg,
              border: `1.5px solid ${pestStatus.border}`,
              borderRadius: '16px',
              padding: '16px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: `0 0 15px ${pestStatus.color}20`
            }}>
              <div style={{ fontSize: '32px', filter: `drop-shadow(0 0 8px ${pestStatus.color})` }}>{pestStatus.icon}</div>
              <div>
                <span style={{ background: pestStatus.color, color: '#000', fontWeight: 900, fontSize: '10px', padding: '2px 8px', borderRadius: '999px', display: 'inline-block', marginBottom: '4px' }}>
                  {pestStatus.label.toUpperCase()}
                </span>
                <strong style={{ display: 'block', fontSize: '14px', color: '#fff' }}>Pest & Insect Risk</strong>
                <p style={{ margin: 0, fontSize: '11px', color: '#cbd5e1' }}>{pestStatus.desc}</p>
              </div>
            </div>

            {/* Card 3: Plant Medicine */}
            <div style={{
              background: medStatus.bg,
              border: `1.5px solid ${medStatus.border}`,
              borderRadius: '16px',
              padding: '16px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: `0 0 15px ${medStatus.color}20`
            }}>
              <div style={{ fontSize: '32px', filter: `drop-shadow(0 0 8px ${medStatus.color})` }}>{medStatus.icon}</div>
              <div>
                <span style={{ background: medStatus.color, color: '#000', fontWeight: 900, fontSize: '10px', padding: '2px 8px', borderRadius: '999px', display: 'inline-block', marginBottom: '4px' }}>
                  {medStatus.label.toUpperCase()}
                </span>
                <strong style={{ display: 'block', fontSize: '14px', color: '#fff' }}>Plant Medicine & NPK</strong>
                <p style={{ margin: 0, fontSize: '11px', color: '#cbd5e1' }}>{medStatus.desc}</p>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="garden-dashboard-main-layout">
        {/* Left Column: Live readings & controls */}
        <div className="garden-dashboard-left-panel">
          <div className="section-header-row">
            <span className="section-eyebrow">Realtime Telemetry</span>
            <h3 className="section-title">Live Sensor Readings</h3>
          </div>

          <div className="garden-metric-grid">
            {/* Soil Moisture */}
            <article className="garden-metric soil">
              <div className="metric-info">
                <span>Soil moisture</span>
                <strong>{telemetry ? `${telemetry.soil_moisture.toFixed(0)}` : '—'}<span className="unit-label">%</span></strong>
              </div>
              <CircularProgress 
                percentage={telemetry ? telemetry.soil_moisture : 0} 
                color="#22c55e" 
                icon="💧" 
              />
              <MetricChart color="#22c55e" points="M 0 25 Q 15 5 30 20 T 60 10 T 90 22 T 120 15" />
            </article>

            {/* Nitrogen */}
            <article className="garden-metric nitrogen">
              <div className="metric-info">
                <span>Nitrogen (N)</span>
                <strong>{telemetry ? `${telemetry.nitrogen.toFixed(0)}` : '—'}<span className="unit-label">ppm</span></strong>
              </div>
              <CircularProgress 
                percentage={telemetry ? Math.min(100, Math.round((telemetry.nitrogen / 200) * 100)) : 0} 
                color="#f97316" 
                icon="N" 
              />
              <MetricChart color="#f97316" points="M 0 20 Q 20 8 40 25 T 80 12 T 120 18" />
            </article>

            {/* Phosphorus */}
            <article className="garden-metric phosphorus">
              <div className="metric-info">
                <span>Phosphorus (P)</span>
                <strong>{telemetry ? `${telemetry.phosphorus.toFixed(0)}` : '—'}<span className="unit-label">ppm</span></strong>
              </div>
              <CircularProgress 
                percentage={telemetry ? Math.min(100, Math.round((telemetry.phosphorus / 200) * 100)) : 0} 
                color="#eab308" 
                icon="P" 
              />
              <MetricChart color="#eab308" points="M 0 22 Q 15 15 35 8 T 75 22 T 120 12" />
            </article>

            {/* Potassium */}
            <article className="garden-metric potassium">
              <div className="metric-info">
                <span>Potassium (K)</span>
                <strong>{telemetry ? `${telemetry.potassium.toFixed(0)}` : '—'}<span className="unit-label">ppm</span></strong>
              </div>
              <CircularProgress 
                percentage={telemetry ? Math.min(100, Math.round((telemetry.potassium / 200) * 100)) : 0} 
                color="#bd00ff" 
                icon="K" 
              />
              <MetricChart color="#bd00ff" points="M 0 15 Q 25 22 50 10 T 100 20 T 120 14" />
            </article>

            {/* pH Level */}
            <article className="garden-metric ph">
              <div className="metric-info">
                <span>pH Level</span>
                <strong>{telemetry ? `${telemetry.ph.toFixed(1)}` : '—'}<span className="unit-label">pH</span></strong>
              </div>
              <CircularProgress 
                percentage={telemetry ? Math.min(100, Math.round((telemetry.ph / 14) * 100)) : 0} 
                color="#22d3ee" 
                icon="pH" 
              />
              <MetricChart color="#22d3ee" points="M 0 10 Q 20 18 45 10 T 90 15 T 120 12" />
            </article>
          </div>

          <div className="section-header-row" style={{ marginTop: '24px' }}>
            <span className="section-eyebrow">Relayed Command Triggers</span>
            <h3 className="section-title">System Controls</h3>
          </div>

          <div className="system-controls-row">
            {/* Water Pump Switch Toggle */}
            <div className={`system-control-btn-card ${telemetry?.pump_on ? 'active' : ''}`}>
              <div className="control-btn-icon-label">
                <span className="control-icon-circle green">💧</span>
                <div className="control-label-col">
                  <strong>Water Pump</strong>
                  <span>{telemetry?.pump_on ? 'Active' : 'Standby'}</span>
                </div>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={telemetry?.pump_on ?? false} 
                  disabled={busy || !telemetry}
                  onChange={() => sendCommand('pump', !telemetry?.pump_on)} 
                />
                <span className="toggle-slider green-glow" />
              </label>
            </div>

            {/* Grow Lights Switch Toggle */}
            <div className={`system-control-btn-card ${telemetry?.grow_lights_on ? 'active' : ''}`}>
              <div className="control-btn-icon-label">
                <span className="control-icon-circle orange">☀️</span>
                <div className="control-label-col">
                  <strong>Grow Lights</strong>
                  <span>{telemetry?.grow_lights_on ? 'Active' : 'Standby'}</span>
                </div>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={telemetry?.grow_lights_on ?? false} 
                  disabled={busy || !telemetry}
                  onChange={() => sendCommand('grow_lights', !telemetry?.grow_lights_on)} 
                />
                <span className="toggle-slider orange-glow" />
              </label>
            </div>

            {/* Automated mode Toggle */}
            <div className={`system-control-btn-card ${telemetry?.auto_mode ? 'active' : ''}`}>
              <div className="control-btn-icon-label">
                <span className="control-icon-circle blue">🤖</span>
                <div className="control-label-col">
                  <strong>Automated Care</strong>
                  <span>{telemetry?.auto_mode ? 'Active' : 'Manual Override'}</span>
                </div>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={telemetry?.auto_mode ?? false} 
                  disabled={busy || !telemetry}
                  onChange={() => sendCommand('auto_mode', !telemetry?.auto_mode)} 
                />
                <span className="toggle-slider blue-glow" />
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: AI Assistant Chat */}
        <div className="garden-dashboard-right-panel">
          <div className="garden-card garden-ai-chat-card">
            <div className="chat-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="chat-ai-avatar">🤖</div>
                <div className="chat-ai-title-desc">
                  <strong>Garden AI Assistant</strong>
                  <span className="chat-status-pulse"><span className="chat-pulse-dot" /> Online</span>
                </div>
              </div>
            </div>

            <div className="chat-messages-area">
              {messages.map((msg, idx) => (
                <div key={idx} className={`chat-bubble-row ${msg.sender === 'user' ? 'msg-user' : 'msg-ai'}`}>
                  {msg.sender === 'assistant' && (
                    <div className="chat-avatar-circle">🤖</div>
                  )}
                  <div className="chat-bubble-container">
                    <div className="chat-bubble-meta">
                      <span className="chat-sender">{msg.sender === 'user' ? 'Farmer' : 'Garden AI'}</span>
                      <span className="chat-time">{msg.time}</span>
                    </div>
                    <div className="chat-bubble-text">{msg.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <form className="chat-input-form" onSubmit={askAssistant}>
              <button 
                type="button" 
                className={`chat-mic-btn ${listening ? 'listening' : ''}`}
                onClick={toggleMicListening}
                title={listening ? 'Listening to voice...' : 'Click to Speak'}
              >
                {listening ? '🎙️' : '🎤'}
              </button>
              <input 
                value={question} 
                onChange={e => setQuestion(e.target.value)} 
                placeholder={listening ? 'Listening...' : 'Type or click mic to speak...'} 
                disabled={busy} 
              />
              <button type="submit" className="chat-send-btn" disabled={busy || !question.trim()}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>

      <SmartIrrigationCard smartIrrigation={smartIrrigation} telemetry={telemetry} />

      {telemetry && (
        <article className="garden-card fertilizer-recs" style={{ marginTop: '20px', textAlign: 'left' }}>
          <p className="garden-eyebrow">AgroAI Soil Nutrient Diagnosis</p>
          <h2 style={{ marginBottom: '16px' }}>🔬 AI Fertilizer & NPK Recommendations</h2>
          {getFertilizerAdvice(telemetry).length > 0 ? (
            <div style={{ display: 'grid', gap: '12px' }}>
              {getFertilizerAdvice(telemetry).map((adv, idx) => (
                <div key={idx} style={{
                  padding: '16px',
                  borderRadius: '12px',
                  borderLeft: `4px solid ${adv.status === 'danger' ? '#ef4444' : '#eab308'}`,
                  background: 'rgba(255, 255, 255, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <strong style={{ color: adv.status === 'danger' ? '#fca5a5' : '#fef08a' }}>{adv.nutrient}</strong>
                    <span style={{
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: adv.status === 'danger' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                      color: adv.status === 'danger' ? '#f87171' : '#facc15',
                      fontWeight: 800
                    }}>
                      {adv.quantity}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>{adv.reason}</p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              padding: '16px',
              borderRadius: '12px',
              borderLeft: '4px solid #22c55e',
              background: 'rgba(34, 197, 94, 0.05)',
              color: '#a7f3d0',
              fontSize: '14px'
            }}>
              ✅ <strong>All soil parameters are balanced!</strong> Soil NPK levels and pH are optimal. No fertilizer adjustment is needed. Keep up the good farming practices!
            </div>
          )}
        </article>
      )}

      <FertilizerDosageCalculator telemetry={telemetry} />
    </>
  )
}

interface CropProfile {
  name: string
  emoji: string
  targetN: number
  targetP: number
  targetK: number
  targetPh: number
}

const CROP_PROFILES: Record<string, CropProfile> = {
  tomato: { name: 'Tomato', emoji: '🍅', targetN: 100, targetP: 60, targetK: 180, targetPh: 6.5 },
  wheat: { name: 'Wheat', emoji: '🌾', targetN: 90, targetP: 50, targetK: 150, targetPh: 6.8 },
  rice: { name: 'Rice / Paddy', emoji: '🍚', targetN: 85, targetP: 45, targetK: 140, targetPh: 6.2 },
  cotton: { name: 'Cotton', emoji: '☁️', targetN: 110, targetP: 55, targetK: 170, targetPh: 7.0 },
  potato: { name: 'Potato', emoji: '🥔', targetN: 120, targetP: 70, targetK: 200, targetPh: 5.8 },
  sugarcane: { name: 'Sugarcane', emoji: '🎋', targetN: 130, targetP: 65, targetK: 190, targetPh: 6.7 },
  maize: { name: 'Maize / Corn', emoji: '🌽', targetN: 95, targetP: 50, targetK: 160, targetPh: 6.5 },
  chili: { name: 'Chili Pepper', emoji: '🌶️', targetN: 105, targetP: 58, targetK: 175, targetPh: 6.4 },
  general: { name: 'General Vegetable', emoji: '🥦', targetN: 85, targetP: 48, targetK: 160, targetPh: 6.5 },
}

type GrowthStage = 'sowing' | 'vegetative' | 'flowering' | 'fruiting'

interface StageInfo {
  id: GrowthStage
  name: string
  emoji: string
  days: string
  focus: string
  nMult: number
  pMult: number
  kMult: number
  desc: string
}

const GROWTH_STAGES: Record<GrowthStage, StageInfo> = {
  sowing: {
    id: 'sowing',
    name: 'Sowing / Basal',
    emoji: '🌱',
    days: '0–15 Days',
    focus: 'Phosphorus Focus (Rooting)',
    nMult: 0.4,
    pMult: 1.2,
    kMult: 0.4,
    desc: 'High Phosphorus needed for rapid root establishment. Lower Nitrogen prevents seedling tip burn.'
  },
  vegetative: {
    id: 'vegetative',
    name: 'Vegetative Growth',
    emoji: '🌿',
    days: '16–45 Days',
    focus: 'Nitrogen Focus (Canopy & Leaves)',
    nMult: 1.3,
    pMult: 0.7,
    kMult: 0.7,
    desc: 'Heavy Nitrogen requirement to support leaf expansion, stem thickness, and photosynthesis.'
  },
  flowering: {
    id: 'flowering',
    name: 'Flowering & Budding',
    emoji: '🌸',
    days: '46–70 Days',
    focus: 'Balanced P & K (Bloom boost)',
    nMult: 0.8,
    pMult: 1.3,
    kMult: 1.0,
    desc: 'Boosted Phosphorus and Potassium to support flower formation and prevent bud drop.'
  },
  fruiting: {
    id: 'fruiting',
    name: 'Fruiting / Maturity',
    emoji: '🍎',
    days: '71+ Days',
    focus: 'Potassium Focus (Fruit & Grain Filling)',
    nMult: 0.5,
    pMult: 0.6,
    kMult: 1.5,
    desc: 'Potassium heavy phase for fruit enlargement, starch accumulation, color, and shelf life.'
  }
}

function FertilizerDosageCalculator({ telemetry }: { telemetry: Telemetry | null }) {
  const { t } = useLanguage()
  const [selectedCrop, setSelectedCrop] = useState<string>('tomato')
  const [stage, setStage] = useState<GrowthStage>('vegetative')
  const [plotSize, setPlotSize] = useState<number>(1.0)
  const [unit, setUnit] = useState<'acres' | 'hectares'>('acres')
  const [bagWeight, setBagWeight] = useState<number>(45) // 45kg or 50kg
  const [autoSync, setAutoSync] = useState<boolean>(true)
  const [copiedReceipt, setCopiedReceipt] = useState<boolean>(false)

  // Custom overrides when autoSync is false
  const [customN, setCustomN] = useState<number>(45)
  const [customP, setCustomP] = useState<number>(25)
  const [customK, setCustomK] = useState<number>(100)
  const [customPh, setCustomPh] = useState<number>(6.2)

  // Effective Soil Readings
  const nVal = autoSync ? (telemetry?.nitrogen ?? 45) : customN
  const pVal = autoSync ? (telemetry?.phosphorus ?? 25) : customP
  const kVal = autoSync ? (telemetry?.potassium ?? 100) : customK
  const phVal = autoSync ? (telemetry?.ph ?? 6.2) : customPh

  const crop = CROP_PROFILES[selectedCrop] || CROP_PROFILES.general
  const stageInfo = GROWTH_STAGES[stage]

  // Stage-adjusted NPK Targets
  const targetN = Math.round(crop.targetN * stageInfo.nMult)
  const targetP = Math.round(crop.targetP * stageInfo.pMult)
  const targetK = Math.round(crop.targetK * stageInfo.kMult)

  // Convert acreage (1 Hectare = 2.471 Acres)
  const acres = unit === 'hectares' ? plotSize * 2.471 : plotSize

  // Nutrient Deficits (mg/kg) using stage-adjusted targets
  const defN = Math.max(0, targetN - nVal)
  const defP = Math.max(0, targetP - pVal)
  const defK = Math.max(0, targetK - kVal)

  // Conversion: 1 mg/kg deficit in top 15cm soil ~= 0.906 kg/acre
  const reqN_kg = Math.round(defN * 0.906 * acres * 10) / 10
  const reqP_kg = Math.round(defP * 0.906 * acres * 10) / 10
  const reqK_kg = Math.round(defK * 0.906 * acres * 10) / 10

  // Kilograms of Commercial Fertilizers needed
  // Urea = 46% N, SSP = 16% P2O5, MOP = 60% K2O
  const urea_kg = Math.round((reqN_kg / 0.46) * 10) / 10
  const ssp_kg = Math.round((reqP_kg / 0.16) * 10) / 10
  const mop_kg = Math.round((reqK_kg / 0.60) * 10) / 10

  // Bag Counts (rounded up)
  const urea_bags = Math.ceil(urea_kg / bagWeight)
  const ssp_bags = Math.ceil(ssp_kg / 50) // SSP usually 50kg
  const mop_bags = Math.ceil(mop_kg / 50) // MOP usually 50kg

  // pH Amendments
  let phAmendment = ''
  let phKg = 0
  if (phVal < 6.0) {
    const phDef = 6.5 - phVal
    phKg = Math.round(phDef * 200 * acres) // ~200kg Agricultural Lime per acre per 1.0 pH unit
    phAmendment = `Apply ~${phKg} kg Agricultural Lime (Dolomite) to neutralize soil acidity.`
  } else if (phVal > 7.5) {
    const phSurplus = phVal - 7.0
    phKg = Math.round(phSurplus * 60 * acres) // ~60kg Elemental Sulfur per acre per 1.0 pH unit
    phAmendment = `Apply ~${phKg} kg Elemental Sulfur or organic peat moss to reduce alkalinity.`
  }

  // Cost Estimations (INR)
  // Urea ~ ₹266/bag (45kg), SSP ~ ₹380/bag (50kg), MOP ~ ₹1700/bag (50kg)
  const totalCostINR = (urea_bags * 266) + (ssp_bags * 380) + (mop_bags * 1700)

  const copyReceipt = () => {
    const text = `🌾 AGRO-AI SMART FERTILIZER DIRECTIVE
Crop: ${crop.name} (${crop.emoji}) | Growth Stage: ${stageInfo.name} (${stageInfo.emoji} - ${stageInfo.days})
Land Area: ${plotSize} ${unit} (${acres.toFixed(2)} Acres)
Soil Tests: N=${nVal.toFixed(0)}, P=${pVal.toFixed(0)}, K=${kVal.toFixed(0)} mg/kg, pH=${phVal.toFixed(1)}
Dynamic Target: N=${targetN}, P=${targetP}, K=${targetK} mg/kg

COMMERCIAL PROCUREMENT:
• Urea (46% N): ${urea_kg} kg (~${urea_bags} Bags of ${bagWeight}kg) [Cost: ₹${urea_bags * 266}]
• SSP (16% P): ${ssp_kg} kg (~${ssp_bags} Bags of 50kg) [Cost: ₹${ssp_bags * 380}]
• MOP (60% K): ${mop_kg} kg (~${mop_bags} Bags of 50kg) [Cost: ₹${mop_bags * 1700}]
${phAmendment ? `• pH Regulator: ${phAmendment}\n` : ''}
ESTIMATED MANDI PROCUREMENT COST: ₹${totalCostINR.toLocaleString('en-IN')}
`
    navigator.clipboard.writeText(text)
    setCopiedReceipt(true)
    setTimeout(() => setCopiedReceipt(false), 3000)
  }

  return (
    <article className="garden-card dosage-calculator-card" style={{ marginTop: '20px', textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <p className="garden-eyebrow">Interactive Agronomic Converter</p>
          <h2 style={{ margin: 0 }}>🧪 {t('fertilizerCalculatorTitle')}</h2>
        </div>
        <button
          type="button"
          onClick={copyReceipt}
          className="receipt-copy-btn"
          style={{
            background: copiedReceipt ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.15)',
            border: `1px solid ${copiedReceipt ? '#22c55e' : '#3b82f6'}`,
            color: copiedReceipt ? '#86efac' : '#93c5fd',
            borderRadius: '20px',
            padding: '6px 16px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {copiedReceipt ? t('copiedReceipt') : t('exportReceipt')}
        </button>
      </div>

      {/* Input Controls Bar */}
      <div className="dosage-controls-grid">
        {/* Crop Select */}
        <div className="dosage-control-item">
          <label>{t('selectedCrop')}</label>
          <select value={selectedCrop} onChange={e => setSelectedCrop(e.target.value)}>
            {Object.entries(CROP_PROFILES).map(([key, item]) => (
              <option key={key} value={key}>{item.emoji} {item.name}</option>
            ))}
          </select>
        </div>

        {/* Plot Size */}
        <div className="dosage-control-item">
          <label>{t('plotSize')}</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="500"
              value={plotSize}
              onChange={e => setPlotSize(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
            />
            <select value={unit} onChange={e => setUnit(e.target.value as 'acres' | 'hectares')}>
              <option value="acres">{t('acres')}</option>
              <option value="hectares">{t('hectares')}</option>
            </select>
          </div>
        </div>

        {/* Bag Size Toggle */}
        <div className="dosage-control-item">
          <label>{t('ureaBagSize')}</label>
          <select value={bagWeight} onChange={e => setBagWeight(Number(e.target.value))}>
            <option value={45}>45 kg (India Standard)</option>
            <option value={50}>50 kg (Commercial)</option>
          </select>
        </div>

        {/* Telemetry Sync Switch */}
        <div className="dosage-control-item">
          <label>{t('sensorMode')}</label>
          <button
            type="button"
            className="sync-toggle-btn"
            onClick={() => setAutoSync(!autoSync)}
            style={{
              background: autoSync ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              border: `1px solid ${autoSync ? '#10b981' : '#f59e0b'}`,
              color: autoSync ? '#34d399' : '#fbbf24',
              padding: '8px 12px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            {autoSync ? t('autoLiveTelemetry') : t('manualInputs')}
          </button>
        </div>
      </div>

      {/* Interactive Growth Stage Timeline Stepper */}
      <div className="crop-stage-stepper-container" style={{ margin: '20px 0', padding: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <label style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🌱</span> {t('cropStageTitle')}
          </label>
          <span style={{ fontSize: '12px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', padding: '3px 10px', borderRadius: '999px', fontWeight: 700 }}>
            N={targetN}, P={targetP}, K={targetK} mg/kg
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
          {Object.values(GROWTH_STAGES).map((stg) => {
            const isSelected = stage === stg.id
            const nameKey = `${stg.id}Stage` as any;
            const daysKey = `${stg.id}Days` as any;
            const focusKey = `${stg.id}Focus` as any;

            return (
              <button
                key={stg.id}
                type="button"
                onClick={() => setStage(stg.id)}
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: isSelected ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                  background: isSelected ? 'rgba(56, 189, 248, 0.14)' : 'rgba(255,255,255,0.02)',
                  boxShadow: isSelected ? '0 0 14px rgba(56, 189, 248, 0.25)' : 'none',
                  transition: 'all 0.2s ease',
                  color: '#fff'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '18px' }}>{stg.emoji}</span>
                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: '#cbd5e1', fontWeight: 600 }}>{t(daysKey) || stg.days}</span>
                </div>
                <strong style={{ fontSize: '13px', display: 'block', color: isSelected ? '#38bdf8' : '#f1f5f9' }}>{t(nameKey) || stg.name}</strong>
                <small style={{ fontSize: '11px', color: isSelected ? '#93c5fd' : '#94a3b8', display: 'block', marginTop: '3px' }}>{t(focusKey) || stg.focus}</small>
              </button>
            )
          })}
        </div>
        <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.08)', borderLeft: '4px solid #38bdf8', color: '#bae6fd', fontSize: '13px', lineHeight: '1.4' }}>
          💡 <strong>{t('stageGuidance')}:</strong> {stageInfo.desc}
        </div>
      </div>

      {/* Manual Override Sliders when autoSync is false */}
      {!autoSync && (
        <div className="manual-soil-sliders" style={{ margin: '16px 0', padding: '16px', borderRadius: '14px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#fbbf24', fontWeight: 700 }}>✏️ Manual Soil Test Overrides:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Nitrogen (N): <strong>{customN} mg/kg</strong></label>
              <input type="range" min="0" max="250" value={customN} onChange={e => setCustomN(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Phosphorus (P): <strong>{customP} mg/kg</strong></label>
              <input type="range" min="0" max="200" value={customP} onChange={e => setCustomP(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Potassium (K): <strong>{customK} mg/kg</strong></label>
              <input type="range" min="0" max="300" value={customK} onChange={e => setCustomK(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Soil pH: <strong>{customPh.toFixed(1)}</strong></label>
              <input type="range" min="4.0" max="9.0" step="0.1" value={customPh} onChange={e => setCustomPh(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      )}

      {/* Target Comparison Bar */}
      <div className="crop-target-info" style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 16px', borderRadius: '12px', margin: '16px 0', fontSize: '13px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <span>🎯 Target Soil Needs for <strong>{crop.emoji} {crop.name}</strong>:</span>
        <span style={{ color: '#94a3b8' }}>
          N: <strong style={{ color: '#fff' }}>{crop.targetN}</strong> | P: <strong style={{ color: '#fff' }}>{crop.targetP}</strong> | K: <strong style={{ color: '#fff' }}>{crop.targetK}</strong> mg/kg (pH <strong style={{ color: '#fff' }}>{crop.targetPh}</strong>)
        </span>
      </div>

      {/* Dosage Output Cards */}
      <div className="dosage-results-grid">
        {/* Urea Card */}
        <div className="dosage-card urea-card">
          <div className="dosage-card-header">
            <span>🌿 Nitrogen (N) Deficit: <strong>{defN > 0 ? `${defN.toFixed(0)} mg/kg` : 'Balanced'}</strong></span>
            <span className="fertilizer-name">UREA (46% N)</span>
          </div>
          <div className="dosage-amount-row">
            <span className="dosage-kg">{urea_kg} <small>kg</small></span>
            <span className="dosage-bags">{urea_bags} <small>Bags ({bagWeight}kg)</small></span>
          </div>
          <p className="dosage-cost-estimate">Est. Subsidized Cost: <strong>₹{(urea_bags * 266).toLocaleString('en-IN')}</strong></p>
        </div>

        {/* SSP Card */}
        <div className="dosage-card ssp-card">
          <div className="dosage-card-header">
            <span>🦴 Phosphorus (P) Deficit: <strong>{defP > 0 ? `${defP.toFixed(0)} mg/kg` : 'Balanced'}</strong></span>
            <span className="fertilizer-name">SSP (16% P₂O₅)</span>
          </div>
          <div className="dosage-amount-row">
            <span className="dosage-kg">{ssp_kg} <small>kg</small></span>
            <span className="dosage-bags">{ssp_bags} <small>Bags (50kg)</small></span>
          </div>
          <p className="dosage-cost-estimate">Est. Subsidized Cost: <strong>₹{(ssp_bags * 380).toLocaleString('en-IN')}</strong></p>
        </div>

        {/* MOP Card */}
        <div className="dosage-card mop-card">
          <div className="dosage-card-header">
            <span>🛡️ Potassium (K) Deficit: <strong>{defK > 0 ? `${defK.toFixed(0)} mg/kg` : 'Balanced'}</strong></span>
            <span className="fertilizer-name">MOP (60% K₂O)</span>
          </div>
          <div className="dosage-amount-row">
            <span className="dosage-kg">{mop_kg} <small>kg</small></span>
            <span className="dosage-bags">{mop_bags} <small>Bags (50kg)</small></span>
          </div>
          <p className="dosage-cost-estimate">Est. Subsidized Cost: <strong>₹{(mop_bags * 1700).toLocaleString('en-IN')}</strong></p>
        </div>
      </div>

      {/* pH Regulator Alert if needed */}
      {phAmendment && (
        <div className="ph-amendment-box" style={{ marginTop: '16px', padding: '14px', borderRadius: '12px', background: phVal < 6.0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(234, 179, 8, 0.1)', border: `1px solid ${phVal < 6.0 ? '#ef4444' : '#eab308'}`, color: '#fff', fontSize: '13px' }}>
          🧪 <strong>Soil pH Regulator Required:</strong> {phAmendment}
        </div>
      )}

      {/* Application Timeline & Total Cost Bar */}
      <div className="application-timeline-footer" style={{ marginTop: '20px', padding: '16px', borderRadius: '14px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#e2e8f0' }}>🗓️ Recommended Field Spraying Schedule:</h4>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6' }}>
            <li><strong>Basal Application (Sowing Time):</strong> Apply 100% of SSP ({ssp_kg}kg) + 50% MOP ({(mop_kg/2).toFixed(1)}kg) + 30% Urea ({(urea_kg*0.3).toFixed(1)}kg).</li>
            <li><strong>First Top Dressing (30 Days):</strong> Broadcast 40% Urea ({(urea_kg*0.4).toFixed(1)}kg) + remaining 50% MOP.</li>
            <li><strong>Second Top Dressing (55 Days):</strong> Broadcast final 30% Urea ({(urea_kg*0.3).toFixed(1)}kg) before flowering.</li>
          </ul>
        </div>
        <div style={{ textAlign: 'right', background: 'rgba(16, 185, 129, 0.12)', padding: '12px 20px', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>Total Estimated Input Cost</span>
          <strong style={{ fontSize: '22px', color: '#34d399' }}>₹{totalCostINR.toLocaleString('en-IN')}</strong>
        </div>
      </div>
    </article>
  )
}

function CircularProgress({ percentage, color, icon }: { percentage: number, color: string, icon: string }) {
  const radius = 22
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference
  return (
    <div style={{ position: 'relative', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="56" height="56" style={{ transform: 'rotate(-90deg)' }} className="gauge-svg">
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="3.5"
        />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth="3.5"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
        />
      </svg>
      <span style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '15px',
        color: color
      }}>
        {icon}
      </span>
    </div>
  )
}



const MOCK_HISTORICAL_ALERTS = [
  {
    id: "hist-1",
    type: "dry_run_protection",
    severity: "danger",
    message: "🚫 Pump Dry-Run Protection Triggered: Water source levels fell below critical 10%. Motor stopped automatically to prevent burn-out.",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    resolved: true,
    resolvedAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    restoreMessage: "✅ Water source replenished. Pump restored to standby mode.",
    channel: "System Control",
    category: "critical"
  },
  {
    id: "hist-2",
    type: "sms_alert_dispatch",
    severity: "warning",
    message: "💬 WhatsApp Warning Dispatched: Alerting supervisor of critical moisture drop (22% moisture) in Zone B.",
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    resolved: false,
    channel: "WhatsApp Client",
    category: "communications"
  },
  {
    id: "hist-3",
    type: "weather_hazard_sms",
    severity: "danger",
    message: "⛈️ SMS Storm Alert Sent: Severe thunder and high humidity warnings detected. Drip lines paused to prevent soil wash-out.",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    resolved: false,
    channel: "SMS Gateway",
    category: "weather"
  },
  {
    id: "hist-4",
    type: "low_potassium",
    severity: "warning",
    message: "⚠️ Soil Nutrient Depletion: Low potassium levels detected in Zone C (120 ppm, optimal: 150-250 ppm). Recommending potash amendment.",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    resolved: true,
    resolvedAt: new Date(Date.now() - 3600000 * 22).toISOString(),
    restoreMessage: "✅ Potassium levels restored following organic potash application.",
    channel: "System Control",
    category: "restored"
  },
  {
    id: "hist-5",
    type: "critical_heatwave",
    severity: "danger",
    message: "🔥 Temperature Alert: Ambient field sensor logged 42.4°C. Automating secondary misting valves to cool canopy.",
    createdAt: new Date(Date.now() - 3600000 * 36).toISOString(),
    resolved: true,
    resolvedAt: new Date(Date.now() - 3600000 * 35).toISOString(),
    restoreMessage: "✅ Air temperature returned to 32.1°C.",
    channel: "Weather Alert System",
    category: "weather"
  }
]

function Notifications({
  alerts,
  settings,
  onSaveSettings,
  onTestNotifications,
  onDeleteAlert,
  onClearAllAlerts,
  busy
}: {
  alerts: any[]
  settings: NotificationSettings | null
  onSaveSettings: (settings: NotificationSettings) => Promise<void>
  onTestNotifications: () => Promise<void>
  onDeleteAlert: (alertId: string) => Promise<void>
  onClearAllAlerts: () => Promise<void>
  busy: boolean
}) {
  const [telegramEnabled, setTelegramEnabled] = useState(true)
  const [npkEnabled, setNpkEnabled] = useState(true)
  const [moistureThresh, setMoistureThresh] = useState(30)
  const [waterThresh, setWaterThresh] = useState(15)

  // Filter & Delete tracking for custom audit log
  const [alertFilter, setAlertFilter] = useState<'all' | 'critical' | 'restored' | 'weather' | 'communications'>('all')
  const [hiddenMockIds, setHiddenMockIds] = useState<string[]>([])

  useEffect(() => {
    if (settings) {
      setTelegramEnabled(settings.telegram_notifications_enabled)
      setNpkEnabled(settings.npk_alerts_enabled)
      setMoistureThresh(Math.round(settings.soil_moisture_threshold))
      setWaterThresh(Math.round(settings.water_level_threshold))
    }
  }, [settings])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    void onSaveSettings({
      telegram_notifications_enabled: telegramEnabled,
      npk_alerts_enabled: npkEnabled,
      soil_moisture_threshold: moistureThresh,
      water_level_threshold: waterThresh
    })
  }

  const handleDelete = async (alertId: string) => {
    if (alertId.startsWith('hist-')) {
      setHiddenMockIds(prev => [...prev, alertId])
    } else {
      await onDeleteAlert(alertId)
    }
  }

  const handleClearAll = async () => {
    setHiddenMockIds(MOCK_HISTORICAL_ALERTS.map(h => h.id))
    await onClearAllAlerts()
  }

  const combinedAlerts = useMemo(() => {
    const liveMapped = alerts.map((a: any) => {
      let category = 'critical'
      let channel = 'System Control'
      if (a.resolved) {
        category = 'restored'
      } else if (a.type?.includes('weather') || a.message?.toLowerCase().includes('weather') || a.message?.toLowerCase().includes('rain') || a.message?.toLowerCase().includes('temp')) {
        category = 'weather'
        channel = 'Weather Alert System'
      } else if (a.type?.includes('sms') || a.type?.includes('whatsapp')) {
        category = 'communications'
        channel = a.type?.includes('sms') ? 'SMS Gateway' : 'WhatsApp Client'
      }
      return {
        ...a,
        category,
        channel
      }
    })

    const visibleMock = MOCK_HISTORICAL_ALERTS.filter(h => !hiddenMockIds.includes(h.id))
    const all = [...liveMapped, ...visibleMock]
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [alerts, hiddenMockIds])

  const filteredAlerts = useMemo(() => {
    if (alertFilter === 'all') return combinedAlerts
    return combinedAlerts.filter(a => a.category === alertFilter)
  }, [combinedAlerts, alertFilter])

  return (
    <div className="garden-notifications-container animate-popup">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', textAlign: 'left' }}>
        
        {/* Left Side: Real-time Alerts Log */}
        <article className="garden-card notifications-log-card" style={{ padding: '24px' }}>
          <p className="garden-eyebrow">Real-time System Audit Feed</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '20px' }}>🔔 Alert Center & Event Timeline</h2>
            {combinedAlerts.length > 0 && (
              <button className="clear-all-btn" onClick={() => void handleClearAll()} title="Delete all notifications">
                🗑️ Delete All Notifications
              </button>
            )}
          </div>

          {/* Filter Tags Row */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {[
              { id: 'all', label: 'All Logs', emoji: '📋', bg: '#10b981' },
              { id: 'critical', label: 'Critical', emoji: '🚨', bg: '#ef4444' },
              { id: 'restored', label: 'Restored', emoji: '🟢', bg: '#22c55e' },
              { id: 'weather', label: 'Weather', emoji: '⛈️', bg: '#0284c7' },
              { id: 'communications', label: 'Dispatched', emoji: '💬', bg: '#8b5cf6' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAlertFilter(tab.id as any)}
                style={{
                  background: alertFilter === tab.id ? tab.bg : 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '5px 12px',
                  fontSize: '11px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="alerts-scroller" style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
            {filteredAlerts.length === 0 ? (
              <div className="no-alerts-notice" style={{ padding: '30px 20px', textAlign: 'center' }}>
                <span className="clean-shield-icon" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>🛡️</span>
                <strong style={{ display: 'block', color: '#fff', fontSize: '14px' }}>No Event Records Found</strong>
                <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '12px' }}>All systems secure in this filter category.</p>
              </div>
            ) : (
              <div className="alerts-list" style={{ position: 'relative', paddingLeft: '18px', borderLeft: '1.5px dashed rgba(255, 255, 255, 0.12)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {filteredAlerts.map(alert => {
                  const isResolved = alert.resolved;
                  const dotColor = isResolved ? '#22c55e' : '#ef4444';
                  const chanBg = alert.category === 'communications' ? '#8b5cf6' : alert.category === 'weather' ? '#0284c7' : isResolved ? '#22c55e' : '#ef4444';

                  return (
                    <div 
                      key={alert.id} 
                      className={`alert-item ${isResolved ? 'alert-resolved' : 'alert-active'}`}
                      style={{
                        position: 'relative',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      {/* Timeline Dot */}
                      <div style={{
                        position: 'absolute',
                        left: '-24px',
                        top: '18px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: dotColor,
                        border: '2.5px solid #0f172a',
                        boxShadow: `0 0 6px ${dotColor}`,
                        zIndex: 2
                      }} />

                      {/* Header Channel & Meta info */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span style={{ 
                          fontSize: '9.5px', 
                          fontWeight: 800, 
                          color: chanBg, 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {alert.category === 'communications' ? '💬 ' : alert.category === 'weather' ? '⛈️ ' : '⚙️ '}
                          {alert.channel || 'System Auto'}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ 
                            fontSize: '9.5px', 
                            background: isResolved ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
                            color: isResolved ? '#4ade80' : '#f87171', 
                            padding: '1px 5px', 
                            borderRadius: '4px', 
                            fontWeight: 700 
                          }}>
                            {isResolved ? 'Restored' : 'Critical'}
                          </span>
                          <button 
                            type="button"
                            className="delete-alert-btn" 
                            onClick={() => void handleDelete(alert.id)}
                            style={{ 
                              background: 'transparent', 
                              border: 'none', 
                              color: '#94a3b8', 
                              cursor: 'pointer',
                              fontSize: '11px',
                              padding: '2px'
                            }}
                            title="Delete log entry"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Message Content */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <strong style={{ fontSize: '12px', color: '#fff', fontWeight: 600, lineHeight: '1.4' }}>
                          {alert.message}
                        </strong>
                        {isResolved && alert.restoreMessage && (
                          <p style={{ margin: 0, fontSize: '11px', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>✓</span> {alert.restoreMessage}
                          </p>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '4px', marginTop: '2px' }}>
                        <span>Logged: {new Date(alert.createdAt).toLocaleString()}</span>
                        {isResolved && alert.resolvedAt && (
                          <span>Resolved: {new Date(alert.resolvedAt).toLocaleTimeString()}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </article>

        {/* Right Side: Notification Control Panel */}
        <article className="garden-card settings-card" style={{ padding: '24px' }}>
          <p className="garden-eyebrow">Smart Gateway Settings</p>
          <h2 style={{ margin: 0, fontSize: '20px', marginBottom: '16px' }}>⚙️ Threshold & Alert Configuration</h2>
          
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div className="toggle-setting">
              <div>
                <strong>Telegram Push Notifications</strong>
                <span>Direct mobile notifications when offline</span>
              </div>
              <input 
                type="checkbox" 
                checked={telegramEnabled} 
                onChange={e => setTelegramEnabled(e.target.checked)} 
                className="ios-switch"
              />
            </div>

            <div className="toggle-setting">
              <div>
                <strong>NPK & pH Nutrient Warnings</strong>
                <span>Log alerts for abnormal soil composition</span>
              </div>
              <input 
                type="checkbox" 
                checked={npkEnabled} 
                onChange={e => setNpkEnabled(e.target.checked)} 
                className="ios-switch"
              />
            </div>

            <div className="slider-setting">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <strong>Moisture Trigger Threshold</strong>
                <span className="slider-value">{moistureThresh}%</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="80" 
                value={moistureThresh} 
                onChange={e => setMoistureThresh(Number(e.target.value))} 
              />
              <span className="slider-hint">Triggers an alert if soil moisture drops below this value.</span>
            </div>

            <div className="slider-setting">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <strong>Low Water Level Threshold</strong>
                <span className="slider-value">{waterThresh}%</span>
              </div>
              <input 
                type="range" 
                min="5" 
                max="50" 
                value={waterThresh} 
                onChange={e => setWaterThresh(Number(e.target.value))} 
              />
              <span className="slider-hint">Triggers an alert if reservoir tank drops below this value.</span>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button 
                type="submit" 
                disabled={busy} 
                className="neon-btn-submit" 
                style={{ flex: 1 }}
              >
                {busy ? 'Saving...' : 'Save Configuration'}
              </button>
              
              <button 
                type="button" 
                onClick={() => void onTestNotifications()} 
                disabled={busy || !telegramEnabled} 
                className="test-btn"
              >
                ⚡ Test Telegram
              </button>
            </div>

          </form>
        </article>

      </div>
    </div>
  )
}
