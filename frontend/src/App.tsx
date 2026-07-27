import React, { useState, useRef, useEffect, useCallback } from 'react'
import './App.css'
import WeatherPanel from './components/WeatherPanel'
import ScanHistory from './components/ScanHistory'
import ARScanner from './components/ARScanner'
import GovernmentSchemes from './components/GovernmentSchemes'
import RecoveryTracker from './components/RecoveryTracker'
import GardenDashboard from './components/GardenDashboard'
import CropRotation from './components/CropRotation'
import PresentationDeck from './components/PresentationDeck'
import MarketPrices from './components/MarketPrices'
import GlobalAIChatModal from './components/GlobalAIChatModal'
import FertilizerCalculatorModal from './components/FertilizerCalculatorModal'
import SoilCardScannerModal from './components/SoilCardScannerModal'
import OutbreakRadarModal from './components/OutbreakRadarModal'
import NDVIMapModal from './components/NDVIMapModal'
import FarmLedgerModal from './components/FarmLedgerModal'
import IrrigationSchedulerModal from './components/IrrigationSchedulerModal'
import VoiceAssistantModal from './components/VoiceAssistantModal'
import { addScanRecord, buildThumbnail, getScanHistory } from './historyService'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import { useAuth } from "./context/AuthContext";
import { useLanguage, LanguageSelector } from "./context/LanguageContext";
import { saveScan } from './scanService'
import { generatePDFDocument, getTextReportForSharing, sharePDFReport } from './services/reportService'
import { addPendingScan, getPendingScans, removePendingScan } from './services/offlineQueueService'
import { getApiUrl } from './services/apiConfig'

/* ── Interfaces ─────────────────────────────────────────── */
interface PlantInfo {
  common_name: string
  scientific_name: string
  family: string
  crop_type: string
  growth_stage: string
}
interface HealthInfo {
  is_healthy: boolean
  confidence: number
  severity: string
  disease: string
}
interface DiseaseInfo {
  description: string
  causes: string[]
  symptoms: string[]
  affected_parts: string[]
  spread_method: string
}
interface TreatmentInfo {
  organic: string[]
  chemical: string[]
  fertilizer: string[]
  watering: string
  soil: string
  sunlight: string
  temperature: string
}
interface AgroAIResponse {
  success: boolean
  plant?: PlantInfo
  health?: HealthInfo
  disease_information?: DiseaseInfo
  treatment?: TreatmentInfo
  prevention?: string[]
  farmer_advice?: string[]
  recommendation?: string
  disclaimer?: string
  error?: string
}

/* ── Constants ──────────────────────────────────────────── */
const LOADING_STEPS = [
  { text: "Uploading image to AgroAI...", emoji: "📤" },
  { text: "Analyzing leaf structure and color variance...", emoji: "🔬" },
  { text: "Detecting lesions, spots, or abnormal growth...", emoji: "🧫" },
  { text: "Consulting the agricultural disease database...", emoji: "📚" },
  { text: "Formulating organic & chemical treatment advice...", emoji: "💊" },
]
const LANGUAGES = [
  { code: "english", flag: "🇬🇧", native: "English" },
  { code: "hindi",   flag: "🇮🇳", native: "हिन्दी" },
  { code: "marathi", flag: "🌾",  native: "मराठी" },
  { code: "telugu",  flag: "🌾",  native: "తెలుగు" },
  { code: "gujarati",flag: "🌾",  native: "ગુજરાતી" },
  { code: "punjabi", flag: "🌾",  native: "ਪੰਜਾਬੀ" },
  { code: "tamil",   flag: "🌾",  native: "தமிழ்" },
  { code: "kannada", flag: "🌾",  native: "ಕನ್ನಡ" },
  { code: "bengali", flag: "🌾",  native: "বাংলা" },
]
type InputMode = "upload" | "camera"

/* ════════════════════════════════════════════════════════ */
export default function App() {
  const {
    user,
    loading: authLoading,
    logout,
    loginAsDemo
  } = useAuth();

  const { language: activeLang, setLanguage: setActiveLang } = useLanguage();

  /* ── State ── */
  const [image, setImage]           = useState<File | null>(null)
  const [preview, setPreview]       = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [copied, setCopied]                 = useState(false)
  const [pdfGenerating, setPdfGenerating]   = useState(false)
  const [loading, setLoading]       = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [result, setResult]         = useState<AgroAIResponse | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [language, setLanguage]     = useState("english")

  // Keep local language state in sync with global activeLang
  useEffect(() => {
    const mapping: Record<string, string> = {
      en: 'english',
      hi: 'hindi',
      mr: 'marathi',
      te: 'telugu',
      gu: 'gujarati',
      pa: 'punjabi',
      ta: 'tamil',
      kn: 'kannada',
      bn: 'bengali',
    };
    setLanguage(mapping[activeLang] || 'english');
  }, [activeLang]);

  const handleLanguageChange = (code: string) => {
    const mapping: Record<string, string> = {
      english: 'en',
      hindi: 'hi',
      marathi: 'mr',
      telugu: 'te',
      gujarati: 'gu',
      punjabi: 'pa',
      tamil: 'ta',
      kannada: 'kn',
      bengali: 'bn',
    };
    const globalCode = mapping[code] || 'en';
    setActiveLang(globalCode);
    setLanguage(code);
  };

  const [inputMode, setInputMode]   = useState<InputMode>("upload")
  const [lowBandwidthMode, setLowBandwidthMode] = useState<boolean>(() => {
    return localStorage.getItem("low_bandwidth_mode") === "true"
  })
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: string
    compressedSize: string
    savingPercentage: string
  } | null>(null)

  /* App Theme State */
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('agro_app_theme')
    if (!saved || saved === 'dark-slate') {
      localStorage.setItem('agro_app_theme', 'claymorphism')
      return 'claymorphism'
    }
    return saved
  })

  useEffect(() => {
    localStorage.setItem('agro_app_theme', theme)
    const root = document.documentElement
    root.className = `theme-${theme}`
    
    if (theme === 'skeuomorphism') {
      root.style.setProperty('--app-bg', '#1a1c1e')
      root.style.setProperty('--blob-1-start', '#64748b')
      root.style.setProperty('--blob-1-end', '#334155')
      root.style.setProperty('--blob-2-start', '#22c55e')
      root.style.setProperty('--blob-2-end', '#15803d')
      root.style.setProperty('--blob-3-start', '#38bdf8')
      root.style.setProperty('--blob-3-end', '#0369a1')
    } else if (theme === 'claymorphism') {
      root.style.setProperty('--app-bg', '#22140d')
      root.style.setProperty('--blob-1-start', '#ff8c66')
      root.style.setProperty('--blob-1-end', '#ea580c')
      root.style.setProperty('--blob-2-start', '#4ade80')
      root.style.setProperty('--blob-2-end', '#16a34a')
      root.style.setProperty('--blob-3-start', '#38bdf8')
      root.style.setProperty('--blob-3-end', '#0284c7')
    } else if (theme === 'forest-green') {
      root.style.setProperty('--app-bg', '#04160e')
      root.style.setProperty('--blob-1-start', '#10b981')
      root.style.setProperty('--blob-1-end', '#059669')
      root.style.setProperty('--blob-2-start', '#84cc16')
      root.style.setProperty('--blob-2-end', '#16a34a')
      root.style.setProperty('--blob-3-start', '#06b6d4')
      root.style.setProperty('--blob-3-end', '#0f766e')
    } else if (theme === 'warm-clay') {
      root.style.setProperty('--app-bg', '#1a0d06')
      root.style.setProperty('--blob-1-start', '#f97316')
      root.style.setProperty('--blob-1-end', '#ea580c')
      root.style.setProperty('--blob-2-start', '#eab308')
      root.style.setProperty('--blob-2-end', '#d97706')
      root.style.setProperty('--blob-3-start', '#ec4899')
      root.style.setProperty('--blob-3-end', '#be185d')
    } else if (theme === 'deep-ocean') {
      root.style.setProperty('--app-bg', '#020e24')
      root.style.setProperty('--blob-1-start', '#3b82f6')
      root.style.setProperty('--blob-1-end', '#1d4ed8')
      root.style.setProperty('--blob-2-start', '#06b6d4')
      root.style.setProperty('--blob-2-end', '#0891b2')
      root.style.setProperty('--blob-3-start', '#6366f1')
      root.style.setProperty('--blob-3-end', '#4f46e5')
    } else if (theme === 'carbon-gray') {
      root.style.setProperty('--app-bg', '#121214')
      root.style.setProperty('--blob-1-start', '#52525b')
      root.style.setProperty('--blob-1-end', '#3f3f46')
      root.style.setProperty('--blob-2-start', '#71717a')
      root.style.setProperty('--blob-2-end', '#27272a')
      root.style.setProperty('--blob-3-start', '#a1a1aa')
      root.style.setProperty('--blob-3-end', '#18181b')
    } else if (theme === 'midnight-navy') {
      root.style.setProperty('--app-bg', '#0b132b')
      root.style.setProperty('--blob-1-start', '#1c2541')
      root.style.setProperty('--blob-1-end', '#0b132b')
      root.style.setProperty('--blob-2-start', '#3a506b')
      root.style.setProperty('--blob-2-end', '#1c2541')
      root.style.setProperty('--blob-3-start', '#5bc0be')
      root.style.setProperty('--blob-3-end', '#3a506b')
    } else if (theme === 'cyber-purple') {
      root.style.setProperty('--app-bg', '#140526')
      root.style.setProperty('--blob-1-start', '#bd00ff')
      root.style.setProperty('--blob-1-end', '#8a2be2')
      root.style.setProperty('--blob-2-start', '#ff007f')
      root.style.setProperty('--blob-2-end', '#9d00ff')
      root.style.setProperty('--blob-3-start', '#00f2ff')
      root.style.setProperty('--blob-3-end', '#0080ff')
    } else if (theme === 'crimson-rust') {
      root.style.setProperty('--app-bg', '#1c0205')
      root.style.setProperty('--blob-1-start', '#ff003c')
      root.style.setProperty('--blob-1-end', '#b3002b')
      root.style.setProperty('--blob-2-start', '#ef4444')
      root.style.setProperty('--blob-2-end', '#991b1b')
      root.style.setProperty('--blob-3-start', '#f97316')
      root.style.setProperty('--blob-3-end', '#c2410c')
    } else if (theme === 'pure-white') {
      root.style.setProperty('--app-bg', '#f8fafc')
      root.style.setProperty('--blob-1-start', '#dbeafe')
      root.style.setProperty('--blob-1-end', '#bfdbfe')
      root.style.setProperty('--blob-2-start', '#fce7f3')
      root.style.setProperty('--blob-2-end', '#fbcfe8')
      root.style.setProperty('--blob-3-start', '#d1fae5')
      root.style.setProperty('--blob-3-end', '#a7f3d0')
    } else {
      // Default: dark-slate
      root.style.setProperty('--app-bg', '#050d1a')
      root.style.setProperty('--blob-1-start', '#22c55e')
      root.style.setProperty('--blob-1-end', '#3b82f6')
      root.style.setProperty('--blob-2-start', '#a855f7')
      root.style.setProperty('--blob-2-end', '#f97316')
      root.style.setProperty('--blob-3-start', '#eab308')
      root.style.setProperty('--blob-3-end', '#14b8a6')
    }
  }, [theme])

  /* History state */
  const [historyOpen, setHistoryOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('history') === 'true' || window.location.hash === '#history';
  })
  const [scanCount, setScanCount]     = useState(0)
  const [showRecoveryDemo, setShowRecoveryDemo] = useState(false)
  if (false as boolean) {
    console.log(showRecoveryDemo);
    setShowRecoveryDemo(false);
  }

  /* AR Scanner state */
  const [arOpen, setArOpen]           = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('ar') === 'true' || window.location.hash === '#ar';
  })
  const [gardenOpen, setGardenOpen]   = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('garden') === 'true' || window.location.hash === '#garden';
  })
  const [rotationOpen, setRotationOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [controlHubOpen, setControlHubOpen] = useState(false);
  const [featuresTabOpen, setFeaturesTabOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [fertilizerCalcOpen, setFertilizerCalcOpen] = useState(false);
  const [homeTab, setHomeTab] = useState<'scanner' | 'farm' | 'advisory' | 'schemes' | 'ledger'>('scanner');
  const [soilCardOpen, setSoilCardOpen] = useState(false);
  const [outbreakRadarOpen, setOutbreakRadarOpen] = useState(false);
  const [ndviOpen, setNdviOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [irrigationOpen, setIrrigationOpen] = useState(false);
  const [voiceAssistantOpen, setVoiceAssistantOpen] = useState(false);
  const [presentationOpen, setPresentationOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('presentation') === 'true' || window.location.hash === '#presentation' || params.get('ppt') === 'true' || window.location.hash === '#ppt';
  });

  /* Accordion sections state */
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    classification: true,
    disease: true,
    treatment: true,
    prevention: false,
    advice: false,
    schemes: false,
    recovery: false,
  })
  const [authMode, setAuthMode] = useState<'main' | 'login' | 'signup'>('main')
  useEffect(() => {
    if (authLoading) return;

    const params = new URLSearchParams(window.location.search);
    if (!user && (params.get('demo') === 'true' || window.location.hash === '#demo')) {
      loginAsDemo();
      return;
    }

    if (user) {
      setAuthMode("main");
    } else {
      if (window.location.hash === '#login') {
        setAuthMode('login');
      } else if (window.location.hash === '#signup') {
        setAuthMode('signup');
      } else {
        setAuthMode("main");
      }
    }
  }, [user, authLoading, loginAsDemo]);

  /* Camera state */
  const [cameraActive, setCameraActive]       = useState(false)
  const [cameraError, setCameraError]         = useState<string | null>(null)
  const [captured, setCaptured]               = useState(false)
  const [facingMode, setFacingMode]           = useState<"user" | "environment">("environment")
  const [flashEffect, setFlashEffect]         = useState(false)
  const [cameraStream, setCameraStream]       = useState<MediaStream | null>(null)
  const [cameraFeedback, setCameraFeedback]   = useState<string | null>(null)
  const [cameraFeedbackStatus, setCameraFeedbackStatus] = useState<"success" | "warning" | "error" | "info">("info")

  /* ── Refs ── */
  const fileInputRef       = useRef<HTMLInputElement>(null)
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const videoRef           = useRef<HTMLVideoElement>(null)
  const canvasRef          = useRef<HTMLCanvasElement>(null)
  const hubRef             = useRef<HTMLDivElement>(null)
  const featuresRef        = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (hubRef.current && !hubRef.current.contains(e.target as Node)) {
        setControlHubOpen(false);
      }
      if (featuresRef.current && !featuresRef.current.contains(e.target as Node)) {
        setFeaturesTabOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  /* ═══════════════════════════════════════════
     CAMERA HELPERS
  ═══════════════════════════════════════════ */
  const stopCamera = useCallback(() => {
    setCameraStream(prevStream => {
      if (prevStream) {
        prevStream.getTracks().forEach(t => t.stop())
      }
      return null
    })
    setCameraActive(false)
    setCaptured(false)
  }, [])

  const getCameraErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      if (error.name === "NotAllowedError") {
        return "Camera permission denied. Please allow camera access in your browser settings."
      }
      if (error.name === "NotFoundError") {
        return "No camera found on this device."
      }
      return `Camera error: ${error.message}`
    }
    return "Camera error. Please try again."
  }

  const openTelegramBot = async () => {
    try {
      const response = await fetch(getApiUrl("/api/v1/telegram/bot-link"))
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
      const url = typeof data.url === "string" ? data.url : "https://t.me/Agriculture_ChatBot"
      if (!response.ok && typeof data.url !== "string") {
        window.open(url, "_blank", "noopener,noreferrer")
        return
      }
      window.open(url, "_blank", "noopener,noreferrer")
    } catch {
      window.open("https://t.me/Agriculture_ChatBot", "_blank", "noopener,noreferrer")
    }
  }
  if (false as boolean) {
    console.log(openTelegramBot);
  }

  const handleSharePDF = async () => {
    if (!result) return;
    setPdfGenerating(true);
    try {
      await sharePDFReport(result, preview, () => setShowShareModal(true));
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!result) return;
    const doc = await generatePDFDocument(result, preview);
    const filename = `${result.plant?.common_name.replace(/\s+/g, '_') || 'plant'}_health_report.pdf`;
    doc.save(filename);
  };
  const handleCopyTextReport = () => {
    if (!result) return;
    const text = getTextReportForSharing(result);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const startCamera = useCallback(async (facing: "user" | "environment" = facingMode) => {
    setCameraError(null)
    setCaptured(false)
    // Stop any existing stream first
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop())
      setCameraStream(null)
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      setCameraStream(stream)
      setCameraActive(true)
    } catch (error: unknown) {
      setCameraError(getCameraErrorMessage(error))
    }
  }, [facingMode, cameraStream])

  // Attach stream to video element whenever stream changes
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream
      videoRef.current.play().catch(() => {})
    }
  }, [cameraStream])

  // Real-time client-side sharpness (Laplacian variance) & framing (green ratio) feedback loop
  useEffect(() => {
    if (!cameraActive || !cameraStream || !videoRef.current) {
      setCameraFeedback(null);
      setCameraFeedbackStatus("info");
      return;
    }

    let active = true;
    const video = videoRef.current;
    
    // Offscreen canvas for fast pixel analytics (160x120 keeps CPU overhead extremely low)
    const analyzeCanvas = document.createElement("canvas");
    analyzeCanvas.width = 160;
    analyzeCanvas.height = 120;
    const analyzeCtx = analyzeCanvas.getContext("2d");

    const checkFrame = () => {
      if (!active) return;
      
      if (video.readyState === video.HAVE_ENOUGH_DATA && !captured) {
        try {
          if (analyzeCtx) {
            analyzeCtx.drawImage(video, 0, 0, analyzeCanvas.width, analyzeCanvas.height);
            const imgData = analyzeCtx.getImageData(0, 0, analyzeCanvas.width, analyzeCanvas.height);
            const data = imgData.data;
            const w = imgData.width;
            const h = imgData.height;

            // 1. Green pixel ratio analyzer for leaf framing check
            let greenPixels = 0;
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i+1];
              const b = data[i+2];
              if (g > r * 1.15 && g > b * 1.15 && g > 40) {
                greenPixels++;
              }
            }
            const greenRatio = greenPixels / (w * h);

            // 2. Grayscale conversion for Laplacian edge calculations
            const gray = new Float32Array(w * h);
            for (let i = 0; i < data.length; i += 4) {
              gray[i / 4] = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
            }

            // 3. 3x3 Laplacian edge convolution filter
            const laplacian = new Float32Array(w * h);
            let laplacianSum = 0;
            for (let y = 1; y < h - 1; y++) {
              for (let x = 1; x < w - 1; x++) {
                const idx = y * w + x;
                const val = 
                  gray[idx - 1] + 
                  gray[idx + 1] + 
                  gray[idx - w] + 
                  gray[idx + w] - 
                  4 * gray[idx];
                laplacian[idx] = val;
                laplacianSum += val;
              }
            }
            const N = (w - 2) * (h - 2);
            const laplacianMean = laplacianSum / N;

            // Laplacian Variance computation
            let varSum = 0;
            for (let y = 1; y < h - 1; y++) {
              for (let x = 1; x < w - 1; x++) {
                const idx = y * w + x;
                const diff = laplacian[idx] - laplacianMean;
                varSum += diff * diff;
              }
            }
            const variance = varSum / N;

            // 4. Threshold & User Feedback Logic
            if (greenRatio < 0.18) {
              setCameraFeedback("Hold camera 10cm closer to the leaf");
              setCameraFeedbackStatus("warning");
            } else if (variance < 70) {
              setCameraFeedback("Too blurry - hold steady");
              setCameraFeedbackStatus("error");
            } else {
              setCameraFeedback("✅ Camera ready - capture when steady");
              setCameraFeedbackStatus("success");
            }
          }
        } catch (e) {
          console.warn("Real-time camera analysis error:", e);
        }
      }

      // Re-trigger every 250ms for smooth real-time scanning feedback
      setTimeout(checkFrame, 250);
    };

    // Initial timeout to allow camera stream to settle before analysis
    const initialTimeout = setTimeout(checkFrame, 800);

    return () => {
      active = false;
      clearTimeout(initialTimeout);
    };
  }, [cameraActive, cameraStream, captured]);

  // Cleanup on unmount / mode switch
  useEffect(() => {
    return () => { stopCamera() }
  }, [stopCamera])

  const handleSwitchFacing = async () => {
    const next = facingMode === "environment" ? "user" : "environment"
    setFacingMode(next)
    await startCamera(next)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width  = video.videoWidth  || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext("2d")!
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Flash effect
    setFlashEffect(true)
    setTimeout(() => setFlashEffect(false), 300)

    canvas.toBlob(blob => {
      if (!blob) return
      const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" })
      const url  = URL.createObjectURL(blob)
      setImage(file)
      setPreview(url)
      setError(null)
      setResult(null)
      setCaptured(true)
      // Keep camera running so user can retake
    }, "image/jpeg", 0.92)
  }

  const retakePhoto = () => {
    setImage(null)
    setPreview(null)
    setCaptured(false)
    setError(null)
    setResult(null)
  }

  /* Handle mode tab switch */
  const switchMode = (mode: InputMode) => {
    if (mode === inputMode) return
    if (!user && mode === "camera") {
      setError("Please sign in or sign up to use the camera and upload features.")
      setAuthMode("login")
      return
    }
    setInputMode(mode)
    setImage(null); setPreview(null); setError(null); setResult(null)
    if (mode === "upload") {
      stopCamera()
    }
  }

  const requireAuthForFeature = useCallback((message = "Please sign in or sign up to use this feature.") => {
    if (authLoading) return false
    if (!user) {
      setError(message)
      setAuthMode("login")
      return false
    }
    return true
  }, [authLoading, user])

  /* ═══════════════════════════════════════════
     FILE UPLOAD HELPERS
  ═══════════════════════════════════════════ */
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    setDragActive(e.type === "dragenter" || e.type === "dragover")
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    setDragActive(false)
    if (!requireAuthForFeature()) return
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0])
  }
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!requireAuthForFeature()) {
      e.target.value = ""
      return
    }
    if (e.target.files?.[0]) processFile(e.target.files[0])
  }
  const processFile = (file: File) => {
    if (!requireAuthForFeature()) return
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, JPEG, WEBP)"); return
    }
    setImage(file); setPreview(URL.createObjectURL(file))
    setError(null); setResult(null)
  }

  /* ═══════════════════════════════════════════
     LOADING ANIMATION
  ═══════════════════════════════════════════ */
  const startLoading = () => {
    setLoadingStep(0); let s = 0
    loadingIntervalRef.current = setInterval(() => {
      s = (s + 1) % LOADING_STEPS.length; setLoadingStep(s)
    }, 2200)
  }
  const stopLoading = () => {
    if (loadingIntervalRef.current) { clearInterval(loadingIntervalRef.current); loadingIntervalRef.current = null }
  }

  const compressImage = (file: File, quality = 0.6, maxWidth = 800, maxHeight = 800): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width)
              width = maxWidth
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height)
              height = maxHeight
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            resolve(file)
            return
          }
          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob((blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            const compressedFile = new File([blob], file.name || "upload.jpg", {
              type: "image/jpeg",
              lastModified: Date.now()
            })
            resolve(compressedFile)
          }, "image/jpeg", quality)
        }
        img.onerror = () => resolve(file)
      }
      reader.onerror = () => resolve(file)
    })
  }

  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
  const [pendingScansList, setPendingScansList] = useState<any[]>([]);
  const [showOfflineQueueModal, setShowOfflineQueueModal] = useState<boolean>(false);

  const loadPendingScansList = useCallback(async () => {
    try {
      const list = await getPendingScans();
      setPendingOfflineCount(list.length);
      setPendingScansList(list);
    } catch (e) {
      console.warn("Failed to load pending scans list", e);
    }
  }, []);

  // Auto-sync queued scans when network connection returns
  const syncPendingScans = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const pending = await getPendingScans();
      if (pending.length === 0) {
        setPendingOfflineCount(0);
        setPendingScansList([]);
        return;
      }

      setOfflineNotice(`📶 Reconnected! Syncing ${pending.length} offline queued scan(s)...`);
      let lastCompletedNotice = "";

      for (const item of pending) {
        try {
          const file = new File([item.imageBlob], item.imageName, { type: item.imageBlob.type });
          const fd = new FormData();
          fd.append("image", file);
          fd.append("language", item.language);

          const res = await fetch(getApiUrl("/api/v1/prediction/"), { method: "POST", body: fd });
          if (res.ok) {
            const data: AgroAIResponse = await res.json();
            if (data.success) {
              const thumb = await buildThumbnail(file);
              addScanRecord(data, file, item.language, thumb);
              if (user?.uid) {
                saveScan(user.uid, {
                  plant_name: data.plant?.common_name || "Unknown Plant",
                  scientific: data.plant?.scientific_name || "",
                  disease: data.health?.disease || "Healthy",
                  is_healthy: data.health?.is_healthy || false,
                  severity: data.health?.severity || "low",
                  confidence: data.health?.confidence || 0,
                  recommendation: data.recommendation || "",
                  organic_treatment: data.treatment?.organic?.join(", ") || "",
                  chemical_treatment: data.treatment?.chemical?.join(", ") || "",
                  language: item.language,
                  thumbnail: thumb
                }).catch(e => console.warn("Firestore save error", e));
              }
              setResult(data);

              const plantName = data.plant?.common_name || "Crop";
              const diseaseName = data.health?.is_healthy ? "Healthy (No Disease)" : (data.health?.disease || "Diagnosis complete");
              lastCompletedNotice = `🍅 ${plantName} leaf scan complete: ${diseaseName} detected. Tap to view treatment.`;

              // Trigger OS System Push Notification if permission granted
              if ('Notification' in window && Notification.permission === 'granted') {
                try {
                  new Notification("AgroAI Field Diagnostic Complete", {
                    body: `${plantName} scan complete: ${diseaseName}. Tap to view treatment advice.`,
                    icon: "/favicon.ico"
                  });
                } catch (err) {
                  console.warn("Push notification error", err);
                }
              }
            }
            await removePendingScan(item.id);
          }
        } catch (e) {
          console.warn("Failed to sync pending scan item", item.id, e);
        }
      }

      await loadPendingScansList();
      setScanCount(getScanHistory().length);
      
      if (lastCompletedNotice) {
        setOfflineNotice(lastCompletedNotice);
      } else {
        setOfflineNotice(`✅ Auto-sync completed! Updated diagnostic report.`);
      }
      setTimeout(() => setOfflineNotice(null), 7000);
    } catch (e) {
      console.warn("Error during offline queue sync", e);
    }
  }, [user, loadPendingScansList]);

  useEffect(() => {
    loadPendingScansList();

    const handleOnline = () => {
      syncPendingScans();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncPendingScans, loadPendingScansList]);

  /* ═══════════════════════════════════════════
     SUBMIT
  ═══════════════════════════════════════════ */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!requireAuthForFeature("Please sign in or sign up before analyzing a plant image.")) return
    if (!image) return
    setLoading(true); setError(null); setCompressionStats(null); startLoading()
    if (inputMode === "camera") stopCamera()

    let fileToUpload = image
    if (lowBandwidthMode) {
      try {
        const originalSize = image.size
        const compressed = await compressImage(image, 0.6, 800, 800)
        fileToUpload = compressed
        const saved = originalSize - compressed.size
        const savingsPct = originalSize > 0 ? ((saved / originalSize) * 100).toFixed(0) : "0"

        setCompressionStats({
          originalSize: originalSize > 1024 * 1024 
            ? (originalSize / (1024 * 1024)).toFixed(2) + " MB" 
            : (originalSize / 1024).toFixed(0) + " KB",
          compressedSize: (compressed.size / 1024).toFixed(0) + " KB",
          savingPercentage: savingsPct + "%"
        })
      } catch (err) {
        console.warn("Client-side compression failed, uploading original file", err)
      }
    }

    // Intercept if offline
    if (!navigator.onLine) {
      try {
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission().catch(() => {});
        }
        await addPendingScan(fileToUpload, language);
        await loadPendingScansList();
        setLoading(false);
        stopLoading();
        setOfflineNotice(`📡 Field Mode: Leaf scan saved in Offline Queue (${pendingScansList.length + 1} pending). Will auto-upload when reconnected!`);
        return;
      } catch (err) {
        console.warn("Failed to queue scan offline", err);
      }
    }

    const fd = new FormData()
    fd.append("image", fileToUpload)
    fd.append("language", language)
    try {
      const res = await fetch(getApiUrl("/api/v1/prediction/"), { method: "POST", body: fd })
      if (!res.ok) {
        let errorMessage = `Error ${res.status}`
        try {
          const errorData = (await res.json()) as { detail?: string; error?: string } | undefined
          errorMessage = errorData?.detail || errorData?.error || errorMessage
        } catch {
          errorMessage = `Error ${res.status}`
        }
        throw new Error(errorMessage)
      }
      const data: AgroAIResponse = await res.json()
      if (data.success) {
        setResult(data)
        // ── Save to scan history (local + Firestore for authenticated users) ──
        try {
          const thumb = fileToUpload ? await buildThumbnail(fileToUpload) : ''
          const rec = addScanRecord(data, fileToUpload, language, thumb)
          setScanCount(getScanHistory().length)
          // Also persist to Firestore under the signed-in user if available
          if (user?.uid) {
            // create a slim object for Firestore
            const scanDoc = {
              plant_name: rec.plant_name,
              scientific: rec.scientific,
              disease: rec.disease,
              is_healthy: rec.is_healthy,
              confidence: rec.confidence,
              severity: rec.severity,
              language: rec.language,
              thumbnail: rec.thumbnail,
              recommendation: rec.recommendation,
              result: data,
            }
            try { await saveScan(user.uid, scanDoc) } catch (e) { console.warn('Failed to save scan to Firestore', e) }
          }
        } catch {
          /* history save is non-critical */
        }
      } else {
        setError(data.error || "Prediction failed.")
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to reach the server.")
    } finally { stopLoading(); setLoading(false) }
  }

  /* Restore a historical result back into the result view */
  const handleRestoreRecord = (record: import('./historyService').ScanRecord) => {
    setResult(record.result)
    setPreview(record.thumbnail || null)
  }

  /* Receive image captured inside AR Scanner → run full prediction */
  const handleARCapture = (file: File) => {
    processFile(file)
  }

  /* Keep scan count badge in sync */
  useEffect(() => {
    setScanCount(getScanHistory().length)
  }, [])

  const [speaking, setSpeaking] = useState(false)

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
    }
  }, [])

  const speakText = (text: string, lang: string, isRetry = false) => {
    window.speechSynthesis.cancel()
    
    let targetLang = lang
    const voices = window.speechSynthesis.getVoices()
    let matchingVoices = voices.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith(targetLang.toLowerCase()))

    // Fallback: If the user selected Marathi (mr-IN) but the browser/OS has no Marathi voice installed
    // (which is very common since Marathi is often missing), fallback to Hindi (hi-IN) which uses the exact
    // same Devanagari script and can read Marathi text with highly intelligible pronunciation.
    if (matchingVoices.length === 0 && targetLang === 'mr-IN') {
      console.log("No Marathi (mr-IN) voice installed on this device. Falling back to Hindi (hi-IN) for Devnagari support.")
      targetLang = 'hi-IN'
      matchingVoices = voices.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith('hi-IN'))
    }
    
    const utterance = new SpeechSynthesisUtterance(text.trim())
    utterance.lang = targetLang
    utterance.rate = 0.85
    utterance.pitch = 1.0

    // Prioritize local offline voices to avoid online API 'synthesis-failed' network errors
    const localOffline = matchingVoices.filter(v => v.localService === true || !v.name.toLowerCase().includes('online'))
    const candidates = localOffline.length > 0 ? localOffline : matchingVoices
    
    const bestVoice = candidates.find(v => 
      v.name.includes('Google') || 
      v.name.includes('Microsoft') || 
      v.name.includes('Premium')
    ) || candidates[0]

    // Only apply explicit voice objects for non-fallback attempts
    if (bestVoice && !isRetry) {
      utterance.voice = bestVoice
      console.log("Selected voice:", bestVoice.name, bestVoice.lang, "LocalService:", bestVoice.localService)
    }

    utterance.onend = () => {
      console.log("Speech completed successfully")
      setSpeaking(false)
    }

    utterance.onerror = (err) => {
      console.error("SpeechSynthesis utterance error:", err)
      
      // Fallback: If synthesis fails (often due to Devnagari characters in an English voice),
      // strip non-ASCII characters and speak using the browser's default system voice.
      if (!isRetry && err.error === 'synthesis-failed') {
        console.log("Retrying speech with clean ASCII text...")
        const cleanText = text.replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, " ").trim()
        if (cleanText.length > 0) {
          setTimeout(() => {
            speakText(cleanText, 'en-US', true)
          }, 100)
          return
        }
      }
      setSpeaking(false)
    }

    setSpeaking(true)
    setTimeout(() => {
      window.speechSynthesis.speak(utterance)
    }, 100)
  }

  const toggleVoiceOutput = () => {
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }

    if (!result) return

    let textToSpeak = ''
    const currentLang = (activeLang || language || 'en').toLowerCase()

    if (currentLang === 'hi' || currentLang === 'hindi') {
      const statusText = result.health?.is_healthy
        ? "पौधा पूरी तरह से स्वस्थ है! इसमें कोई बीमारी नहीं है।"
        : `आपके पौधे में ${result.health?.disease || ''} बीमारी देखी गई है। इस बीमारी का प्रभाव ${result.health?.severity || ''} है।`
      const plant = result.plant ? `यह ${result.plant.common_name} का पौधा है।` : ''
      const rec = result.recommendation ? `सलाह: ${result.recommendation}।` : ''
      const advice = result.farmer_advice && result.farmer_advice.length > 0
        ? `किसान भाइयों के लिए विशेष सुझाव: ${result.farmer_advice.join('। ')}`
        : ''
      textToSpeak = `नमस्ते किसान भाई! ${plant} ${statusText} ${rec} ${advice}`
    } 
    else if (currentLang === 'mr' || currentLang === 'marathi') {
      const statusText = result.health?.is_healthy
        ? "आपले रोप पूर्णपणे निरोगी आहे! यामध्ये कोणताही रोग आढळलेला नाही."
        : `आपल्या रोपात ${result.health?.disease || ''} हा रोग आढळला आहे। या रोगाची तीव्रता ${result.health?.severity || ''} आहे।`
      const plant = result.plant ? `हे ${result.plant.common_name} चे रोप आहे.` : ''
      const rec = result.recommendation ? `सल्ला: ${result.recommendation}।` : ''
      const advice = result.farmer_advice && result.farmer_advice.length > 0
        ? `शेतकरी मित्रांसाठी विशेष माहिती: ${result.farmer_advice.join('। ')}`
        : ''
      textToSpeak = `नमस्कार शेतकरी मित्रहो! ${plant} ${statusText} ${rec} ${advice}`
    } 
    else if (currentLang === 'te' || currentLang === 'telugu') {
      const statusText = result.health?.is_healthy
        ? "మొక్క సంపూర్ణ ఆరోగ్యంగా ఉంది! ఎటువంటి తెగులు లేదు."
        : `మీ మొక్కలో ${result.health?.disease || ''} వ్యాధి గుర్తించబడింది.`
      const plant = result.plant ? `ఇది ${result.plant.common_name} మొక్క.` : ''
      const rec = result.recommendation ? `సలహా: ${result.recommendation}.` : ''
      textToSpeak = `నమస్కారం రైతు సోదరులారా! ${plant} ${statusText} ${rec}`
    }
    else if (currentLang === 'gu' || currentLang === 'gujarati') {
      const statusText = result.health?.is_healthy
        ? "છોડ સંપૂર્ણપણે સ્વસ્થ છે! કોઈ રોગ નથી."
        : `તમારા છોડમાં ${result.health?.disease || ''} રોગ જોવા મળ્યો છે.`
      const plant = result.plant ? `આ ${result.plant.common_name} નો છોડ છે.` : ''
      const rec = result.recommendation ? `સલાહ: ${result.recommendation}.` : ''
      textToSpeak = `નમસ્તે ખેડૂત ભાઈઓ! ${plant} ${statusText} ${rec}`
    }
    else if (currentLang === 'pa' || currentLang === 'punjabi') {
      const statusText = result.health?.is_healthy
        ? "ਪੌਦਾ ਪੂਰੀ ਤਰ੍ਹਾਂ ਤੰਦਰੁਸਤ ਹੈ! ਕੋਈ ਬੀਮਾਰੀ ਨਹੀਂ ਹੈ।"
        : `ਤੁਹਾਡੇ ਪੌਦੇ ਵਿੱਚ ${result.health?.disease || ''} ਬੀਮਾਰੀ ਵੇਖੀ ਗਈ ਹੈ।`
      const plant = result.plant ? `ਇਹ ${result.plant.common_name} ਦਾ ਪੌਦਾ ਹੈ।` : ''
      const rec = result.recommendation ? `ਸਲਾਹ: ${result.recommendation}।` : ''
      textToSpeak = `ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ ਕਿਸਾਨ ਵੀਰੋ! ${plant} ${statusText} ${rec}`
    }
    else if (currentLang === 'ta' || currentLang === 'tamil') {
      const statusText = result.health?.is_healthy
        ? "செடி ஆரோக்கியமாக உள்ளது! எந்த நோயும் இல்லை."
        : `உங்கள் செடியில் ${result.health?.disease || ''} நோய் கண்டறியப்பட்டுள்ளது.`
      const plant = result.plant ? `இது ${result.plant.common_name} செடி.` : ''
      const rec = result.recommendation ? `பரிந்துரை: ${result.recommendation}.` : ''
      textToSpeak = `வணக்கம் விவசாய தோழர்களே! ${plant} ${statusText} ${rec}`
    }
    else if (currentLang === 'kn' || currentLang === 'kannada') {
      const statusText = result.health?.is_healthy
        ? "ಸಸ್ಯವು ಸಂಪೂರ್ಣವಾಗಿ ಆರೋಗ್ಯಕರವಾಗಿದೆ! ಯಾವುದೇ ರೋಗವಿಲ್ಲ."
        : `ನಿಮ್ಮ ಸಸ್ಯದಲ್ಲಿ ${result.health?.disease || ''} ರೋಗ ಕಂಡುಬಂದಿದೆ.`
      const plant = result.plant ? `ಇದು ${result.plant.common_name} ಸಸ್ಯ.` : ''
      const rec = result.recommendation ? `ಸಲಹೆ: ${result.recommendation}.` : ''
      textToSpeak = `ನಮಸ್ಕಾರ ರೈತ ಬಾಂಧವರೇ! ${plant} ${statusText} ${rec}`
    }
    else if (currentLang === 'bn' || currentLang === 'bengali') {
      const statusText = result.health?.is_healthy
        ? "গাছটি সম্পূর্ণ সুস্থ! কোনো রোগ নেই।"
        : `আপনার গাছে ${result.health?.disease || ''} রোগ শনাক্ত করা হয়েছে।`
      const plant = result.plant ? `এটি একটি ${result.plant.common_name} গাছ।` : ''
      const rec = result.recommendation ? `পরামর্শ: ${result.recommendation}।` : ''
      textToSpeak = `নমস্কার কৃষক ভাইরা! ${plant} ${statusText} ${rec}`
    }
    else {
      const statusText = result.health?.is_healthy
        ? "The plant is healthy! No disease detected."
        : `The plant has ${result.health?.disease || ''}. The severity level is ${result.health?.severity || ''}.`
      const plant = result.plant ? `This is a ${result.plant.common_name} plant.` : ''
      const rec = result.recommendation ? `Recommendation: ${result.recommendation}.` : ''
      const advice = result.farmer_advice && result.farmer_advice.length > 0
        ? `Farmer advice: ${result.farmer_advice.join('. ')}`
        : ''
      textToSpeak = `Hello! ${plant} ${statusText} ${rec} ${advice}`
    }

    console.log("Speech text to speak:", textToSpeak)

    let langCode = 'en-IN'
    if (currentLang === 'hi' || currentLang === 'hindi') langCode = 'hi-IN'
    else if (currentLang === 'mr' || currentLang === 'marathi') langCode = 'mr-IN'
    else if (currentLang === 'te' || currentLang === 'telugu') langCode = 'te-IN'
    else if (currentLang === 'gu' || currentLang === 'gujarati') langCode = 'gu-IN'
    else if (currentLang === 'pa' || currentLang === 'punjabi') langCode = 'pa-IN'
    else if (currentLang === 'ta' || currentLang === 'tamil') langCode = 'ta-IN'
    else if (currentLang === 'kn' || currentLang === 'kannada') langCode = 'kn-IN'
    else if (currentLang === 'bn' || currentLang === 'bengali') langCode = 'bn-IN'

    // Critical fix: If speech text contains non-ASCII characters and language code is en-IN,
    // force a regional language code (hi-IN) to prevent English speech engines from crashing.
    const hasNonAscii = /[^\x00-\x7F]/.test(textToSpeak)
    if (hasNonAscii && langCode === 'en-IN') {
      langCode = 'hi-IN'
    }

    speakText(textToSpeak, langCode)
  }

  const resetForm = () => {
    window.speechSynthesis.cancel()
    setSpeaking(false)
    setImage(null); setPreview(null); setResult(null); setError(null)
    stopLoading(); stopCamera()
    setCaptured(false); setCameraError(null)
    setRotationOpen(false)
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  /* Severity helpers */
  const severityClass = (s: string) => {
    const m: Record<string, string> = { low: "sev-low", moderate: "sev-mod", high: "sev-high", critical: "sev-crit" }
    return m[s?.toLowerCase()] || "sev-low"
  }

  const handleLogout = async () => {
    await logout()
  }

  const userLabel = user?.displayName?.trim() || user?.email || 'User'

  const authContent = authMode === 'login'
    ? <LoginPage onSwitch={setAuthMode} />
    : <SignupPage onSwitch={setAuthMode} />

  /* ═══════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════ */
  return (
    <div className="root-wrap">
      <style>{`
        body {
          background: var(--app-bg, #050d1a) !important;
          transition: background 0.5s ease;
        }
        .blob-1 {
          background: radial-gradient(circle, var(--blob-1-start, #22c55e), var(--blob-1-end, #3b82f6)) !important;
          transition: all 0.5s ease;
        }
        .blob-2 {
          background: radial-gradient(circle, var(--blob-2-start, #a855f7), var(--blob-2-end, #f97316)) !important;
          transition: all 0.5s ease;
        }
        .blob-3 {
          background: radial-gradient(circle, var(--blob-3-start, #eab308), var(--blob-3-end, #14b8a6)) !important;
          transition: all 0.5s ease;
        }

        /* ── Neon Control Hub Styles ── */
        .control-hub-container {
          position: relative;
        }

        .nav-hub-trigger {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(5, 13, 26, 0.6);
          border: 2px solid #00f2ff;
          color: #00f2ff;
          font-size: 14px;
          font-weight: 800;
          padding: 8px 18px;
          border-radius: 12px;
          cursor: pointer;
          text-shadow: 0 0 8px rgba(0, 242, 255, 0.6);
          box-shadow: 0 0 10px rgba(0, 242, 255, 0.2), inset 0 0 10px rgba(0, 242, 255, 0.1);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          letter-spacing: 0.5px;
        }

        .nav-hub-trigger:hover {
          background: rgba(0, 242, 255, 0.1);
          border-color: #ff007f;
          color: #ff007f;
          text-shadow: 0 0 12px rgba(255, 0, 127, 0.8);
          box-shadow: 0 0 20px rgba(255, 0, 127, 0.5), inset 0 0 15px rgba(255, 0, 127, 0.2);
          transform: translateY(-2px);
        }

        .nav-hub-trigger.active {
          background: rgba(255, 0, 127, 0.1);
          border-color: #ff007f;
          color: #ff007f;
          text-shadow: 0 0 12px rgba(255, 0, 127, 0.8);
          box-shadow: 0 0 20px rgba(255, 0, 127, 0.5);
        }

        .neon-hub-card {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          width: 320px;
          max-height: 80vh;
          overflow-y: auto;
          background: rgba(5, 10, 20, 0.95);
          border: 2px solid #39ff14;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 0 25px rgba(57, 255, 20, 0.35), inset 0 0 15px rgba(57, 255, 20, 0.1);
          backdrop-filter: blur(20px);
          z-index: 1000;
          animation: neon-slide-down 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        @keyframes neon-slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .hub-user-profile {
          display: flex;
          flex-direction: column;
          gap: 10px;
          border-bottom: 1px dashed rgba(255, 255, 255, 0.15);
          padding-bottom: 14px;
        }

        .hub-email-title {
          font-size: 11px;
          text-transform: uppercase;
          color: #888;
          letter-spacing: 1px;
        }

        .hub-email-val {
          font-size: 14px;
          font-weight: 700;
          color: #00f2ff;
          text-shadow: 0 0 8px rgba(0, 242, 255, 0.4);
          word-break: break-all;
          line-height: 1.3;
        }

        .hub-logout-btn {
          width: 100%;
          padding: 8px 14px;
          background: transparent;
          border: 1px solid #ff0055;
          color: #ff0055;
          font-size: 12px;
          font-weight: 700;
          border-radius: 8px;
          cursor: pointer;
          text-shadow: 0 0 5px rgba(255, 0, 85, 0.5);
          transition: all 0.2s ease;
        }

        .hub-logout-btn:hover {
          background: rgba(255, 0, 85, 0.15);
          box-shadow: 0 0 12px rgba(255, 0, 85, 0.4);
        }

        .hub-auth-grid {
          display: flex;
          gap: 10px;
          border-bottom: 1px dashed rgba(255, 255, 255, 0.15);
          padding-bottom: 14px;
        }

        .hub-auth-btn {
          flex: 1;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .hub-auth-login {
          background: transparent;
          border: 1.5px solid #00f2ff;
          color: #00f2ff;
          text-shadow: 0 0 5px rgba(0, 242, 255, 0.4);
        }

        .hub-auth-login:hover {
          background: rgba(0, 242, 255, 0.1);
          box-shadow: 0 0 10px rgba(0, 242, 255, 0.3);
        }

        .hub-auth-signup {
          background: transparent;
          border: 1.5px solid #ff007f;
          color: #ff007f;
          text-shadow: 0 0 5px rgba(255, 0, 127, 0.4);
        }

        .hub-auth-signup:hover {
          background: rgba(255, 0, 127, 0.1);
          box-shadow: 0 0 10px rgba(255, 0, 127, 0.3);
        }

        .hub-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .hub-btn {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px 10px;
          border-radius: 12px;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.03);
          font-weight: 700;
          font-size: 13px;
          border: none;
          outline: none;
          transition: all 0.25s ease;
        }

        .hub-btn-garden {
          border: 1.5px solid #39ff14 !important;
          color: #39ff14 !important;
          text-shadow: 0 0 5px rgba(57, 255, 20, 0.4);
        }
        .hub-btn-garden:hover {
          background: rgba(57, 255, 20, 0.1) !important;
          box-shadow: 0 0 15px rgba(57, 255, 20, 0.4);
          transform: translateY(-2px);
        }

        .hub-btn-ar {
          border: 1.5px solid #00f2ff !important;
          color: #00f2ff !important;
          text-shadow: 0 0 5px rgba(0, 242, 255, 0.4);
        }
        .hub-btn-ar:hover {
          background: rgba(0, 242, 255, 0.1) !important;
          box-shadow: 0 0 15px rgba(0, 242, 255, 0.4);
          transform: translateY(-2px);
        }

        .hub-btn-rotation {
          border: 1.5px solid #bd00ff !important;
          color: #bd00ff !important;
          text-shadow: 0 0 5px rgba(189, 0, 255, 0.4);
        }
        .hub-btn-rotation:hover {
          background: rgba(189, 0, 255, 0.1) !important;
          box-shadow: 0 0 15px rgba(189, 0, 255, 0.4);
          transform: translateY(-2px);
        }

        .hub-btn-history {
          border: 1.5px solid #ff007f !important;
          color: #ff007f !important;
          text-shadow: 0 0 5px rgba(255, 0, 127, 0.4);
        }
        .hub-btn-history:hover {
          background: rgba(255, 0, 127, 0.1) !important;
          box-shadow: 0 0 15px rgba(255, 0, 127, 0.4);
          transform: translateY(-2px);
        }

        .hub-btn-market {
          border: 1.5px solid #10b981 !important;
          color: #10b981 !important;
          text-shadow: 0 0 5px rgba(16, 185, 129, 0.4);
        }
        .hub-btn-market:hover {
          background: rgba(16, 185, 129, 0.1) !important;
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
          transform: translateY(-2px);
        }

        .hub-emoji {
          font-size: 20px;
        }

        .hub-badge {
          position: absolute;
          top: 6px;
          right: 6px;
          background: #ff007f;
          color: #fff;
          font-size: 10px;
          font-weight: 900;
          min-width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 8px #ff007f;
        }

        /* ── Settings Section ── */
        .hub-settings-section {
          border-top: 1px dashed rgba(255, 255, 255, 0.15);
          padding-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .hub-settings-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .hub-settings-label {
          font-size: 11px;
          text-transform: uppercase;
          color: #888;
          letter-spacing: 1px;
          font-weight: 700;
        }

        .hub-lang-selector {
          display: flex;
          gap: 8px;
        }

        .hub-lang-pill {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 6px 4px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #94a3b8;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .hub-lang-pill:hover {
          border-color: rgba(0, 242, 255, 0.5);
          color: #fff;
        }

        .hub-lang-pill.active {
          background: rgba(0, 242, 255, 0.1) !important;
          border-color: #00f2ff !important;
          color: #00f2ff !important;
          text-shadow: 0 0 5px rgba(0, 242, 255, 0.5);
          box-shadow: 0 0 8px rgba(0, 242, 255, 0.2);
        }

        .hub-theme-selector {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .hub-theme-dot {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.25s ease;
          border: 2px solid rgba(255, 255, 255, 0.2);
          box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.6);
        }

        .hub-theme-dot:hover {
          transform: scale(1.15);
          border-color: #fff;
        }

        .hub-theme-dot.active {
          border-color: #39ff14 !important;
          box-shadow: 0 0 10px #39ff14, inset 0 0 6px rgba(0, 0, 0, 0.6);
          transform: scale(1.1);
        }

        .theme-slate { background: #050d1a; }
        .theme-forest { background: #04160e; }
        .theme-clay { background: #1a0d06; }
        .theme-ocean { background: #020e24; }
        .theme-carbon { background: #121214; }
        .theme-navy { background: #0b132b; }
        .theme-purple { background: #140526; }
        .theme-rust { background: #1c0205; }
        .theme-white { background: #ffffff; border: 2px solid rgba(15, 23, 42, 0.15) !important; }

        /* ── Formal White Theme Overrides ── */
        html.theme-pure-white {
          --card-bg: rgba(255, 255, 255, 0.95);
          --card-border: rgba(15, 23, 42, 0.12);
          --text-muted: #475569;
        }

        html.theme-pure-white body {
          color: #0f172a !important;
        }

        html.theme-pure-white h1,
        html.theme-pure-white h2,
        html.theme-pure-white h3,
        html.theme-pure-white h4,
        html.theme-pure-white h5,
        html.theme-pure-white h6,
        html.theme-pure-white p,
        html.theme-pure-white span,
        html.theme-pure-white li,
        html.theme-pure-white label,
        html.theme-pure-white th,
        html.theme-pure-white td,
        html.theme-pure-white strong {
          color: #0f172a !important;
        }

        html.theme-pure-white .navbar {
          background: rgba(255, 255, 255, 0.85) !important;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(10px);
        }

        html.theme-pure-white .nav-pill {
          background: rgba(15, 23, 42, 0.06) !important;
          color: #334155 !important;
          border: 1px solid rgba(15, 23, 42, 0.1) !important;
        }

        html.theme-pure-white .nav-status {
          background: rgba(15, 23, 42, 0.04) !important;
          border-color: rgba(15, 23, 42, 0.08) !important;
        }

        html.theme-pure-white .nav-hub-trigger {
          border-color: #0f172a !important;
          color: #0f172a !important;
          background: transparent !important;
          text-shadow: none !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05) !important;
        }

        html.theme-pure-white .nav-hub-trigger:hover,
        html.theme-pure-white .nav-hub-trigger.active {
          border-color: #ff007f !important;
          color: #ff007f !important;
          box-shadow: 0 0 10px rgba(255, 0, 127, 0.2) !important;
        }

        /* Features Dropdown styles */
        .feat-header { color: #fff; font-size: 16px; margin-bottom: 16px; text-align: center; font-weight: 800; }
        .feat-row { padding: 12px; background: rgba(255,255,255,0.05); border-radius: 12px; display: flex; align-items: center; gap: 14px; border: 1px solid rgba(255,255,255,0.08); }
        .feat-title { font-size: 14px; margin: 0; font-weight: 700; color: #fff; }
        .feat-desc { font-size: 12px; margin: 4px 0 0 0; color: #cbd5e1; }
        
        /* Override the neon control hub inside the white theme */
        html.theme-pure-white .neon-hub-card {
          background: rgba(255, 255, 255, 0.98) !important;
          border-color: #0f172a !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1) !important;
        }
        
        html.theme-pure-white .feat-header { color: #0f172a; }
        html.theme-pure-white .feat-row { background: #f8fafc; border-color: #e2e8f0; }
        html.theme-pure-white .feat-title { color: #0f172a; }
        html.theme-pure-white .feat-desc { color: #475569; }

        html.theme-pure-white .hub-email-val {
          color: #0f172a !important;
          text-shadow: none !important;
        }

        html.theme-pure-white .hub-btn-garden {
          border-color: #16a34a !important;
          color: #16a34a !important;
          text-shadow: none !important;
        }
        html.theme-pure-white .hub-btn-garden:hover {
          background: rgba(22, 163, 74, 0.08) !important;
          box-shadow: 0 0 10px rgba(22, 163, 74, 0.2) !important;
        }

        html.theme-pure-white .hub-btn-ar {
          border-color: #2563eb !important;
          color: #2563eb !important;
          text-shadow: none !important;
        }
        html.theme-pure-white .hub-btn-ar:hover {
          background: rgba(37, 99, 235, 0.08) !important;
          box-shadow: 0 0 10px rgba(37, 99, 235, 0.2) !important;
        }

        html.theme-pure-white .hub-btn-rotation {
          border-color: #9333ea !important;
          color: #9333ea !important;
          text-shadow: none !important;
        }
        html.theme-pure-white .hub-btn-rotation:hover {
          background: rgba(147, 51, 234, 0.08) !important;
          box-shadow: 0 0 10px rgba(147, 51, 234, 0.2) !important;
        }

        html.theme-pure-white .hub-btn-history {
          border-color: #db2777 !important;
          color: #db2777 !important;
          text-shadow: none !important;
        }
        html.theme-pure-white .hub-btn-history:hover {
          background: rgba(219, 39, 119, 0.08) !important;
          box-shadow: 0 0 10px rgba(219, 39, 119, 0.2) !important;
        }

        html.theme-pure-white .hub-btn-market {
          border-color: #10b981 !important;
          color: #10b981 !important;
          text-shadow: none !important;
        }
        html.theme-pure-white .hub-btn-market:hover {
          background: rgba(16, 185, 129, 0.08) !important;
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.2) !important;
        }

        html.theme-pure-white .hub-lang-pill {
          background: rgba(15, 23, 42, 0.03) !important;
          border-color: rgba(15, 23, 42, 0.12) !important;
          color: #475569 !important;
        }
        html.theme-pure-white .hub-lang-pill.active {
          background: rgba(37, 99, 235, 0.1) !important;
          border-color: #2563eb !important;
          color: #2563eb !important;
          text-shadow: none !important;
          box-shadow: none !important;
        }

        html.theme-pure-white .hub-theme-dot {
          border-color: rgba(15, 23, 42, 0.15) !important;
        }
        html.theme-pure-white .hub-theme-dot.active {
          border-color: #16a34a !important;
          box-shadow: 0 0 10px rgba(22, 163, 74, 0.4) !important;
        }

        html.theme-pure-white .info-panel {
          background: rgba(255, 255, 255, 0.95) !important;
          border-color: rgba(15, 23, 42, 0.08) !important;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05) !important;
        }

        html.theme-pure-white .chip {
          background: rgba(255, 255, 255, 0.9) !important;
          border-color: rgba(15, 23, 42, 0.08) !important;
          color: #334155 !important;
        }

        html.theme-pure-white .upload-card {
          background: rgba(255, 255, 255, 0.95) !important;
          border-color: rgba(15, 23, 42, 0.08) !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06) !important;
        }

        html.theme-pure-white .lang-pill {
          background: rgba(15, 23, 42, 0.03) !important;
          border-color: rgba(15, 23, 42, 0.08) !important;
        }
        html.theme-pure-white .lang-pill-active {
          background: rgba(59, 130, 246, 0.1) !important;
          border-color: #3b82f6 !important;
          color: #3b82f6 !important;
        }

        html.theme-pure-white .mode-tab {
          background: rgba(15, 23, 42, 0.03) !important;
          border-color: rgba(15, 23, 42, 0.08) !important;
        }
        html.theme-pure-white .mode-tab-active {
          background: rgba(34, 197, 148, 0.1) !important;
          border-color: #22c55e !important;
          color: #16a34a !important;
        }

        html.theme-pure-white .up-dropzone {
          background: rgba(15, 23, 42, 0.005) !important;
          border-color: rgba(15, 23, 42, 0.15) !important;
        }

        html.theme-pure-white .cr-select,
        html.theme-pure-white .cr-input {
          background: #ffffff !important;
          border-color: rgba(15, 23, 42, 0.12) !important;
        }

        html.theme-pure-white .cr-back-btn,
        html.theme-pure-white .back-btn {
          border-color: #0f172a !important;
          color: #0f172a !important;
          background: transparent !important;
          text-shadow: none !important;
          box-shadow: 0 2px 6px rgba(0,0,0,0.05) !important;
        }

        html.theme-pure-white .cr-back-btn:hover,
        html.theme-pure-white .back-btn:hover {
          border-color: #ff007f !important;
          color: #ff007f !important;
          box-shadow: 0 0 10px rgba(255, 0, 127, 0.15) !important;
        }
      `}</style>
      {/* Animated blobs */}
      <div className="bg-blobs" aria-hidden>
        <div className="blob blob-1" /><div className="blob blob-2" /><div className="blob blob-3" />
      </div>

      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="nav-brand">
          <span className="nav-leaf">🌿</span>
          <span className="nav-title">Plant Medic</span>
        </div>
        <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            title="Menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
          <LanguageSelector />
          <button 
            className="nav-hub-trigger" 
            onClick={() => setPresentationOpen(true)} 
            title="Interactive App Overview"
            style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#10b981' }}
          >
            <span>📊</span>
            <span>App Overview</span>
          </button>

          <div className="control-hub-container" ref={featuresRef}>
            <button 
              className={`nav-hub-trigger ${featuresTabOpen ? 'active' : ''}`}
              onClick={() => { setFeaturesTabOpen(!featuresTabOpen); setControlHubOpen(false); }}
              title="View Features"
              style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' }}
            >
              <span>✨</span>
              <span>Features</span>
            </button>
            
            {featuresTabOpen && (
              <div className="neon-hub-card" style={{ width: '340px', padding: '20px', maxHeight: '80vh', overflowY: 'auto' }}>
                <h3 className="feat-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
                  <span>🚀 All Features</span>
                  <button 
                    onClick={() => setFeaturesTabOpen(false)} 
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}
                  >
                    ×
                  </button>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  
                  {/* 1. Plant Medic Analysis */}
                  <div className="feat-row-interactive" onClick={() => { setFeaturesTabOpen(false); setArOpen(false); setGardenOpen(false); setRotationOpen(false); setMarketOpen(false); }} style={{ cursor: 'pointer' }}>
                    <span className="feat-icon-badge">🩺</span>
                    <div style={{ textAlign: 'left', flex: 1 }}>
                      <p className="feat-title">Plant Medic</p>
                      <p className="feat-desc">AI-powered crop health analysis & advice</p>
                    </div>
                    <span className="feat-arrow">➔</span>
                  </div>

                  {/* 2. Smart Farm Monitor */}
                  <div className="feat-row-interactive" onClick={() => { if (requireAuthForFeature()) { setGardenOpen(true); setFeaturesTabOpen(false); } }} style={{ cursor: 'pointer' }}>
                    <span className="feat-icon-badge">🚜</span>
                    <div style={{ textAlign: 'left', flex: 1 }}>
                      <p className="feat-title">Smart Farm Monitor</p>
                      <p className="feat-desc">Live ESP32 telemetry, water pump toggles & AI chat</p>
                    </div>
                    <span className="feat-arrow">➔</span>
                  </div>

                  {/* 3. AR Live Scanner */}
                  <div className="feat-row-interactive" onClick={() => { if (requireAuthForFeature()) { setArOpen(true); setFeaturesTabOpen(false); } }} style={{ cursor: 'pointer' }}>
                    <span className="feat-icon-badge">🤖</span>
                    <div style={{ textAlign: 'left', flex: 1 }}>
                      <p className="feat-title">AR Scan</p>
                      <p className="feat-desc">Inspect plant leaves with real-time AR overlays</p>
                    </div>
                    <span className="feat-arrow">➔</span>
                  </div>

                  {/* 4. Crop Rotation Advisor */}
                  <div className="feat-row-interactive" onClick={() => { if (requireAuthForFeature()) { setRotationOpen(true); setGardenOpen(false); setArOpen(false); setMarketOpen(false); setFeaturesTabOpen(false); } }} style={{ cursor: 'pointer' }}>
                    <span className="feat-icon-badge">🔄</span>
                    <div style={{ textAlign: 'left', flex: 1 }}>
                      <p className="feat-title">Crop Rotation</p>
                      <p className="feat-desc">Optimal crop schedules & nutrient suggestions</p>
                    </div>
                    <span className="feat-arrow">➔</span>
                  </div>

                  {/* 5. Mandi Rates */}
                  <div className="feat-row-interactive" onClick={() => { if (requireAuthForFeature()) { setMarketOpen(true); setRotationOpen(false); setGardenOpen(false); setArOpen(false); setFeaturesTabOpen(false); } }} style={{ cursor: 'pointer' }}>
                    <span className="feat-icon-badge">📈</span>
                    <div style={{ textAlign: 'left', flex: 1 }}>
                      <p className="feat-title">Mandi Prices</p>
                      <p className="feat-desc">Query live government mandi agricultural rates</p>
                    </div>
                    <span className="feat-arrow">➔</span>
                  </div>

                  {/* 6. Scan History */}
                  <div className="feat-row-interactive" onClick={() => { if (requireAuthForFeature()) { setHistoryOpen(true); setFeaturesTabOpen(false); } }} style={{ cursor: 'pointer' }}>
                    <span className="feat-icon-badge">📋</span>
                    <div style={{ textAlign: 'left', flex: 1 }}>
                      <p className="feat-title">Diagnosis History</p>
                      <p className="feat-desc">Browse local scan files & healing statistics</p>
                    </div>
                    <span className="feat-arrow">➔</span>
                  </div>

                  {/* 7. Presentation Deck */}
                  <div className="feat-row-interactive" onClick={() => { setPresentationOpen(true); setFeaturesTabOpen(false); }} style={{ cursor: 'pointer' }}>
                    <span className="feat-icon-badge">📊</span>
                    <div style={{ textAlign: 'left', flex: 1 }}>
                      <p className="feat-title">Presentation Deck</p>
                      <p className="feat-desc">Interactive AgroAI slideshow presentation pitch</p>
                    </div>
                    <span className="feat-arrow">➔</span>
                  </div>

                  {/* 8. Regional 9 Languages */}
                  <div className="feat-row-interactive" onClick={() => { setFeaturesTabOpen(false); setControlHubOpen(true); }} style={{ cursor: 'pointer' }}>
                    <span className="feat-icon-badge">🌐</span>
                    <div style={{ textAlign: 'left', flex: 1 }}>
                      <p className="feat-title">Multi-lingual Audio</p>
                      <p className="feat-desc">Full translations & speech in 9 local languages</p>
                    </div>
                    <span className="feat-arrow">➔</span>
                  </div>

                </div>
              </div>
            )}
          </div>

          <div className="control-hub-container" ref={hubRef}>
            <button 
              className={`nav-hub-trigger ${controlHubOpen ? 'active' : ''}`}
              onClick={() => setControlHubOpen(!controlHubOpen)}
              title="Open Neon Control Hub"
            >
              <span>⚡</span>
              <span>Control Hub</span>
            </button>
            
            {controlHubOpen && (
              <div className="neon-hub-card">
                {user ? (
                  <div className="hub-user-profile">
                    <span className="hub-email-title">Logged in as</span>
                    <span className="hub-email-val">{userLabel}</span>
                    <button className="hub-logout-btn" type="button" onClick={() => { handleLogout(); setControlHubOpen(false); }}>
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="hub-auth-grid">
                    <button className="hub-auth-btn hub-auth-login" type="button" onClick={() => { setAuthMode('login'); setControlHubOpen(false); }}>
                      Login
                    </button>
                    <button className="hub-auth-btn hub-auth-signup" type="button" onClick={() => { setAuthMode('signup'); setControlHubOpen(false); }}>
                      Signup
                    </button>
                  </div>
                )}

                <div className="hub-grid">
                  {/* Farm Monitor button */}
                  <button 
                    className="hub-btn hub-btn-garden" 
                    onClick={() => { if (!requireAuthForFeature()) return; setGardenOpen(true); setControlHubOpen(false); }} 
                    title="Smart Farm Monitor"
                  >
                    <span className="hub-emoji">🚜</span>
                    <span>Smart Farm</span>
                  </button>

                  {/* AR Scan button */}
                  <button 
                    className="hub-btn hub-btn-ar" 
                    onClick={() => { if (!requireAuthForFeature()) return; setArOpen(true); setControlHubOpen(false); }} 
                    title="AR Live Scanner"
                  >
                    <span className="hub-emoji">🤖</span>
                    <span>AR Scan</span>
                  </button>

                  {/* Rotation button */}
                  <button 
                    className={`hub-btn hub-btn-rotation ${rotationOpen ? 'active' : ''}`}
                    onClick={() => { if (!requireAuthForFeature()) return; setRotationOpen(!rotationOpen); setGardenOpen(false); setArOpen(false); setControlHubOpen(false); }} 
                    title="Crop Rotation Advisor"
                  >
                    <span className="hub-emoji">🔄</span>
                    <span>Rotation</span>
                  </button>

                  {/* History button */}
                  <button 
                    className="hub-btn hub-btn-history" 
                    onClick={() => { if (!requireAuthForFeature()) return; setHistoryOpen(true); setControlHubOpen(false); }} 
                    title="Scan History"
                  >
                    <span className="hub-emoji">📋</span>
                    <span>History</span>
                    {scanCount > 0 && (
                      <span className="hub-badge">
                        {scanCount > 99 ? '99+' : scanCount}
                      </span>
                    )}
                  </button>

                  {/* Mandi Prices button */}
                  <button 
                    className={`hub-btn hub-btn-market ${marketOpen ? 'active' : ''}`}
                    onClick={() => { if (!requireAuthForFeature()) return; setMarketOpen(!marketOpen); setRotationOpen(false); setGardenOpen(false); setArOpen(false); setControlHubOpen(false); }} 
                    title="Live Mandi Rates"
                  >
                    <span className="hub-emoji">📈</span>
                    <span>Mandi Rates</span>
                  </button>

                </div>

                {/* Settings Section (Language & Theme) */}
                <div className="hub-settings-section">
                  <div className="hub-settings-row">
                    <span className="hub-settings-label">🌐 Language</span>
                    <div className="hub-lang-selector">
                      {LANGUAGES.map(l => (
                        <button 
                          key={l.code} 
                          type="button"
                          className={`hub-lang-pill ${language === l.code ? 'active' : ''}`}
                          onClick={() => handleLanguageChange(l.code)}
                        >
                          <span>{l.flag}</span>
                          <span className="hub-lang-text">{l.native.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="hub-settings-row">
                    <span className="hub-settings-label">🎨 Background Theme</span>
                    <div className="hub-theme-selector" style={{ flexWrap: 'wrap', gap: '8px' }}>
                      <button 
                        type="button" 
                        onClick={() => setTheme('dark-slate')}
                        className={`hub-theme-dot theme-slate ${theme === 'dark-slate' ? 'active' : ''}`}
                        title="Night Slate (Default)"
                      />
                      <button 
                        type="button" 
                        onClick={() => setTheme('forest-green')}
                        className={`hub-theme-dot theme-forest ${theme === 'forest-green' ? 'active' : ''}`}
                        title="Forest Green"
                      />
                      <button 
                        type="button" 
                        onClick={() => setTheme('warm-clay')}
                        className={`hub-theme-dot theme-clay ${theme === 'warm-clay' ? 'active' : ''}`}
                        title="Warm Clay"
                      />
                      <button 
                        type="button" 
                        onClick={() => setTheme('deep-ocean')}
                        className={`hub-theme-dot theme-ocean ${theme === 'deep-ocean' ? 'active' : ''}`}
                        title="Deep Ocean"
                      />
                      {/* Formal Themes */}
                      <button 
                        type="button" 
                        onClick={() => setTheme('carbon-gray')}
                        className={`hub-theme-dot theme-carbon ${theme === 'carbon-gray' ? 'active' : ''}`}
                        title="Carbon Gray (Formal)"
                      />
                      <button 
                        type="button" 
                        onClick={() => setTheme('midnight-navy')}
                        className={`hub-theme-dot theme-navy ${theme === 'midnight-navy' ? 'active' : ''}`}
                        title="Midnight Navy (Formal)"
                      />
                      {/* Dashing Themes */}
                      <button 
                        type="button" 
                        onClick={() => setTheme('cyber-purple')}
                        className={`hub-theme-dot theme-purple ${theme === 'cyber-purple' ? 'active' : ''}`}
                        title="Cyber Purple (Dashing)"
                      />
                      <button 
                        type="button" 
                        onClick={() => setTheme('crimson-rust')}
                        className={`hub-theme-dot theme-rust ${theme === 'crimson-rust' ? 'active' : ''}`}
                        title="Crimson Rust (Dashing)"
                      />
                      {/* Formal White Theme */}
                      <button 
                        type="button" 
                        onClick={() => setTheme('pure-white')}
                        className={`hub-theme-dot theme-white ${theme === 'pure-white' ? 'active' : ''}`}
                        title="Formal White (Light)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="nav-status">
            <span className="status-dot" />
            <span className="status-text">AI Online</span>
          </div>
        </div>
      </nav>

      {/* ── Mobile Menu Panel ── */}
      <div className={`mobile-menu-panel ${mobileMenuOpen ? 'menu-open' : ''}`}>
        <div className="mobile-menu-section">
          <div className="mobile-menu-section-title">Features</div>
          <div className="mobile-menu-grid">
            <button className="mobile-menu-item" onClick={() => { if (!requireAuthForFeature()) return; setGardenOpen(true); setMobileMenuOpen(false); }}>
              <span className="mm-icon">🚜</span> Smart Farm
            </button>
            <button className="mobile-menu-item" onClick={() => { if (!requireAuthForFeature()) return; setArOpen(true); setMobileMenuOpen(false); }}>
              <span className="mm-icon">🤖</span> AR Scan
            </button>
            <button className="mobile-menu-item" onClick={() => { if (!requireAuthForFeature()) return; setRotationOpen(true); setMobileMenuOpen(false); }}>
              <span className="mm-icon">🔄</span> Crop Rotation
            </button>
            <button className="mobile-menu-item" onClick={() => { if (!requireAuthForFeature()) return; setMarketOpen(true); setMobileMenuOpen(false); }}>
              <span className="mm-icon">📈</span> Mandi Prices
            </button>
            <button className="mobile-menu-item" onClick={() => { if (!requireAuthForFeature()) return; setHistoryOpen(true); setMobileMenuOpen(false); }}>
              <span className="mm-icon">📋</span> Scan History
              {scanCount > 0 && <span className="bnav-badge">{scanCount > 99 ? '99+' : scanCount}</span>}
            </button>
            <button className="mobile-menu-item" onClick={() => { setFertilizerCalcOpen(true); setMobileMenuOpen(false); }}>
              <span className="mm-icon">🧪</span> Fertilizer Calc
            </button>
            <button className="mobile-menu-item" onClick={() => { setSoilCardOpen(true); setMobileMenuOpen(false); }}>
              <span className="mm-icon">📄</span> Soil Card Reader
            </button>
            <button className="mobile-menu-item" onClick={() => { setOutbreakRadarOpen(true); setMobileMenuOpen(false); }}>
              <span className="mm-icon">🚨</span> Outbreak Radar
            </button>
            <button className="mobile-menu-item" onClick={() => { setNdviOpen(true); setMobileMenuOpen(false); }}>
              <span className="mm-icon">🛰️</span> Satellite NDVI
            </button>
            <button className="mobile-menu-item" onClick={() => { setLedgerOpen(true); setMobileMenuOpen(false); }}>
              <span className="mm-icon">💰</span> Farm Ledger
            </button>
            <button className="mobile-menu-item" onClick={() => { setIrrigationOpen(true); setMobileMenuOpen(false); }}>
              <span className="mm-icon">💧</span> Smart Irrigation
            </button>
            <button className="mobile-menu-item" onClick={() => { setVoiceAssistantOpen(true); setMobileMenuOpen(false); }}>
              <span className="mm-icon">🗣️</span> Voice AI Assistant
            </button>
            <button className="mobile-menu-item" onClick={() => { setPresentationOpen(true); setMobileMenuOpen(false); }}>
              <span className="mm-icon">📊</span> App Overview
            </button>
          </div>
        </div>

        <div className="mobile-menu-section">
          <div className="mobile-menu-section-title">Account</div>
          <div className="mobile-menu-grid">
            {user ? (
              <>
                <button className="mobile-menu-item" style={{ gridColumn: '1 / -1', flexDirection: 'row', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px' }}>👤 {userLabel}</span>
                </button>
                <button className="mobile-menu-item" onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>
                  <span className="mm-icon">🚪</span> Logout
                </button>
              </>
            ) : (
              <>
                <button className="mobile-menu-item" onClick={() => { setAuthMode('login'); setMobileMenuOpen(false); }}>
                  <span className="mm-icon">🔑</span> Login
                </button>
                <button className="mobile-menu-item" onClick={() => { setAuthMode('signup'); setMobileMenuOpen(false); }}>
                  <span className="mm-icon">📝</span> Sign Up
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mobile-menu-section">
          <div className="mobile-menu-section-title">Settings</div>
          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '8px' }}>🌐 Language</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    type="button"
                    className={`hub-lang-pill ${language === l.code ? 'active' : ''}`}
                    onClick={() => handleLanguageChange(l.code)}
                    style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '8px' }}
                  >
                    {l.flag} {l.native.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '8px' }}>🎨 Theme</span>
              <div className="hub-theme-selector" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button type="button" onClick={() => setTheme('dark-slate')} className={`hub-theme-dot theme-slate ${theme === 'dark-slate' ? 'active' : ''}`} title="Night Slate" />
                <button type="button" onClick={() => setTheme('forest-green')} className={`hub-theme-dot theme-forest ${theme === 'forest-green' ? 'active' : ''}`} title="Forest Green" />
                <button type="button" onClick={() => setTheme('warm-clay')} className={`hub-theme-dot theme-clay ${theme === 'warm-clay' ? 'active' : ''}`} title="Warm Clay" />
                <button type="button" onClick={() => setTheme('deep-ocean')} className={`hub-theme-dot theme-ocean ${theme === 'deep-ocean' ? 'active' : ''}`} title="Deep Ocean" />
                <button type="button" onClick={() => setTheme('carbon-gray')} className={`hub-theme-dot theme-carbon ${theme === 'carbon-gray' ? 'active' : ''}`} title="Carbon Gray" />
                <button type="button" onClick={() => setTheme('midnight-navy')} className={`hub-theme-dot theme-navy ${theme === 'midnight-navy' ? 'active' : ''}`} title="Midnight Navy" />
                <button type="button" onClick={() => setTheme('cyber-purple')} className={`hub-theme-dot theme-purple ${theme === 'cyber-purple' ? 'active' : ''}`} title="Cyber Purple" />
                <button type="button" onClick={() => setTheme('crimson-rust')} className={`hub-theme-dot theme-rust ${theme === 'crimson-rust' ? 'active' : ''}`} title="Crimson Rust" />
                <button type="button" onClick={() => setTheme('pure-white')} className={`hub-theme-dot theme-white ${theme === 'pure-white' ? 'active' : ''}`} title="Formal White" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Scan History Panel ── */}
      <ScanHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onRestore={handleRestoreRecord}
      />

      {/* ── AR Scanner ── */}
      <ARScanner
        open={arOpen}
        onClose={() => setArOpen(false)}
        language={language}
        onSendToFull={handleARCapture}
      />

      {gardenOpen && <GardenDashboard onClose={() => setGardenOpen(false)} />}

      {presentationOpen && (
        <PresentationDeck onClose={() => setPresentationOpen(false)} />
      )}

      {showOfflineQueueModal && (
        <div className="modal-backdrop animate-fadein" onClick={() => setShowOfflineQueueModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div className="offline-queue-modal" onClick={e => e.stopPropagation()} style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '24px', maxWidth: '520px', width: '100%', padding: '24px',
            color: '#fff', boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>📡</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#38bdf8' }}>Offline Field Mode Queue</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{pendingScansList.length} leaf scan(s) waiting for connection</p>
                </div>
              </div>
              <button onClick={() => setShowOfflineQueueModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            {pendingScansList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8' }}>
                <p style={{ fontSize: '14px', marginBottom: '8px' }}>🎉 Your offline queue is empty!</p>
                <p style={{ fontSize: '12px' }}>Photos snapped while offline in the field will appear here and auto-upload when you reconnect.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px', maxHeight: '340px', overflowY: 'auto', marginBottom: '20px' }}>
                {pendingScansList.map((item, idx) => (
                  <div key={item.id || idx} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px', padding: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#334155', overflow: 'hidden', flexShrink: 0 }}>
                        <img src={URL.createObjectURL(item.imageBlob)} alt="Pending scan" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div>
                        <strong style={{ fontSize: '13px', display: 'block' }}>{item.imageName || `Field Scan #${idx+1}`}</strong>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Language: {item.language?.toUpperCase() || 'EN'} • Queued in Field</span>
                      </div>
                    </div>
                    <button onClick={async () => {
                      await removePendingScan(item.id);
                      await loadPendingScansList();
                    }} style={{
                      background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444',
                      color: '#f87171', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer'
                    }}>Delete</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              {pendingScansList.length > 0 && (
                <button onClick={() => syncPendingScans()} style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none', color: '#fff', padding: '10px 18px', borderRadius: '12px',
                  fontWeight: 'bold', fontSize: '13px', cursor: 'pointer'
                }}>
                  🔄 Sync Queue Now ({pendingScansList.length})
                </button>
              )}
              <button onClick={() => setShowOfflineQueueModal(false)} style={{
                background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff', padding: '10px 16px', borderRadius: '12px', fontSize: '13px', cursor: 'pointer'
              }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {authMode !== 'main' && authContent}
      {authMode === 'main' && (
        <main className="main-wrap">
          {/* ╔══════════════════════════════════════════════════════════════════════════╗
             ║ DESKTOP ONLY: TOP HORIZONTAL SUB-PAGE NAV (hidden on mobile via CSS)     ║
             ╚══════════════════════════════════════════════════════════════════════════╝ */}
          <nav className="homepage-subpage-nav">
            <button className={homeTab === 'scanner' ? 'active' : ''} onClick={() => { setHomeTab('scanner'); setMarketOpen(false); setRotationOpen(false); setGardenOpen(false); }}>
              <span>🌿</span> Plant Medic & Scanner
            </button>
            <button className={homeTab === 'farm' ? 'active' : ''} onClick={() => { setHomeTab('farm'); setGardenOpen(true); setMarketOpen(false); }}>
              <span>🌱</span> Smart Farm Dashboard
            </button>
            <button className={homeTab === 'advisory' ? 'active' : ''} onClick={() => { setHomeTab('advisory'); setMarketOpen(true); setGardenOpen(false); }}>
              <span>🌾</span> Mandi Rates & Rotation
            </button>
            <button className={homeTab === 'schemes' ? 'active' : ''} onClick={() => { setHomeTab('schemes'); setMarketOpen(false); setRotationOpen(false); setGardenOpen(false); }}>
              <span>📜</span> Govt Schemes & Subsidy
            </button>
            <button className={homeTab === 'ledger' ? 'active' : ''} onClick={() => { setHomeTab('ledger'); setMarketOpen(false); setRotationOpen(false); setGardenOpen(false); }}>
              <span>📊</span> Soil Cards & Ledger
            </button>
          </nav>

          {homeTab === 'schemes' ? (
            <div className="tab-screen">
              <GovernmentSchemes
                opts={{
                  plantName: result?.plant?.common_name || 'General Crop',
                  disease: result?.health?.disease || '',
                  isHealthy: result?.health?.is_healthy ?? true,
                  cropType: result?.plant?.crop_type || '',
                  severity: result?.health?.severity || '',
                  language,
                }}
              />
            </div>
          ) : homeTab === 'ledger' ? (
            <div className="tab-screen">
              <div style={{ display: 'grid', gap: '16px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '32px' }}>🧪</span>
                  <div>
                    <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#38bdf8', margin: 0 }}>Soil & Ledger</h2>
                    <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>NPK tracking & farm accounts</p>
                  </div>
                </div>

                {/* 3 large action cards */}
                <button onClick={() => setSoilCardOpen(true)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '20px 18px', fontSize: '16px', fontWeight: 800,
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.1))',
                  border: '1.5px solid rgba(16,185,129,0.4)', borderRadius: '18px', cursor: 'pointer', color: '#fff',
                  textAlign: 'left', boxShadow: '0 4px 20px rgba(16,185,129,0.15)'
                }}>
                  <span style={{ fontSize: '28px' }}>📷</span>
                  <div>
                    <div>Scan Soil Card (OCR)</div>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: '#6ee7b7', marginTop: '2px' }}>Read govt soil health card</div>
                  </div>
                </button>

                <button onClick={() => setFertilizerCalcOpen(true)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '20px 18px', fontSize: '16px', fontWeight: 800,
                  background: 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(14,165,233,0.1))',
                  border: '1.5px solid rgba(56,189,248,0.4)', borderRadius: '18px', cursor: 'pointer', color: '#fff',
                  textAlign: 'left', boxShadow: '0 4px 20px rgba(56,189,248,0.15)'
                }}>
                  <span style={{ fontSize: '28px' }}>🧮</span>
                  <div>
                    <div>Fertilizer Calculator</div>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: '#7dd3fc', marginTop: '2px' }}>Calculate exact NPK dosages</div>
                  </div>
                </button>

                <button onClick={() => setLedgerOpen(true)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '20px 18px', fontSize: '16px', fontWeight: 800,
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.1))',
                  border: '1.5px solid rgba(245,158,11,0.4)', borderRadius: '18px', cursor: 'pointer', color: '#fff',
                  textAlign: 'left', boxShadow: '0 4px 20px rgba(245,158,11,0.15)'
                }}>
                  <span style={{ fontSize: '28px' }}>📒</span>
                  <div>
                    <div>Farm Expense Ledger</div>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: '#fcd34d', marginTop: '2px' }}>Track income & expenses</div>
                  </div>
                </button>
              </div>
            </div>
          ) : homeTab === 'advisory' ? (
            <div className="tab-screen" style={{ padding: '0' }}>
              <MarketPrices language={language} onClose={() => { setMarketOpen(false); setHomeTab('scanner'); }} />
            </div>
          ) : rotationOpen ? (
            <div className="tab-screen" style={{ padding: '0' }}>
              <CropRotation language={language} onClose={() => setRotationOpen(false)} />
            </div>
          ) : (
            <>


          {/* ══════════════════════════════════════════
              HERO / UPLOAD SECTION
          ══════════════════════════════════════════ */}
          {offlineNotice && (
            <div className="offline-notice-banner" style={{
              margin: '0 0 16px 0',
              padding: '12px 18px',
              borderRadius: '14px',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1.5px solid #38bdf8',
              color: '#bae6fd',
              fontSize: '14px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 0 15px rgba(56, 189, 248, 0.2)'
            }}>
              <span>{offlineNotice}</span>
              {pendingOfflineCount > 0 && (
                <button 
                  onClick={() => setShowOfflineQueueModal(true)}
                  style={{
                    background: '#38bdf8',
                    color: '#0f172a',
                    padding: '4px 12px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  📡 View Queue ({pendingOfflineCount})
                </button>
              )}
            </div>
          )}
          {!result && !loading && (
            <section className="hero-section">

            {/* Title block */}
            <div className="hero-title-block">
              <img src="/3d_plant.jpg" alt="AgroAI 3D Plant" className="animated-3d-plant" />
              <div className="hero-badge">🌾 AI-Powered Crop Doctor</div>
              <h1 className="hero-h1">
                Detect Plant Diseases<br />
                <span className="h1-gradient">Instantly & Accurately</span>
              </h1>
              <p className="hero-sub">
                Upload a photo or use your live camera — get full diagnosis, treatment plan
                and farmer advice in seconds.
              </p>
              <div className="feature-chips">
                <span className="chip chip-green">✅ 99%+ Accuracy</span>
                <span className="chip chip-blue">🔬 AI Vision</span>
                <span className="chip chip-orange">📷 Live Camera</span>
                <span className="chip chip-purple">🌍 3 Languages</span>
              </div>
            </div>


            {/* ── Live Weather + Disease Risk Panel ── */}
            <WeatherPanel language={language} />

            {/* Upload card */}
            {!user ? (
              <div className="upload-card auth-gate-card">
                <div className="auth-gate-icon">🔐</div>
                <h3 className="auth-gate-title">Please sign in to use upload & analysis</h3>
                <p className="auth-gate-text">
                  This feature is available only for signed-in users. Create an account or log in first to upload plant images and analyze them.
                </p>
                <div className="auth-gate-actions">
                  <button type="button" className="auth-submit-btn" onClick={() => setAuthMode('login')}>
                    Login
                  </button>
                  <button type="button" className="auth-back-btn" onClick={() => setAuthMode('signup')}>
                    Signup
                  </button>
                </div>
              </div>
            ) : (
              <form className="upload-card" onSubmit={handleSubmit}>


                {/* ── Input Mode Tabs ── */}
                <div className="mode-tabs">
                  <button type="button"
                    className={`mode-tab ${inputMode === "upload" ? "mode-tab-active" : ""}`}
                    onClick={() => switchMode("upload")}>
                    <span>📁</span> Upload Photo
                  </button>
                  <button type="button"
                    className={`mode-tab ${inputMode === "camera" ? "mode-tab-active mode-tab-cam" : ""}`}
                    onClick={() => { switchMode("camera"); startCamera() }}>
                    <span className={inputMode === "camera" ? "cam-blink" : ""}>📷</span> Live Camera
                  </button>
                </div>

                {/* ══════════ UPLOAD MODE ══════════ */}
                {inputMode === "upload" && (
                  <>
                    <div
                      className={`drop-zone ${dragActive ? "dz-active" : ""} ${preview ? "dz-preview" : ""}`}
                      onDragEnter={handleDrag} onDragOver={handleDrag}
                      onDragLeave={handleDrag} onDrop={handleDrop}
                      onClick={preview ? undefined : () => fileInputRef.current?.click()}>
                      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
                      {preview ? (
                        <div className="preview-wrap">
                          <img src={preview} alt="Plant preview" className="preview-img" />
                          <div className="preview-actions">
                            <button type="button" className="pv-btn pv-change" onClick={() => fileInputRef.current?.click()}>🔄 Change</button>
                            <button type="button" className="pv-btn pv-remove" onClick={resetForm}>🗑 Remove</button>
                          </div>
                        </div>
                      ) : (
                        <div className="dz-inner">
                          <div className="dz-icon-ring"><span className="dz-icon">📷</span></div>
                          <p className="dz-headline">Drop your leaf photo here</p>
                          <p className="dz-sub">or <span className="dz-link">browse files</span></p>
                          <div className="dz-hint-chips">
                            <span>JPG</span><span>PNG</span><span>WEBP</span><span>Max 10 MB</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ══════════ CAMERA MODE ══════════ */}
                {inputMode === "camera" && (
                  <div className="camera-panel">
                    {cameraError && (
                      <div className="camera-error-box">
                        <span>📵</span>
                        <div>
                          <p className="cam-err-title">Camera Unavailable</p>
                          <p className="cam-err-msg">{cameraError}</p>
                        </div>
                        <button type="button" className="cam-retry-btn" onClick={() => startCamera()}>Retry</button>
                      </div>
                    )}

                    {!cameraError && (
                      <div className="camera-viewport">
                        {/* Flash overlay */}
                        {flashEffect && <div className="camera-flash" />}

                        {/* Live video */}
                        <video
                          ref={videoRef}
                          className={`camera-video ${captured ? "cam-vid-hidden" : ""}`}
                          autoPlay playsInline muted
                        />

                        {/* Captured photo preview */}
                        {captured && preview && (
                          <img src={preview} alt="Captured" className="camera-captured-img" />
                        )}

                        {/* Hidden canvas for capture */}
                        <canvas ref={canvasRef} hidden />

                        {/* Camera UI overlay */}
                        {!captured && cameraActive && (
                          <div className={`camera-overlay status-${cameraFeedbackStatus}`}>
                            {/* Viewfinder corners */}
                            <div className="vf-corner vf-tl" /><div className="vf-corner vf-tr" />
                            <div className="vf-corner vf-bl" /><div className="vf-corner vf-br" />
                            <div className="vf-label">
                              {cameraFeedback ? cameraFeedback : "🌿 Aim at a leaf or plant"}
                            </div>
                          </div>
                        )}

                        {/* Camera Controls Bar */}
                        <div className="camera-controls">
                          {!captured ? (
                            <>
                              <button type="button" className="cam-btn cam-btn-flip" onClick={handleSwitchFacing} title="Flip camera">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="22" height="22">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>Flip</span>
                              </button>
                              <button type="button" className="cam-btn cam-shutter" onClick={capturePhoto} title="Capture">
                                <span className="shutter-ring">
                                  <span className="shutter-inner" />
                                </span>
                              </button>
                              <button type="button" className="cam-btn cam-btn-stop" onClick={() => { stopCamera(); setInputMode("upload") }} title="Close camera">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                                  <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                </svg>
                                <span>Close</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button type="button" className="cam-btn cam-btn-retake" onClick={retakePhoto}>
                                🔄 <span>Retake</span>
                              </button>
                              <div className="cam-captured-badge">✅ Photo Ready!</div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Start camera button when not yet active */}
                    {!cameraActive && !cameraError && (
                      <div className="camera-start-prompt">
                        <div className="cam-start-icon">📷</div>
                        <p>Camera is starting...</p>
                        <div className="cam-start-dots">
                          <span /><span /><span />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Low Bandwidth Mode Toggle ── */}
                <div className="bandwidth-toggle-row">
                  <div className="bandwidth-info">
                    <strong>📶 Low Bandwidth Mode</strong>
                    <span>Compresses photos on-device to save data in remote fields.</span>
                  </div>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={lowBandwidthMode} 
                      onChange={(e) => {
                        setLowBandwidthMode(e.target.checked)
                        localStorage.setItem("low_bandwidth_mode", String(e.target.checked))
                      }} 
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                {/* ── Error inline ── */}
                {error && !loading && (
                  <div className="inline-error">
                    <span>⚠️</span>
                    <span>{error}</span>
                    <button type="button" className="err-dismiss" onClick={() => setError(null)}>×</button>
                  </div>
                )}

                {/* ── Analyze button ── */}
                {image && !error && (
                  <button type="submit" className="analyze-btn">
                    <span className="analyze-btn-icon">🔍</span>
                    <span>Analyze Plant Health</span>
                    <span className="analyze-btn-arrow">→</span>
                  </button>
                )}
              </form>
            )}

          </section>
        )}

        {/* ══════════════════════════════════════════
            LOADING STATE
        ══════════════════════════════════════════ */}
        {loading && (
          <section className="loading-section">
            <div className="loading-card">
              <div className="loader-ring-wrap">
                <div className="loader-ring" />
                <div className="loader-ring loader-ring-2" />
                <span className="loader-emoji">🌿</span>
              </div>
              <h2 className="loading-h2">AgroAI is Analyzing</h2>
              <div className="loading-step-box">
                <span className="loading-step-emoji">{LOADING_STEPS[loadingStep].emoji}</span>
                <span className="loading-step-text">{LOADING_STEPS[loadingStep].text}</span>
              </div>
              <div className="prog-bar-bg">
                <div className="prog-bar-fill" style={{ width: `${(loadingStep + 1) * 20}%` }} />
              </div>
              <p className="loading-hint">This may take 15–30 seconds. Please wait…</p>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════
            RESULTS
        ══════════════════════════════════════════ */}
        {result && (
          <section className="results-section animate-fadein">
            {/* ── ULTRA-SIMPLIFIED TRAFFIC LIGHT STATUS BANNER ── */}
            {(() => {
              const isHealthy = result.health?.is_healthy;
              const severity = (result.health?.severity || 'low').toLowerCase();

              let badge = { status: 'OPTIMAL HEALTH', icon: '🟢', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)', border: '#22c55e', text: 'Crop is in optimal health. No disease detected!' };
              if (!isHealthy && (severity === 'high' || severity === 'critical' || severity === 'severe')) {
                badge = { status: 'CRITICAL DANGER ALERT', icon: '🔴', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: `Severe infection (${result.health?.disease || 'Disease'}). Immediate treatment required!` };
              } else if (!isHealthy) {
                badge = { status: 'ACTION RECOMMENDED', icon: '🟡', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: '#f59e0b', text: `Moderate symptoms (${result.health?.disease || 'Disease'}). Apply recommended treatment soon.` };
              }

              return (
                <div style={{
                  background: badge.bg,
                  border: `2px solid ${badge.border}`,
                  borderRadius: '16px',
                  padding: '14px 20px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  boxShadow: `0 0 20px ${badge.color}30`
                }}>
                  <div style={{ fontSize: '32px', lineHeight: 1 }}>{badge.icon}</div>
                  <div style={{ textAlign: 'left' }}>
                    <span style={{ background: badge.color, color: '#000', fontWeight: 900, fontSize: '11px', padding: '3px 10px', borderRadius: '999px', display: 'inline-block', marginBottom: '3px' }}>
                      {badge.status}
                    </span>
                    <strong style={{ display: 'block', fontSize: '15px', color: '#fff' }}>{badge.text}</strong>
                  </div>
                </div>
              );
            })()}
            <div className="results-actions-row" style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="back-btn" onClick={resetForm} style={{ margin: 0 }}>← Scan Another Plant</button>
              {compressionStats && (
                <div className="compression-savings-badge">
                  <span>📶 Low Bandwidth: Compressed {compressionStats.originalSize} → {compressionStats.compressedSize} ({compressionStats.savingPercentage} saved)</span>
                </div>
              )}
              <button 
                className={`voice-btn ${speaking ? 'speaking' : ''}`} 
                onClick={toggleVoiceOutput}
                style={{
                  background: speaking ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  borderColor: speaking ? '#ef4444' : '#10b981',
                  color: speaking ? '#f87171' : '#34d399',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  padding: '6px 16px',
                  borderRadius: '24px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  minHeight: '36px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  margin: 0,
                  transition: 'all 0.2s ease'
                }}
              >
                {speaking ? '⏹️ Stop Voice' : '🔊 Listen to Diagnosis'}
              </button>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%', justifyContent: 'flex-start', marginBottom: '14px' }}>
              <button
                className="share-pdf-btn"
                onClick={handleSharePDF}
                disabled={pdfGenerating}
                style={{
                  background: 'rgba(59, 130, 246, 0.15)',
                  borderColor: '#3b82f6',
                  color: '#60a5fa',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  padding: '6px 16px',
                  borderRadius: '24px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  minHeight: '36px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  margin: 0,
                  transition: 'all 0.2s ease'
                }}
              >
                {pdfGenerating ? '⏳ Generating PDF...' : '📤 Share PDF'}
              </button>
              
              <button
                className="share-pdf-btn"
                onClick={handleDownloadPDF}
                disabled={pdfGenerating}
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  borderColor: '#10b981',
                  color: '#34d399',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  padding: '6px 16px',
                  borderRadius: '24px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  minHeight: '36px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  margin: 0,
                  transition: 'all 0.2s ease'
                }}
              >
                📥 Download PDF
              </button>
            </div>
            </div>

            {/* Disease Name Header */}
            <div className={`disease-name-header ${result.health?.is_healthy ? "healthy" : "diseased"}`}>
              <div className="header-content">
                <div className="header-status">
                  {result.health?.is_healthy ? "✅ Healthy" : "⚠️ Disease"}
                </div>
                <h1 className="main-disease-name">
                  {result.health?.is_healthy ? "Plant is Healthy!" : result.health?.disease || "Unknown"}
                </h1>
                <p className="header-subtitle">{result.recommendation || ""}</p>
              </div>
              {preview && (
                <div className="header-image-container">
                  <img src={preview} alt="Scanned Plant" className="header-image" />
                </div>
              )}
            </div>

            {/* Metric pills */}
            {result.health && (
              <div className="metric-pills-row">
                <div className="mpill mpill-blue">
                  <span className="mpill-icon">🎯</span>
                  <div><div className="mpill-val">{Math.round(result.health.confidence * 100)}%</div><div className="mpill-key">Confidence</div></div>
                </div>
                {!result.health.is_healthy && (
                  <div className={`mpill mpill-sev ${severityClass(result.health.severity)}`}>
                    <span className="mpill-icon">⚡</span>
                    <div><div className="mpill-val">{result.health.severity}</div><div className="mpill-key">Severity</div></div>
                  </div>
                )}
                {result.plant && (
                  <>
                    <div className="mpill mpill-green">
                      <span className="mpill-icon">🌿</span>
                      <div><div className="mpill-val">{result.plant.common_name}</div><div className="mpill-key">Plant</div></div>
                    </div>
                    <div className="mpill mpill-orange">
                      <span className="mpill-icon">🌱</span>
                      <div><div className="mpill-val">{result.plant.growth_stage}</div><div className="mpill-key">Growth Stage</div></div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Plant Classification - Collapsible */}
            {result.plant && (
              <div className="accordion-section">
                <button 
                  className={`accordion-btn ${expandedSections.classification ? "expanded" : ""}`}
                  onClick={() => toggleSection("classification")}
                >
                  <span className="accordion-icon">🌳</span>
                  <span className="accordion-title">Plant Classification</span>
                  <span className="accordion-arrow">›</span>
                </button>
                {expandedSections.classification && (
                  <div className="accordion-content">
                    <div className="plant-info-grid">
                      <div className="pi-item"><span className="pi-label">Common Name</span><span className="pi-val pi-val-bold">{result.plant.common_name || "—"}</span></div>
                      <div className="pi-item"><span className="pi-label">Scientific Name</span><span className="pi-val pi-italic">{result.plant.scientific_name || "—"}</span></div>
                      <div className="pi-item"><span className="pi-label">Family</span><span className="pi-val">{result.plant.family || "—"}</span></div>
                      <div className="pi-item"><span className="pi-label">Crop Type</span><span className="pi-val">{result.plant.crop_type || "—"}</span></div>
                      <div className="pi-item pi-item-full"><span className="pi-label">Growth Stage</span><span className="pi-badge pi-badge-teal">{result.plant.growth_stage || "—"}</span></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Disease Breakdown - Collapsible */}
            {result.disease_information && !result.health?.is_healthy && (
              <div className="accordion-section">
                <button 
                  className={`accordion-btn ${expandedSections.disease ? "expanded" : ""}`}
                  onClick={() => toggleSection("disease")}
                >
                  <span className="accordion-icon">🦠</span>
                  <span className="accordion-title">Disease Breakdown</span>
                  <span className="accordion-arrow">›</span>
                </button>
                {expandedSections.disease && (
                  <div className="accordion-content">
                    <p className="disease-desc">{result.disease_information.description}</p>
                    <div className="disease-cols">
                      <div className="dis-col">
                        <div className="dis-col-title dis-col-red">🔴 Symptoms</div>
                        <ul className="tag-list tag-red">{result.disease_information.symptoms.map((s,i)=><li key={i}>{s}</li>)}</ul>
                      </div>
                      <div className="dis-col">
                        <div className="dis-col-title dis-col-orange">🟠 Causes</div>
                        <ul className="tag-list tag-orange">{result.disease_information.causes.map((c,i)=><li key={i}>{c}</li>)}</ul>
                      </div>
                    </div>
                    <div className="dis-meta-row">
                      <div className="dis-meta-item"><span className="dis-meta-key">🫀 Affected Parts</span><span className="dis-meta-val">{result.disease_information.affected_parts.join(", ")}</span></div>
                      <div className="dis-meta-item"><span className="dis-meta-key">💨 Spread Method</span><span className="dis-meta-val">{result.disease_information.spread_method}</span></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Treatment - Collapsible */}
            {result.treatment && (
              <div className="accordion-section">
                <button 
                  className={`accordion-btn ${expandedSections.treatment ? "expanded" : ""}`}
                  onClick={() => toggleSection("treatment")}
                >
                  <span className="accordion-icon">💊</span>
                  <span className="accordion-title">Treatment & Care Protocol</span>
                  <span className="accordion-arrow">›</span>
                </button>
                {expandedSections.treatment && (
                  <div className="accordion-content">
                    <div className="treat-cols">
                      <div className="treat-box treat-organic">
                        <div className="treat-box-title">🌱 Organic Remedies</div>
                        {result.treatment.organic?.length ? <ul className="treat-list">{result.treatment.organic.map((t,i)=><li key={i}>{t}</li>)}</ul> : <p className="treat-none">Not required</p>}
                      </div>
                      <div className="treat-box treat-chemical">
                        <div className="treat-box-title">🧪 Chemical Solutions</div>
                        {result.treatment.chemical?.length ? <ul className="treat-list">{result.treatment.chemical.map((t,i)=><li key={i}>{t}</li>)}</ul> : <p className="treat-none">Not required</p>}
                      </div>
                      <div className="treat-box treat-fert">
                        <div className="treat-box-title">🌾 Fertilizer</div>
                        {result.treatment.fertilizer?.length ? <ul className="treat-list">{result.treatment.fertilizer.map((t,i)=><li key={i}>{t}</li>)}</ul> : <p className="treat-none">Standard schedule</p>}
                      </div>
                    </div>
                    <div className="care-icons-row">
                      <div className="ci-item ci-blue"><span className="ci-emoji">💧</span><div className="ci-info"><span className="ci-label">Watering</span><span className="ci-val">{result.treatment.watering}</span></div></div>
                      <div className="ci-item ci-yellow"><span className="ci-emoji">☀️</span><div className="ci-info"><span className="ci-label">Sunlight</span><span className="ci-val">{result.treatment.sunlight}</span></div></div>
                      <div className="ci-item ci-brown"><span className="ci-emoji">🟫</span><div className="ci-info"><span className="ci-label">Soil</span><span className="ci-val">{result.treatment.soil}</span></div></div>
                      <div className="ci-item ci-red"><span className="ci-emoji">🌡️</span><div className="ci-info"><span className="ci-label">Temperature</span><span className="ci-val">{result.treatment.temperature}</span></div></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Prevention - Collapsible */}
            {result.prevention && (
              <div className="accordion-section">
                <button 
                  className={`accordion-btn ${expandedSections.prevention ? "expanded" : ""}`}
                  onClick={() => toggleSection("prevention")}
                >
                  <span className="accordion-icon">🛡️</span>
                  <span className="accordion-title">Long-term Prevention</span>
                  <span className="accordion-arrow">›</span>
                </button>
                {expandedSections.prevention && (
                  <div className="accordion-content">
                    <ul className="advice-list advice-purple">
                      {result.prevention.map((item,i)=><li key={i}><span className="adv-num">{i+1}</span>{item}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Farmer Advice - Collapsible */}
            {result.farmer_advice && (
              <div className="accordion-section">
                <button 
                  className={`accordion-btn ${expandedSections.advice ? "expanded" : ""}`}
                  onClick={() => toggleSection("advice")}
                >
                  <span className="accordion-icon">👨‍🌾</span>
                  <span className="accordion-title">Farmer Pro-Advice</span>
                  <span className="accordion-arrow">›</span>
                </button>
                {expandedSections.advice && (
                  <div className="accordion-content">
                    <ul className="advice-list advice-gold">
                      {result.farmer_advice.map((item,i)=><li key={i}><span className="adv-num">{i+1}</span>{item}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* ── Government Schemes - Collapsible ── */}
            <div className="accordion-section">
              <button 
                type="button"
                className={`accordion-btn ${expandedSections.schemes ? "expanded" : ""}`}
                onClick={() => toggleSection("schemes")}
              >
                <span className="accordion-icon">🏛️</span>
                <span className="accordion-title">Government Schemes</span>
                <span className="accordion-arrow">›</span>
              </button>
              {expandedSections.schemes && (
                <div className="accordion-content">
                  <GovernmentSchemes
                    opts={{
                      plantName: result.plant?.common_name || '',
                      disease:   result.health?.disease    || '',
                      isHealthy: result.health?.is_healthy ?? true,
                      cropType:  result.plant?.crop_type   || '',
                      severity:  result.health?.severity   || '',
                      language,
                    }}
                  />
                </div>
              )}
            </div>

            {/* ── Before / After Recovery Tracker - Collapsible ── */}
            <div className="accordion-section">
              <button 
                type="button"
                className={`accordion-btn ${expandedSections.recovery ? "expanded" : ""}`}
                onClick={() => toggleSection("recovery")}
              >
                <span className="accordion-icon">📸</span>
                <span className="accordion-title">Before / After Recovery Tracker</span>
                <span className="accordion-arrow">›</span>
              </button>
              {expandedSections.recovery && (
                <div className="accordion-content">
                  <RecoveryTracker originalResult={result} originalImage={preview} language={language} />
                </div>
              )}
            </div>

            {/* Disclaimer */}
            {result.disclaimer && (
              <div className="disclaimer">
                <span className="disc-icon">⚠️</span>
                <p>{result.disclaimer}</p>
              </div>
            )}

            <button className="scan-again-btn" onClick={resetForm}>🔄 Scan Another Plant</button>
          </section>
        )}


            </>
          )}
        </main>
      )}



      {showShareModal && result && (
        <div className="sh-detail-backdrop" onClick={() => setShowShareModal(false)}>
          <div className="sh-detail-modal share-fallback-modal" onClick={e => e.stopPropagation()}>
            <button className="sh-detail-close" onClick={() => setShowShareModal(false)}>✕</button>
            <h3 className="share-modal-title">📤 Share Plant Report</h3>
            <p className="share-modal-desc">Native sharing is not supported on this browser. Choose an option below to share or download the report.</p>
            
            <div className="share-options-grid">
              <button className="share-option-btn download-btn" onClick={() => { handleDownloadPDF(); setShowShareModal(false); }}>
                <span className="share-icon">📄</span>
                <span className="share-label">Download PDF Report</span>
              </button>
              
              <button className="share-option-btn copy-btn" onClick={() => handleCopyTextReport()}>
                <span className="share-icon">📋</span>
                <span className="share-label">{copied ? "Copied!" : "Copy Text Report"}</span>
              </button>
              
              <a 
                className="share-option-btn whatsapp-btn" 
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(getTextReportForSharing(result))}`}
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => setShowShareModal(false)}
              >
                <span className="share-icon">💬</span>
                <span className="share-label">Share on WhatsApp</span>
              </a>
              
              <a 
                className="share-option-btn telegram-btn" 
                href={`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(getTextReportForSharing(result))}`}
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => setShowShareModal(false)}
              >
                <span className="share-icon">✈️</span>
                <span className="share-label">Share on Telegram</span>
              </a>

              <a 
                className="share-option-btn email-btn" 
                href={`mailto:?subject=${encodeURIComponent(`AgroAI Plant Health Report: ${result.plant?.common_name || 'Plant'}`)}&body=${encodeURIComponent(getTextReportForSharing(result))}`}
                onClick={() => setShowShareModal(false)}
              >
                <span className="share-icon">✉️</span>
                <span className="share-label">Share via Email</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── GLOBAL APP-WIDE AI FARMER ASSISTANT POP-UP CHATBOT ── */}
      <GlobalAIChatModal
        language={activeLang}
        scanContext={result ? `${result.plant?.common_name || 'Plant'} (${result.plant?.scientific_name || ''}): ${result.health?.disease || 'Healthy'}. Recommendation: ${result.recommendation || ''}` : ''}
      />

      {/* ── STANDARD BOTTOM NAVIGATION BAR (WhatsApp / Instagram style) ── */}
      <nav className="bottom-nav">
        {/* Home / Scanner Tab */}
        <button
          className={`bottom-nav-item ${homeTab === 'scanner' && authMode === 'main' ? 'bnav-active' : ''}`}
          onClick={() => {
            setHomeTab('scanner');
            setMarketOpen(false);
            setRotationOpen(false);
            setGardenOpen(false);
            setAuthMode('main');
            setMobileMenuOpen(false);
          }}
        >
          <span className="bnav-icon">🏠</span>
          <span className="bnav-label">Home</span>
        </button>

        {/* Farm Tab */}
        <button
          className={`bottom-nav-item ${homeTab === 'farm' && authMode === 'main' ? 'bnav-active' : ''}`}
          onClick={() => {
            if (!requireAuthForFeature()) return;
            setHomeTab('farm');
            setGardenOpen(true);
            setMarketOpen(false);
            setRotationOpen(false);
            setMobileMenuOpen(false);
          }}
        >
          <span className="bnav-icon">🌱</span>
          <span className="bnav-label">Farm</span>
        </button>

        {/* Center Scan FAB */}
        <button
          className={`bottom-nav-item bnav-scan ${homeTab === 'scanner' && authMode === 'main' ? 'bnav-active' : ''}`}
          onClick={() => {
            if (!requireAuthForFeature()) return;
            setHomeTab('scanner');
            setMarketOpen(false);
            setRotationOpen(false);
            setGardenOpen(false);
            setAuthMode('main');
            setMobileMenuOpen(false);
            if (result) resetForm();
          }}
        >
          <span className="bnav-icon">📷</span>
          <span className="bnav-label">Scan</span>
        </button>

        {/* Mandi / Market Tab */}
        <button
          className={`bottom-nav-item ${homeTab === 'advisory' && authMode === 'main' ? 'bnav-active' : ''}`}
          onClick={() => {
            if (!requireAuthForFeature()) return;
            setHomeTab('advisory');
            setMarketOpen(true);
            setGardenOpen(false);
            setRotationOpen(false);
            setMobileMenuOpen(false);
          }}
        >
          <span className="bnav-icon">📈</span>
          <span className="bnav-label">Mandi</span>
        </button>

        {/* More / Menu Tab */}
        <button
          className={`bottom-nav-item ${mobileMenuOpen ? 'bnav-active' : ''}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span className="bnav-icon">{mobileMenuOpen ? '✕' : '☰'}</span>
          <span className="bnav-label">More</span>
        </button>
      </nav>

      {/* ── Fertilizer & Chemical Dosage Calculator Modal ── */}
      <FertilizerCalculatorModal
        open={fertilizerCalcOpen}
        onClose={() => setFertilizerCalcOpen(false)}
      />

      {/* ── Soil Health Card Reader Modal ── */}
      <SoilCardScannerModal
        open={soilCardOpen}
        onClose={() => setSoilCardOpen(false)}
      />

      {/* ── Disease Outbreak Radar Modal ── */}
      <OutbreakRadarModal
        open={outbreakRadarOpen}
        onClose={() => setOutbreakRadarOpen(false)}
      />

      {/* ── Satellite NDVI Canopy Monitor Modal ── */}
      <NDVIMapModal
        open={ndviOpen}
        onClose={() => setNdviOpen(false)}
      />

      {/* ── Farm Expense & Profit Ledger Modal ── */}
      <FarmLedgerModal
        open={ledgerOpen}
        onClose={() => setLedgerOpen(false)}
      />

      {/* ── AI Irrigation Scheduler Modal ── */}
      <IrrigationSchedulerModal
        open={irrigationOpen}
        onClose={() => setIrrigationOpen(false)}
      />

      {/* ── Voice Assistant Modal ── */}
      <VoiceAssistantModal
        open={voiceAssistantOpen}
        onClose={() => setVoiceAssistantOpen(false)}
      />
    </div>
  )
}