import { useState } from 'react'

interface VoiceAssistantModalProps {
  open: boolean
  onClose: () => void
}

export default function VoiceAssistantModal({ open, onClose }: VoiceAssistantModalProps) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [aiResponse, setAiResponse] = useState<string | null>(null)

  if (!open) return null

  const handleStartListening = () => {
    setListening(true)
    setTranscript('Listening in Hindi / English / Marathi...')
    setAiResponse(null)

    setTimeout(() => {
      setListening(false)
      setTranscript('"टमाटर की बीमारी का इलाज क्या है?"')
      setAiResponse('टमाटर में अर्ली ब्लाइट की रोकथाम के लिए मैंकोज़ेब 75% WP @ 2 ग्राम प्रति लीटर पानी में मिलाकर छिड़काव करें।')

      // Text to speech
      if ('speechSynthesis' in window) {
        const synth = window.speechSynthesis
        const utter = new SpeechSynthesisUtterance('टमाटर में अर्ली ब्लाइट की रोकथाम के लिए मैंकोज़ेब 75 प्रतिशत डब्ल्यू पी का छिड़काव करें।')
        utter.lang = 'hi-IN'
        synth.speak(utter)
      }
    }, 2500)
  }

  return (
    <div className="sh-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="sh-detail-modal" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '520px', 
          width: 'calc(100vw - 24px)', 
          background: 'rgba(12, 6, 24, 0.95)',
          border: '1.5px solid #a855f7',
          boxShadow: '0 0 30px rgba(168, 85, 247, 0.35)',
          borderRadius: '24px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '20px',
          textAlign: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>🗣️</span>
            <div style={{ textAlign: 'left' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>Hands-Free Voice Assistant</h2>
              <p style={{ fontSize: '12px', color: '#c084fc', margin: 0 }}>Multilingual Voice Commands</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', borderRadius: '10px', width: '32px', height: '32px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Pulse Microphone Button */}
        <div style={{ padding: '24px 0' }}>
          <button
            onClick={handleStartListening}
            style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              background: listening ? 'radial-gradient(circle, #ef4444, #b91c1c)' : 'linear-gradient(135deg, #a855f7, #6366f1)',
              border: '4px solid rgba(255,255,255,0.2)',
              boxShadow: listening ? '0 0 30px #ef4444' : '0 0 25px rgba(168,85,247,0.5)',
              color: '#fff',
              fontSize: '36px',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            🎙️
          </button>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '12px', fontWeight: 700 }}>
            {listening ? '🔴 Listening... Speak Now' : 'Tap Microphone to Speak'}
          </p>
        </div>

        {/* Transcript Box */}
        {transcript && (
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px', fontSize: '13px', color: '#fff', fontStyle: 'italic', marginBottom: '12px' }}>
            {transcript}
          </div>
        )}

        {/* AI Response Output */}
        {aiResponse && (
          <div style={{ background: 'rgba(168, 85, 247, 0.12)', border: '1.5px solid rgba(168, 85, 247, 0.4)', borderRadius: '14px', padding: '14px', textAlign: 'left' }}>
            <span style={{ fontSize: '11px', fontWeight: 900, color: '#c084fc', display: 'block', marginBottom: '4px' }}>🔊 AI SPOKEN ANSWER</span>
            <p style={{ fontSize: '13px', color: '#fff', margin: 0, lineHeight: 1.5 }}>{aiResponse}</p>
          </div>
        )}
      </div>
    </div>
  )
}
