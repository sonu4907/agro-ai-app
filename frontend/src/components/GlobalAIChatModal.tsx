import { useState, useEffect, useRef } from 'react';
import { getApiUrl } from '../services/apiConfig';
import './GlobalAIChatModal.css';

interface GlobalAIChatModalProps {
  language: string;
  scanContext?: string;
  telemetryContext?: any;
}

export default function GlobalAIChatModal({
  language: initialLanguage,
  scanContext = '',
  telemetryContext
}: GlobalAIChatModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState(initialLanguage || 'english');
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; time: string }>>([
    {
      sender: 'assistant',
      text: language === 'hindi'
        ? 'नमस्ते किसान भाई! मैं आपका एआई कृषक मित्र हूँ। आप मुझसे सिंचाई, खाद की मात्रा, मंडी भाव, या फसल रोगों के बारे में कुछ भी पूछ सकते हैं। 🌾🤖'
        : language === 'marathi'
        ? 'नमस्कार शेतकरी मित्रा! मी तुमचा एआय कृषक मित्र आहे. तुम्ही मला सिंचन, खताचे प्रमाण, बाजार भाव किंवा पिकांच्या रोगांबद्दल काहीही विचारू शकता. 🌾🤖'
        : 'Greetings Farmer! I am your AgroAI Krishak Mitra. Ask me anything about irrigation, fertilizer dosage, mandi rates, pump control, or plant disease treatments! 🌾🤖',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Keep internal language in sync with parent if updated
  useEffect(() => {
    if (initialLanguage) {
      setLanguage(initialLanguage);
    }
  }, [initialLanguage]);

  // Web Speech STT Recognition
  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported on this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'hindi' ? 'hi-IN' : language === 'marathi' ? 'mr-IN' : 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        setInputMessage(transcript);
        sendMessage(transcript);
      }
    };

    recognition.start();
  };

  // Web Speech TTS Synthesis
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Clean emojis for clean TTS
    const cleanText = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = language === 'hindi' ? 'hi-IN' : language === 'marathi' ? 'mr-IN' : 'en-US';

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || loading) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'user' as const, text: query, time: timeStr };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setLoading(true);

    try {
      // Build App Context (Scan result + Telemetry + Weather)
      let combinedContext = scanContext ? `CURRENT SCAN DIAGNOSIS: ${scanContext}\n` : '';
      if (telemetryContext) {
        combinedContext += `LIVE FARM TELEMETRY: Soil Moisture: ${telemetryContext.soil_moisture || 25}%, Temp: ${telemetryContext.temperature || 28}°C, Water Level: ${telemetryContext.water_level || 80}%\n`;
      }

      const formData = new FormData();
      formData.append('message', query);
      formData.append('language', language);
      formData.append('history', JSON.stringify(messages.slice(-6).map(m => ({ role: m.sender, content: m.text }))));
      formData.append('scan_context', combinedContext);

      let data: any = null;
      try {
        const res = await fetch(getApiUrl('/api/v1/chat'), { method: 'POST', body: formData });
        if (res.ok) {
          data = await res.json();
        }
      } catch (err) {
        console.error("Chat API request failed", err);
      }

      if (data && data.reply) {
        const aiMsg = { sender: 'assistant' as const, text: data.reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        let fallbackText = '';
        const qLower = query.toLowerCase();
        if (qLower.includes('water') || qLower.includes('पानी') || qLower.includes('पाणी') || qLower.includes('pump')) {
          fallbackText = language === 'hindi'
            ? '💧 सिंचाई सलाह: मृदा नमी 25% है। शाम के समय 15 मिनट ड्रिप सिंचाई चालू करने की सलाह दी जाती है।'
            : language === 'marathi'
            ? '💧 सिंचन सल्ला: मातीतील ओलावा २५% आहे. संध्याकाळी १५ मिनिटे ठिबक सिंचन सुरू करण्याचा सल्ला दिला जातो.'
            : '💧 Irrigation Advice: Soil moisture is at 25%. A 15-minute drip cycle is recommended in the evening.';
        } else if (qLower.includes('fertilizer') || qLower.includes('खाद') || qLower.includes('खत') || qLower.includes('urea')) {
          fallbackText = language === 'hindi'
            ? '🧪 उर्वरक गाइड: प्रति एकड़ 50 किग्रा यूरिया और 25 किग्रा डीएपी (DAP) का उपयोग करें।'
            : language === 'marathi'
            ? '🧪 खत मार्गदर्शक: प्रति एकर ५० किग्रॅ युरिया आणि २५ किग्रॅ डीएपी वापरा.'
            : '🧪 Fertilizer Guide: Recommended dosage is 50 kg Urea and 25 kg DAP per acre.';
        } else {
          fallbackText = language === 'hindi'
            ? '🌾 कृषक सलाह: आपकी फसल की सुरक्षा के लिए नियमित निगरानी और नीम तेल 5ml/लीटर का छिड़काव करें।'
            : language === 'marathi'
            ? '🌾 शेतकरी सल्ला: पिकाच्या संरक्षणासाठी नियमित पाहणी करा आणि कडुनिंब तेल ५ml/लीटर फवारा.'
            : '🌾 Farmer Advisory: Monitor leaf health daily and apply 5ml/L Neem Oil spray for pest prevention.';
        }

        const aiMsg = { sender: 'assistant' as const, text: fallbackText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (e: any) {
      console.error('Chat error:', e);
    } finally {
      setLoading(false);
    }
  };

  const QUICK_PROMPTS = [
    { label: language === 'hindi' ? '💧 क्या आज पौधों को पानी देना चाहिए?' : language === 'marathi' ? '💧 आज पिकांना पाणी द्यावे का?' : '💧 Should I water plants today?' },
    { label: language === 'hindi' ? '🧪 2 एकड़ टमाटर के लिए खाद का हिसाब बताओ' : language === 'marathi' ? '🧪 2 एकर टोमॅटोसाठी खताचे प्रमाण सांगा' : '🧪 Calculate fertilizer for 2 acres tomato' },
    { label: language === 'hindi' ? '📊 पुणे में गेहूं का मंडी भाव बताओ' : language === 'marathi' ? '📊 पुण्यात गव्हाचा बाजार भाव सांगा' : '📊 Show me wheat rates in Pune' },
    { label: language === 'hindi' ? '⚡ 10 मिनट के लिए पंप चालू करो' : language === 'marathi' ? '⚡ 10 मिनिटांसाठी पंप सुरू करा' : '⚡ Turn on pump for 10 minutes' }
  ];

  return (
    <>
      {/* ── FLOATING POP-UP CHAT BUTTON (FAB) ── */}
      <button
        type="button"
        className={`global-chat-fab ${isOpen ? 'fab-active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Open AI Farmer Assistant"
      >
        <div className="fab-glow-ring" />
        <span className="fab-icon">{isOpen ? '✖' : '🤖'}</span>
        {!isOpen && <span className="fab-badge">AI Assistant</span>}
      </button>

      {/* ── POP-UP CHAT ASSISTANT WINDOW ── */}
      {isOpen && (
        <div className="global-chat-window animate-popup">
          {/* Header */}
          <div className="gc-header">
            <div className="gc-header-info">
              <div className="gc-avatar">🤖</div>
              <div>
                <h3 className="gc-title">Krishak Mitra AI</h3>
                <span className="gc-status">🟢 Action-Executing Agent</span>
              </div>
            </div>

            <div className="gc-header-controls">
              {/* Language Switcher */}
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="gc-lang-select"
              >
                <option value="english">🇬🇧 English</option>
                <option value="hindi">🇮🇳 हिन्दी</option>
                <option value="marathi">🌾 मराठी</option>
              </select>

              <button type="button" className="gc-close-btn" onClick={() => setIsOpen(false)}>
                ✖
              </button>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          <div className="gc-prompts-bar">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                className="gc-prompt-chip"
                onClick={() => sendMessage(prompt.label)}
              >
                {prompt.label}
              </button>
            ))}
          </div>

          {/* Chat Messages Body */}
          <div className="gc-messages-body">
            {messages.map((msg, index) => (
              <div key={index} className={`gc-message-wrapper gc-${msg.sender}`}>
                <div className="gc-message-bubble">
                  <div className="gc-message-text">{msg.text}</div>
                  <div className="gc-message-meta">
                    <span>{msg.time}</span>
                    {msg.sender === 'assistant' && (
                      <button
                        type="button"
                        className={`gc-speak-btn ${isSpeaking ? 'speaking' : ''}`}
                        onClick={() => speakText(msg.text)}
                        title="Listen to advice"
                      >
                        🔊
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="gc-message-wrapper gc-assistant">
                <div className="gc-message-bubble gc-loading-bubble">
                  <span className="gc-typing-dots">
                    <span />
                    <span />
                    <span />
                  </span>
                  <span style={{ fontSize: '12px', color: '#7dd3fc', marginLeft: '8px' }}>
                    AgroAI Agent reasoning...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="gc-input-footer"
          >
            <button
              type="button"
              className={`gc-mic-btn ${isListening ? 'listening' : ''}`}
              onClick={handleVoiceInput}
              title="Voice Input (Hindi / Marathi / English)"
            >
              🎤
            </button>

            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                language === 'hindi'
                  ? 'अपना सवाल लिखें या पूछें...'
                  : language === 'marathi'
                  ? 'तुमचा प्रश्न विचारा...'
                  : 'Ask your farming question or command...'
              }
              className="gc-input-field"
            />

            <button type="submit" className="gc-send-btn" disabled={!inputMessage.trim() || loading}>
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}
