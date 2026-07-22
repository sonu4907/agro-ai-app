import { useState, useEffect, useRef } from 'react';
import pptxgen from 'pptxgenjs';
import './PresentationDeck.css';

interface PresentationDeckProps {
  onClose: () => void;
}

export default function PresentationDeck({ onClose }: PresentationDeckProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lightTheme, setLightTheme] = useState(false);
  const deckRef = useRef<HTMLDivElement>(null);
  const autoplayTimer = useRef<number | null>(null);

  const handleDownloadPPTX = () => {
    let pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';

    // Color definitions
    const COLOR_PRIMARY = '16A34A'; // Green
    const COLOR_BG_DARK = '070F1E'; // Dark Blue Background
    const COLOR_TEXT_LIGHT = 'F8FAFC'; // Off-white
    const COLOR_TEXT_DARK = '0F172A'; // Slate Dark
    const COLOR_MUTED = '64748B'; // Muted slate

    // --- Slide 1: Cover Page ---
    let s1 = pptx.addSlide();
    s1.background = { color: COLOR_BG_DARK };
    s1.addText('PLANT MEDIC', {
      x: 0.5, y: 1.6, w: 9.0, h: 0.8,
      fontSize: 44, bold: true, color: COLOR_TEXT_LIGHT, fontFace: 'Arial',
      align: 'center'
    });
    s1.addText('AI-Powered Smart Farming Ecosystem', {
      x: 0.5, y: 2.5, w: 9.0, h: 0.5,
      fontSize: 22, bold: true, color: COLOR_PRIMARY, fontFace: 'Arial',
      align: 'center'
    });
    s1.addText('Early Disease Detection • Smart IoT Monitoring • Weather Intelligence', {
      x: 0.5, y: 3.1, w: 9.0, h: 0.4,
      fontSize: 14, color: COLOR_MUTED, fontFace: 'Arial',
      align: 'center'
    });
    s1.addText('Presented by: Sunil Wadkar', {
      x: 0.5, y: 4.5, w: 9.0, h: 0.8,
      fontSize: 14, color: COLOR_TEXT_LIGHT, fontFace: 'Arial', bold: true,
      align: 'center'
    });
    s1.addText('MSME IDEA HACKATHON 2026', {
      x: 0.5, y: 5.5, w: 9.0, h: 0.3,
      fontSize: 12, bold: true, color: COLOR_PRIMARY, fontFace: 'Arial',
      align: 'center'
    });

    // --- Slide 2: Problem Statement ---
    let s2 = pptx.addSlide();
    s2.background = { color: 'FFFFFF' };
    s2.addText('PROBLEM STATEMENT', { x: 0.5, y: 0.4, w: 9.0, h: 0.4, fontSize: 24, bold: true, color: COLOR_PRIMARY });
    s2.addText('Agriculture faces significant challenges due to delayed crop disease detection, unpredictable weather, and limited access to timely expert guidance. These result in reduced crop yield, higher farming costs, excessive pesticide use, and financial losses.', {
      x: 0.5, y: 1.0, w: 9.0, h: 1.1, fontSize: 14, color: COLOR_TEXT_DARK
    });
    s2.addText('Key Problems:', { x: 0.5, y: 2.3, w: 9.0, h: 0.3, fontSize: 16, bold: true, color: 'EF4444' });
    s2.addText('• Late Crop Disease Detection: Up to 65% yield loss if not caught within 7 days.\n• Unpredictable Weather Conditions: Sudden humidity shifts trigger fast pathogen spread.\n• Scarcity of Expert Guidance: One qualified agricultural expert covers 5,000+ farmers.\n• Excessive Pesticide Abuse: Over-spraying degrades soil quality and wastes capital.', {
      x: 0.5, y: 2.7, w: 9.0, h: 1.8, fontSize: 13, color: COLOR_TEXT_DARK
    });

    // --- Slide 3: Our Solution ---
    let s3 = pptx.addSlide();
    s3.background = { color: 'FFFFFF' };
    s3.addText('OUR SOLUTION: PLANT MEDIC', { x: 0.5, y: 0.4, w: 9.0, h: 0.4, fontSize: 24, bold: true, color: COLOR_PRIMARY });
    s3.addText('An AI-powered smart farming platform that helps farmers detect crop diseases early, receive treatment recommendations, monitor fields through IoT sensors, and make informed decisions using weather intelligence.', {
      x: 0.5, y: 1.0, w: 9.0, h: 1.0, fontSize: 14, color: COLOR_TEXT_DARK
    });
    s3.addText('Core Solution Pillars:', { x: 0.5, y: 2.2, w: 9.0, h: 0.3, fontSize: 16, bold: true, color: COLOR_PRIMARY });
    s3.addText('• AI-Based Crop Disease Detection: 99%+ accurate diagnosis in 2 seconds from mobile images.\n• Weather-Based Disease Risk Prediction: Meteorological humidity & heat formula warning.\n• IoT Soil NPK & pH Telemetry: ESP32 edge soil nutrients, acidity, and moisture tracking loop.\n• AI Crop Rotation & Fertilizer Guide: Prevents soil degradation and suggests precise fertilizer dosing.\n• Government Scheme Integration: Directly connects alert severity to PM-FBY insurance guidelines.', {
      x: 0.5, y: 2.6, w: 9.0, h: 2.2, fontSize: 13, color: COLOR_TEXT_DARK
    });

    // --- Slide 4: How Plant Medic Works ---
    let s4 = pptx.addSlide();
    s4.background = { color: 'FFFFFF' };
    s4.addText('HOW PLANT MEDIC WORKS', { x: 0.5, y: 0.4, w: 9.0, h: 0.4, fontSize: 24, bold: true, color: COLOR_PRIMARY });
    s4.addText('Step 1: Capture & Telemetry\nFarmer uploads leaf photos or ESP32 sensors register parameters (moisture, temp, NPK, pH) automatically.\n\nStep 2: Transmission\nThe data is securely sent over network sockets to our Python FastAPI services.\n\nStep 3: Vision & Formula analysis\nTensorFlow models classify visual leaf structures while weather and soil telemetry suggest optimal chemical balance.\n\nStep 4: Interactive Dashboard\nDelivers organic/chemical recipes, fertilizer guides, and matching agricultural subsidies in under 2 seconds.', {
      x: 0.5, y: 1.0, w: 9.0, h: 4.8, fontSize: 13, color: COLOR_TEXT_DARK
    });

    // --- Slide 5: Key Features ---
    let s5 = pptx.addSlide();
    s5.background = { color: 'FFFFFF' };
    s5.addText('KEY PRODUCT FEATURES', { x: 0.5, y: 0.4, w: 9.0, h: 0.4, fontSize: 24, bold: true, color: COLOR_PRIMARY });
    s5.addText('• AI Disease Detection: Instantly scans visual foliage to map symptoms and diagnosis.\n• Weather Intelligence: Calculates micro-climate bacterial and fungal infection warnings.\n• Smart IoT Monitoring: ESP32 node logs soil NPK, moisture, and pH values continuously.\n• AI Fertilizer & Soil Nutrient Guide: Tells farmers exactly what nutrients to add to avoid over-fertilization.\n• AI Crop Rotation Planner: Schedules rotation sequences (e.g., legumes) to break disease loops and restore NPK.\n• Government Schemes: Matches warning parameters to PM-FBY crop insurance and subsidies.\n• Smart Recovery Tracker: Chronological image log database to track visual crop recovery.', {
      x: 0.5, y: 1.1, w: 9.0, h: 4.5, fontSize: 13, color: COLOR_TEXT_DARK
    });

    // --- Slide 6: Technology Stack ---
    let s6 = pptx.addSlide();
    s6.background = { color: 'FFFFFF' };
    s6.addText('TECHNOLOGY STACK', { x: 0.5, y: 0.4, w: 9.0, h: 0.4, fontSize: 24, bold: true, color: COLOR_PRIMARY });
    
    s6.addTable(
      [
        [
          { text: 'Layer', options: { bold: true, color: 'FFFFFF', fill: { color: COLOR_PRIMARY } } },
          { text: 'Technology', options: { bold: true, color: 'FFFFFF', fill: { color: COLOR_PRIMARY } } },
          { text: 'Purpose', options: { bold: true, color: 'FFFFFF', fill: { color: COLOR_PRIMARY } } }
        ],
        [
          { text: 'Artificial Intelligence' },
          { text: 'TensorFlow / Teachable Machine / Python' },
          { text: 'Foliage disease diagnostic scan model' }
        ],
        [
          { text: 'Mobile & Frontend' },
          { text: 'React Native / Flutter / React SPA' },
          { text: 'User dashboards, camera capture & translation' }
        ],
        [
          { text: 'Cloud Backend' },
          { text: 'FastAPI / Firebase Realtime DB' },
          { text: 'Secure REST API endpoint routers and user database' }
        ],
        [
          { text: 'IoT Edge Hardware' },
          { text: 'ESP32 Microcontroller Module' },
          { text: 'Low-power farm telemetry packet publishing' }
        ],
        [
          { text: 'Sensors Suite' },
          { text: 'Capacitive Moisture, pH probe, NPK telemetry sensor' },
          { text: 'Field soil chemical and moisture telemetry' }
        ],
        [
          { text: 'Weather APIs' },
          { text: 'OpenWeather API integrations' },
          { text: 'Dynamic moisture hazard calculation formulas' }
        ]
      ],
      { x: 0.5, y: 1.2, w: 9.0, h: 3.8, fontSize: 11 }
    );

    // --- Slide 7: Innovation & USP ---
    let s7 = pptx.addSlide();
    s7.background = { color: 'FFFFFF' };
    s7.addText('INNOVATION & UNIQUE SELLING PROPOSITION (USP)', { x: 0.5, y: 0.4, w: 9.0, h: 0.4, fontSize: 24, bold: true, color: COLOR_PRIMARY });
    s7.addText('• Proactive Alerts: Calculates crop hazard alerts before physical signs develop.\n• Low-Cost Frugal Edge Hardware: Custom IoT node requires just ~Rs 1,200 per acre.\n• Soil NPK & pH Telemetry Loop: Continuously maps soil NPK and acidity to optimize fertilizer application.\n• AI Crop Rotation Planner: Recommends crop scheduling to replenish soil nutrients and break pathogen cycles.\n• Direct Scheme matching: Automatically suggests targeted central insurance claims.', {
      x: 0.5, y: 1.2, w: 9.0, h: 4.5, fontSize: 13, color: COLOR_TEXT_DARK
    });

    // --- Slide 8: Impact & Benefits ---
    let s8 = pptx.addSlide();
    s8.background = { color: 'FFFFFF' };
    s8.addText('IMPACT & BENEFITS', { x: 0.5, y: 0.4, w: 9.0, h: 0.4, fontSize: 24, bold: true, color: COLOR_PRIMARY });
    s8.addText('• Minimizes Yield Losses: Early warning saves up to 85% of crop yields.\n• targeted Chemical Control: Targeted organic recipes reduce pesticide spray cost by 40%.\n• Physical Labor Cut: Continuous automated telemetry checks reduce manual soil-testing trips.\n• 24/7 Expert Reach: Digital crop doctor bridges the scarce extension officer gap.\n• Subsidies Fast-Track: Integrated schemes directory supports rural community support.', {
      x: 0.5, y: 1.2, w: 9.0, h: 4.5, fontSize: 14, color: COLOR_TEXT_DARK
    });

    // --- Slide 9: Business Opportunity & MSME Value ---
    let s9 = pptx.addSlide();
    s9.background = { color: 'FFFFFF' };
    s9.addText('BUSINESS OPPORTUNITY & MSME VALUE', { x: 0.5, y: 0.4, w: 9.0, h: 0.4, fontSize: 24, bold: true, color: COLOR_PRIMARY });
    s9.addText('• B2C Subscriptions: Advanced watering triggers and precision alerts for commercial farms.\n• B2B / MSME Franchises: Village entrepreneurs license diagnostic kits and charge scanning fees.\n• B2G Hotspot Mapping: Governments purchase regional disease heatmaps to draft policies.\n• Rural Empowerment: Establishes local assembly, sales, and service maintenance jobs.', {
      x: 0.5, y: 1.2, w: 9.0, h: 4.5, fontSize: 14, color: COLOR_TEXT_DARK
    });

    // --- Slide 10: Future Roadmap ---
    let s10 = pptx.addSlide();
    s10.background = { color: 'FFFFFF' };
    s10.addText('FUTURE ROADMAP', { x: 0.5, y: 0.4, w: 9.0, h: 0.4, fontSize: 24, bold: true, color: COLOR_PRIMARY });
    s10.addText('Phase 1 – MVP Development (Months 1-4)\nAI crop models for core crops (Rice, Tomato, Potato) + Enclosed ESP32 design.\n\nPhase 2 – Pilot Deployment (Months 5-8)\nField tests with 150+ farmers + model refinement + central scheme linking.\n\nPhase 3 – Smart Expansion (Months 9-12)\nPrecision drip valve integration + drone multi-spectral mapping partners.\n\nPhase 4 – National Scale (Year 2+)\nSupport for 100+ crops + vernacular voice support + FPO service rollouts.', {
      x: 0.5, y: 1.1, w: 9.0, h: 4.5, fontSize: 13, color: COLOR_TEXT_DARK
    });

    // --- Slide 11: Conclusion ---
    let s11 = pptx.addSlide();
    s11.background = { color: COLOR_BG_DARK };
    s11.addText('CONCLUSION', { x: 0.5, y: 0.4, w: 9.0, h: 0.4, fontSize: 24, bold: true, color: COLOR_PRIMARY });
    s11.addText('Plant Medic is a scalable, low-cost smart farming ecosystem combining computer vision, IoT soil telemetry, and predictive weather algorithms to protect yields and empower farmers.', {
      x: 0.5, y: 1.5, w: 9.0, h: 1.5, fontSize: 18, color: COLOR_TEXT_LIGHT, align: 'center'
    });
    s11.addText('Key Takeaways:\n✔ Early Disease detection saves crops.\n✔ Frugal design reduces entry barrier (~Rs 1,200/acre).\n✔ Modular MSME model fosters rural technical jobs.\n✔ Ready for integration in central farming associations.', {
      x: 1.5, y: 3.2, w: 7.0, h: 2.0, fontSize: 14, color: COLOR_PRIMARY
    });

    pptx.writeFile({ fileName: 'Plant_Medic_Project_Presentation.pptx' });
  };

  // Slide definitions
  const SLIDES = [
    { title: 'AI-Powered Smart Farming Ecosystem', category: 'Title' },
    { title: 'The Problem: Heavy Costs of Delayed Action', category: 'Problem Statement' },
    { title: 'Our Solution: Integrated Intelligent Ecosystem', category: 'Our Solution' },
    { title: 'How It Works: Step-by-Step Data Flow', category: 'Workflow Engine' },
    { title: 'Interactive Product Demonstration Sandbox', category: 'Feature Demo' },
    { title: 'Technology Stack: Affordable & Scalable API Layers', category: 'Tech Architecture' },
    { title: 'Innovation & USP vs Competitors', category: 'Market Positioning' },
    { title: 'Farmer ROI & Financial Feasibility Calculator', category: 'Impact & ROI' },
    { title: 'Business Model & MSME Value Proposition', category: 'Business Strategy' },
    { title: 'Future Expansion & Precision Agriculture Roadmap', category: 'Future Roadmap' },
    { title: 'Conclusion & Quick Knowledge Check', category: 'Wrap-Up' }
  ];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide]);

  // Autoplay handler
  useEffect(() => {
    if (isPlaying) {
      autoplayTimer.current = window.setInterval(() => {
        nextSlide();
      }, 7000); // 7 seconds per slide
    } else {
      if (autoplayTimer.current) {
        clearInterval(autoplayTimer.current);
        autoplayTimer.current = null;
      }
    }
    return () => {
      if (autoplayTimer.current) clearInterval(autoplayTimer.current);
    };
  }, [isPlaying]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev < SLIDES.length - 1 ? prev + 1 : 0));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : SLIDES.length - 1));
  };

  const jumpToSlide = (idx: number) => {
    setCurrentSlide(idx);
    setDrawerOpen(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      deckRef.current?.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error("Error enabling fullscreen", err);
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  /* ==========================================================================
     INTERACTIVE SLIDE SUB-COMPONENTS & STATES
     ========================================================================== */

  // Slide 2: Problem statement state
  const [activeProblem, setActiveProblem] = useState(0);
  const PROBLEMS = [
    { label: 'Late Disease Detection', loss: 65, desc: 'Dreaded crop diseases (like Blight or Rust) expand geometrically. If diagnosed after 7 days, losses skyrocket to 65% of the total yield.', icon: '🦠' },
    { label: 'Unpredictable Weather Outbreaks', loss: 45, desc: 'Sudden rain spikes relative humidity. Pathogens thrive in dampness, wiping out entire tomato harvests within 48 hours without warning.', icon: '🌧️' },
    { label: 'Expert Guidance Scarcity', loss: 35, desc: 'One qualified agricultural extension officer covers 5,000+ farmers in India. Farmers make unguided decisions, risking crop failure.', icon: '👨‍🔬' },
    { label: 'Excessive Chemical Usage', loss: 20, desc: 'Lack of diagnosis leads to spraying whatever broad-spectrum pesticide is available. This degrades soil acidity and wastes money.', icon: '🧪' }
  ];

  // Slide 3: Solution state
  const [activeSolutionNode, setActiveSolutionNode] = useState(0);
  const SOLUTION_NODES = [
    { label: 'AI Crop Doctor', emoji: '🤖', title: 'Computer Vision Diagnosis', desc: 'Farmers take a photo of the infected leaf. Our custom computer vision model analyzes leaf contours, rust spotting, and color variations, delivering a 99%+ accurate diagnosis in 2 seconds.', features: ['Multi-crop Support', 'Offline-capable model', '99% Accuracy rate', 'Organic remedies database'] },
    { label: 'IoT Soil Guard', emoji: '🚜', title: 'Soil NPK & pH Telemetry', desc: 'Low-cost ESP32 microcontrollers deployed in the field send continuous updates of soil moisture, temperature, pH levels, and primary nutrients (N, P, K) to optimize plant growth.', features: ['NPK & pH sensor probes', 'ESP32 Controller kit', 'Real-time chemical logging', 'Precise fertilizer guide'] },
    { label: 'Weather Sentinel', emoji: '🌤️', title: 'Disease Risk Forecasting', desc: 'By mapping live atmospheric metrics (humidity, temp, wind speed) from weather APIs, the system calculates a disease outbreak probability score BEFORE visible symptoms appear.', features: ['OpenWeather API Sync', 'Risk percentage index', 'Proactive spraying advice', 'Local alerts panel'] },
    { label: 'AI Crop Rotation', emoji: '🔄', title: 'Regenerative Rotation Planner', desc: 'Analyzes historical crop sequences and current NPK depletion profiles to generate crop rotation schedules (like legumes) that naturally restore nitrogen and break persistent disease loops.', features: ['Soil NPK recovery tips', 'Pathogen cycle break', 'Sowing window helper', 'Yield & profit estimates'] },
    { label: 'Gov Scheme Portal', emoji: '🏛️', title: 'Financial Support Directory', desc: 'Translates technical crop alerts into actionable recommendations and automatically suggests local subsidies and government compensation schemes matching the crop and severity.', features: ['PM-FBY Crop Insurance', 'Subsidized fertilizer sync', 'Regional language support', 'Direct scheme links'] }
  ];

  // Slide 4: Workflow sequence state
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);
  const WORKFLOW_STEPS = [
    { title: '1. Leaf Capture & IoT Readings', meta: 'Edge Layer', desc: 'Farmer captures leaf picture via App or ESP32 sensors register current soil moisture (e.g. 28%) and temperature.' },
    { title: '2. Network Transmission', meta: 'API Tunnel', desc: 'The collected telemetry and compressed image are transmitted via Wi-Fi/cellular connection to our FastAPI backend.' },
    { title: '3. Cloud AI Diagnostics', meta: 'Cognitive Engine', desc: 'The image is evaluated against TensorFlow models. In parallel, API triggers calculations combining weather humidity with soil moisture.' },
    { title: '4. Action Dashboard', meta: 'Farming Action', desc: 'Within 2 seconds, the farmer dashboard lights up with the diagnosis, a tailored organic treatment plan, and local subsidy advice.' }
  ];

  // Slide 5: Feature sandbox state
  const [selectedLeaf, setSelectedLeaf] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  // IoT simulator state
  const [soilMoisture, setSoilMoisture] = useState(35);
  const [temperature, setTemperature] = useState(28);
  const [humidity, setHumidity] = useState(70);
  const [soilPh, setSoilPh] = useState(6.5);

  const leavesData: Record<string, any> = {
    tomato: { name: 'Tomato Leaf (Late Blight)', thumb: '🍅', disease: 'Late Blight Outbreak', confidence: 97, treatment: 'Spray diluted copper oxychloride or apply organic neem oil extract. Prune lower stems.' },
    potato: { name: 'Potato Leaf (Early Blight)', thumb: '🥔', disease: 'Early Blight (Alternaria)', confidence: 94, treatment: 'Increase air circulation. Remove infected foliage. Apply organic compost tea.' },
    healthy: { name: 'Healthy Rice Leaf', thumb: '🌾', disease: 'Healthy Crop (No Disease Detected)', confidence: 99, treatment: 'Soil moisture is optimal. Keep standard weeding schedule.' }
  };

  const handleLeafSelect = (key: string) => {
    setSelectedLeaf(key);
    setScanning(true);
    setScanResult(null);
    setTimeout(() => {
      setScanning(false);
      setScanResult(leavesData[key]);
    }, 2000);
  };

  const getIoTAlert = () => {
    if (soilMoisture < 25) {
      return { status: 'danger', icon: '🚨', text: 'Critical Drought Warning: Soil moisture is at ' + soilMoisture + '%. Irrigating immediately is recommended to prevent leaf scorch.' };
    }
    if (soilPh < 6.0) {
      return { status: 'warning', icon: '🧪', text: 'Acidic Soil Alert (pH ' + soilPh.toFixed(1) + '): Nutrient intake restricted. Apply dolomite agricultural lime (~75g/sq.m) to neutralize acidity.' };
    }
    if (soilPh > 7.5) {
      return { status: 'warning', icon: '🧪', text: 'Alkaline Soil Alert (pH ' + soilPh.toFixed(1) + '): High alkalinity blocks iron. Mix in sulfur (~25g/sq.m) or rich organic peat moss.' };
    }
    if (humidity > 85 && temperature > 24) {
      return { status: 'warning', icon: '⚠️', text: 'High Blight Outbreak Risk: Relative humidity (' + humidity + '%) & Temperature (' + temperature + '°C) are in the pathogen outbreak zone. Apply preventive spray.' };
    }
    return { status: 'healthy', icon: '✅', text: 'Farm Parameters Normal: Soil moisture (' + soilMoisture + '%), pH (' + soilPh.toFixed(1) + '), Temp (' + temperature + '°C), and Humidity (' + humidity + '%) are in the optimal growth range.' };
  };

  // Slide 6: Tech stack layer details
  const [activeTechLayer, setActiveTechLayer] = useState(0);
  const TECH_LAYERS = [
    { title: 'AI & Cognitive Layer', tech: 'TensorFlow, CNN, Python, OpenRouter Vision', role: 'Analyzes visual leaf anomalies, identifies pathogen patterns, and generates recommendations.', cost: 'Zero licensing cost (open-source model)' },
    { title: 'Application & Frontend', tech: 'React Native, Flutter, React SPA, TypeScript', role: 'Provides responsive interfaces, camera capture, offline history database, and regional translation filters.', cost: 'Lightweight build, deployable on low-cost smartphones' },
    { title: 'Backend & Cloud Infrastructure', tech: 'FastAPI, Python, Firebase, OpenWeather API', role: 'Coordinates API endpoints, authentication, real-time historical databases, and atmospheric risk formulas.', cost: 'Highly scalable, serverless micro-services structure' },
    { title: 'Physical IoT Edge Node', tech: 'ESP32 microcontroller, Capacitive Moisture Sensor, DHT22', role: 'Collects soil telemetry, manages low-power sleep cycles, and uploads sensor packets.', cost: 'Cost-effective hardware (~$15 per node)' }
  ];

  // Slide 8: ROI Calculator State
  const [farmAcres, setFarmAcres] = useState(5);
  const [acreYieldVal, setAcreYieldVal] = useState(60000); // rupees per acre
  const [diseaseLossPct, setDiseaseLossPct] = useState(25); // percentage crop lost to disease

  // ROI calculations
  const rawAnnualLoss = farmAcres * acreYieldVal * (diseaseLossPct / 100);
  const recoveredLoss = Math.round(rawAnnualLoss * 0.85); // 85% recovered
  const pesticideSavings = Math.round(farmAcres * 3500 * 0.40); // 40% savings on Rs 3500 spray cost/acre
  const netEarningsBoost = recoveredLoss + pesticideSavings;
  const hardwareInvestmentCost = Math.round(5000 + (farmAcres * 1200)); // Base unit + node per acre

  // Slide 10: Future Roadmap State
  const [activeRoadmapPhase, setActiveRoadmapPhase] = useState(0);
  const ROADMAP_PHASES = [
    { title: 'Phase 1 - MVP Development', period: 'Months 1 - 4', details: 'Train AI models for core staple crops (Tomato, Potato, Rice). Finalize ESP32 sensor enclosure prototype. Deploy baseline FastAPI backend and launch React Native client beta.' },
    { title: 'Phase 2 - Pilot Deployment', period: 'Months 5 - 8', details: 'Run local pilots with 150+ smallholders in Maharashtra. Incorporate feedback to refine regional language interfaces. Train models on secondary crops. Integrate PM-FBY schemes.' },
    { title: 'Phase 3 - Smart Expansion', period: 'Months 9 - 12', details: 'Deploy automated drip-irrigation relays synced to IoT telemetry. Partner with drone service providers for multi-spectral field crop analyses. Introduce localized disease heatmaps.' },
    { title: 'Phase 4 - National Scale-up', period: 'Year 2+', details: 'Translate system into 10 regional Indian languages. Support AI model mapping for 100+ fruits and vegetables. Establish FPO licensing models supporting thousands of farms.' }
  ];

  // Slide 11: Quiz State
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState<string | null>(null);
  const QUIZ_OPTS = [
    'Only a simple camera app to take leaf photos',
    'An integrated ecosystem combining AI leaf scanning, soil IoT, and weather forecasting',
    'An expensive satellite imaging service',
    'A marketplace to buy chemical fertilizers'
  ];

  const handleQuizAnswer = (idx: number) => {
    setQuizAnswer(idx);
    if (idx === 1) {
      setQuizScore('Correct! Plant Medic is a holistic, multi-layered platform combining AI, IoT sensors, and weather forecasting for proactive crop care.');
    } else {
      setQuizScore('Incorrect. Try again! Look for the answer that covers all three layers: AI, IoT, and Weather.');
    }
  };

  const renderSlideContent = (slideIndex: number) => {
    switch (slideIndex) {
      case 0:
        return (
          <div className="slide-cover-layout">
            <span className="cover-hackathon-badge">MSME Idea Hackathon 2026</span>
            <h1 className="cover-h1">Plant Medic</h1>
            <p className="cover-sub">
              An AI-Powered smart agricultural ecosystem built on Computer Vision, real-time IoT soil telemetry, and micro-climate risk modeling for proactive disease warnings.
            </p>
            <div className="cover-team-row">
              <div className="cover-team-card">
                <span className="team-card-name">Sunil Wadkar</span>
                <span className="team-card-role">AI & ML Lead</span>
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="slide-split-layout">
            <div className="prob-card-list">
              <p style={{fontSize: '14px', color: 'var(--ppt-text-muted)', marginBottom: '8px'}}>
                Farmers suffer catastrophic financial losses because of five primary interconnected failures in traditional farming. <strong>Select a card below to see the impact:</strong>
              </p>
              {PROBLEMS.map((p, idx) => (
                <div 
                  key={idx} 
                  className={`prob-card ${activeProblem === idx ? 'prob-card-active' : ''}`}
                  onClick={() => setActiveProblem(idx)}
                >
                  <span className="prob-icon">{p.icon}</span>
                  <div className="prob-details">
                    <h4>{p.label}</h4>
                    <p>{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="prob-chart-area">
              <div className="chart-title">Estimated Yield Loss % based on Detection Timing</div>
              
              <div className="svg-chart-container">
                <svg viewBox="0 0 400 240" width="100%" height="100%">
                  {/* Grid lines */}
                  <line x1="40" y1="20" x2="380" y2="20" stroke="rgba(255,255,255,0.05)" />
                  <line x1="40" y1="70" x2="380" y2="70" stroke="rgba(255,255,255,0.05)" />
                  <line x1="40" y1="120" x2="380" y2="120" stroke="rgba(255,255,255,0.05)" />
                  <line x1="40" y1="170" x2="380" y2="170" stroke="rgba(255,255,255,0.05)" />
                  <line x1="40" y1="210" x2="380" y2="210" stroke="rgba(255,255,255,0.2)" />
                  
                  {/* Y-axis Labels */}
                  <text x="10" y="25" fill="var(--ppt-text-muted)" fontSize="10">80%</text>
                  <text x="10" y="75" fill="var(--ppt-text-muted)" fontSize="10">60%</text>
                  <text x="10" y="125" fill="var(--ppt-text-muted)" fontSize="10">40%</text>
                  <text x="10" y="175" fill="var(--ppt-text-muted)" fontSize="10">20%</text>
                  <text x="15" y="215" fill="var(--ppt-text-muted)" fontSize="10">0%</text>

                  {/* Bar 1: Day 1 (Healthy) */}
                  <rect 
                    x="60" 
                    y={210 - 20 * 2.375} 
                    width="40" 
                    height={20 * 2.375} 
                    fill="rgba(34, 197, 94, 0.4)" 
                    stroke="#22c55e" 
                    strokeWidth="1.5"
                    rx="4"
                  />
                  <text x="80" y="225" textAnchor="middle" fill="var(--ppt-text-muted)" fontSize="9">Day 1</text>
                  <text x="80" y={200 - 20 * 2.375} textAnchor="middle" fill="#22c55e" fontWeight="700" fontSize="10">20%</text>

                  {/* Bar 2: Day 3 */}
                  <rect 
                    x="140" 
                    y={210 - 35 * 2.375} 
                    width="40" 
                    height={35 * 2.375} 
                    fill="rgba(234, 179, 8, 0.4)" 
                    stroke="#eab308" 
                    strokeWidth="1.5"
                    rx="4"
                  />
                  <text x="160" y="225" textAnchor="middle" fill="var(--ppt-text-muted)" fontSize="9">Day 3</text>
                  <text x="160" y={200 - 35 * 2.375} textAnchor="middle" fill="#eab308" fontWeight="700" fontSize="10">35%</text>

                  {/* Bar 3: Day 7 */}
                  <rect 
                    x="220" 
                    y={210 - 55 * 2.375} 
                    width="40" 
                    height={55 * 2.375} 
                    fill="rgba(249, 115, 22, 0.4)" 
                    stroke="#f97316" 
                    strokeWidth="1.5"
                    rx="4"
                  />
                  <text x="240" y="225" textAnchor="middle" fill="var(--ppt-text-muted)" fontSize="9">Day 7</text>
                  <text x="240" y={200 - 55 * 2.375} textAnchor="middle" fill="#f97316" fontWeight="700" fontSize="10">55%</text>

                  {/* Bar 4: Day 14 (Late Detection) */}
                  <rect 
                    x="300" 
                    y={210 - 80 * 2.375} 
                    width="40" 
                    height={80 * 2.375} 
                    fill="rgba(239, 68, 68, 0.6)" 
                    stroke="#ef4444" 
                    strokeWidth="1.5"
                    rx="4"
                  />
                  <text x="320" y="225" textAnchor="middle" fill="var(--ppt-text-muted)" fontSize="9">Day 14</text>
                  <text x="320" y={200 - 80 * 2.375} textAnchor="middle" fill="#ef4444" fontWeight="700" fontSize="10">80%</text>
                  
                  {/* Highlights active problem on chart */}
                  <circle cx={60 + activeProblem * 80 + 20} cy={210 - PROBLEMS[activeProblem].loss * 2.375} r="6" fill="#ffffff" stroke="#ef4444" strokeWidth="2" />
                  <line 
                    x1={60 + activeProblem * 80 + 20} 
                    y1={210 - PROBLEMS[activeProblem].loss * 2.375} 
                    x2={60 + activeProblem * 80 + 20} 
                    y2="210" 
                    stroke="#ef4444" 
                    strokeDasharray="4" 
                  />
                </svg>
              </div>
              
              <div style={{fontSize: '11px', marginTop: '12px', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 12px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.05)'}}>
                💥 Active Highlight: <strong>{PROBLEMS[activeProblem].label}</strong> triggers up to <strong>{PROBLEMS[activeProblem].loss}%</strong> of avoidable loss if unchecked.
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="solution-hub-container">
            <div className="sol-graphic">
              <div className="sol-center-node">
                PLANT<br />MEDIC
              </div>
              
              {SOLUTION_NODES.map((n, idx) => {
                const angle = (idx * 2 * Math.PI) / 5;
                const x = Math.round(100 * Math.cos(angle));
                const y = Math.round(100 * Math.sin(angle));
                
                return (
                  <div 
                    key={idx}
                    className={`sol-node ${activeSolutionNode === idx ? 'sol-node-active' : ''}`}
                    style={{
                      transform: `translate(${x}px, ${y}px)`
                    }}
                    onClick={() => setActiveSolutionNode(idx)}
                  >
                    <span className="sol-node-emoji">{n.emoji}</span>
                    <span className="sol-node-label">{n.label}</span>
                  </div>
                );
              })}

              <svg style={{position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0}}>
                {SOLUTION_NODES.map((_, idx) => {
                  const angle = (idx * 2 * Math.PI) / 5;
                  const x2 = 150 + 100 * Math.cos(angle);
                  const y2 = 150 + 100 * Math.sin(angle);
                  return (
                    <line
                      key={idx}
                      x1="150"
                      y1="150"
                      x2={x2}
                      y2={y2}
                      stroke={activeSolutionNode === idx ? 'var(--ppt-accent)' : 'var(--ppt-border)'}
                      strokeWidth={activeSolutionNode === idx ? '3' : '1.5'}
                      style={{
                        transition: 'stroke 0.3s, stroke-width 0.3s'
                      }}
                    />
                  );
                })}
              </svg>
            </div>

            <div className="sol-details-box">
              <div className="sol-details-title">
                <span>{SOLUTION_NODES[activeSolutionNode].emoji}</span>
                <h3>{SOLUTION_NODES[activeSolutionNode].title}</h3>
              </div>
              <p className="sol-details-desc">{SOLUTION_NODES[activeSolutionNode].desc}</p>
              
              <h4 style={{fontSize: '12px', color: 'var(--ppt-text-main)', marginTop: '16px', marginBottom: '8px'}}>Key Capabilities:</h4>
              <ul className="sol-features-list">
                {SOLUTION_NODES[activeSolutionNode].features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="how-layout">
            <p style={{fontSize: '14px', color: 'var(--ppt-text-muted)'}}>
              Plant Medic unites sensor-driven Internet of Things hardware, responsive web portals, and FastAPI vision servers to deliver diagnostic intelligence in seconds. Click on any pipeline segment:
            </p>

            <div className="how-pipeline">
              {WORKFLOW_STEPS.map((s, idx) => (
                <div 
                  key={idx} 
                  className={`how-step ${activeWorkflowStep === idx ? 'how-step-active' : ''}`}
                  onClick={() => setActiveWorkflowStep(idx)}
                >
                  <div className="how-step-circle">
                    {idx === 0 ? '📷' : idx === 1 ? '📶' : idx === 2 ? '⚙️' : '📊'}
                  </div>
                  <div className="how-step-title">{s.title.split(': ')[0]}</div>
                  <div className="how-step-meta">{s.meta}</div>
                  {idx < 3 && (
                    <div 
                      className={`how-arrow ${activeWorkflowStep > idx ? 'how-arrow-active' : ''}`} 
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="how-details-card">
              <h4>{WORKFLOW_STEPS[activeWorkflowStep].title}</h4>
              <p>{WORKFLOW_STEPS[activeWorkflowStep].desc}</p>
              <div style={{marginTop: '12px', display: 'flex', gap: '8px'}}>
                <button 
                  className="ppt-btn ppt-btn-active"
                  onClick={() => {
                    let step = 0;
                    const interval = setInterval(() => {
                      setActiveWorkflowStep(step);
                      step++;
                      if (step > 3) clearInterval(interval);
                    }, 1200);
                  }}
                >
                  ⚡ Run Step Simulation
                </button>
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="feature-sandbox-layout">
            <div className="sandbox-panel">
              <div>
                <h3 className="sandbox-title">📷 AI Leaf Scanner Simulator</h3>
                <p style={{fontSize: '12px', color: 'var(--ppt-text-muted)', marginBottom: '10px'}}>
                  Choose an infected leaf sample below to run it through our simulated vision check:
                </p>
                <div className="leaf-demo-content">
                  <div className="leaf-selector-grid">
                    <div 
                      className={`leaf-select-card ${selectedLeaf === 'tomato' ? 'leaf-select-card-active' : ''}`}
                      onClick={() => handleLeafSelect('tomato')}
                    >
                      <div className="leaf-thumb">🍅</div>
                      <strong>Tomato Leaf</strong>
                    </div>
                    <div 
                      className={`leaf-select-card ${selectedLeaf === 'potato' ? 'leaf-select-card-active' : ''}`}
                      onClick={() => handleLeafSelect('potato')}
                    >
                      <div className="leaf-thumb">🥔</div>
                      <strong>Potato Leaf</strong>
                    </div>
                    <div 
                      className={`leaf-select-card ${selectedLeaf === 'healthy' ? 'leaf-select-card-active' : ''}`}
                      onClick={() => handleLeafSelect('healthy')}
                    >
                      <div className="leaf-thumb">🌾</div>
                      <strong>Healthy Rice</strong>
                    </div>
                  </div>

                  <div className={`leaf-scanner-slot ${scanning ? 'leaf-scanner-slot-active' : ''}`}>
                    {scanning ? (
                      <>
                        <div className="scanner-beam" />
                        <span style={{fontSize: '12px', fontWeight: 600}}>AI Analyzing Structures...</span>
                      </>
                    ) : selectedLeaf ? (
                      <div style={{textAlign: 'center'}}>
                        <span style={{fontSize: '32px'}}>{leavesData[selectedLeaf].thumb}</span>
                        <div style={{fontSize: '12px', fontWeight: 700}}>{leavesData[selectedLeaf].name}</div>
                      </div>
                    ) : (
                      <span style={{fontSize: '12px', color: 'var(--ppt-text-muted)'}}>
                        Drop Leaf in Scanner Slot above
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {scanResult && (
                <div className="scan-result-card">
                  <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px', marginBottom: '6px'}}>
                    <strong>Result: {scanResult.disease}</strong>
                    <span style={{color: 'var(--ppt-accent)', fontWeight: 700}}>{scanResult.confidence}% match</span>
                  </div>
                  <p style={{fontSize: '11px', color: 'var(--ppt-text-muted)'}}>{scanResult.treatment}</p>
                </div>
              )}
            </div>

            <div className="sandbox-panel">
              <div>
                <h3 className="sandbox-title">🚜 IoT Soil Telemetry Simulator</h3>
                <p style={{fontSize: '12px', color: 'var(--ppt-text-muted)', marginBottom: '12px'}}>
                  Drag the sliders to adjust the simulated field sensors. Observe how the system triggers warnings based on combined factors:
                </p>
                
                <div className="iot-sim-content">
                  <div className="sim-slider-row">
                    <div className="sim-slider-label">
                      <span>💧 Soil Moisture</span>
                      <span>{soilMoisture}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="90" 
                      value={soilMoisture}
                      onChange={(e) => setSoilMoisture(Number(e.target.value))}
                      className="sim-slider"
                    />
                  </div>

                  <div className="sim-slider-row">
                    <div className="sim-slider-label">
                      <span>🌡️ Temperature</span>
                      <span>{temperature}°C</span>
                    </div>
                    <input 
                      type="range" 
                      min="5" 
                      max="45" 
                      value={temperature}
                      onChange={(e) => setTemperature(Number(e.target.value))}
                      className="sim-slider"
                    />
                  </div>

                  <div className="sim-slider-row">
                    <div className="sim-slider-label">
                      <span>☁️ Atmospheric Humidity</span>
                      <span>{humidity}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="30" 
                      max="98" 
                      value={humidity}
                      onChange={(e) => setHumidity(Number(e.target.value))}
                      className="sim-slider"
                    />
                  </div>

                  <div className="sim-slider-row">
                    <div className="sim-slider-label">
                      <span>🧪 Soil pH Level</span>
                      <span>{soilPh.toFixed(1)}</span>
                    </div>
                    <input 
                      type="range" 
                      min="4.5" 
                      max="9.0" 
                      step="0.1"
                      value={soilPh}
                      onChange={(e) => setSoilPh(Number(e.target.value))}
                      className="sim-slider"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '14px', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <MiniCircularProgress percentage={soilMoisture} color="#22c55e" label="Moisture" value={`${soilMoisture}%`} />
                  <MiniCircularProgress percentage={Math.round((soilPh / 14) * 100)} color="#22d3ee" label="pH" value={`${soilPh.toFixed(1)}`} />
                  <MiniCircularProgress percentage={65} color="#f97316" label="Nitrogen" value="85" />
                  <MiniCircularProgress percentage={48} color="#eab308" label="Phosphate" value="48" />
                  <MiniCircularProgress percentage={80} color="#bd00ff" label="Potassium" value="160" />
                </div>
              </div>

              <div className={`iot-alert-banner iot-alert-${getIoTAlert().status}`} style={{ marginTop: '12px' }}>
                <span style={{fontSize: '20px'}}>{getIoTAlert().icon}</span>
                <p style={{margin: 0}}>{getIoTAlert().text}</p>
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="tech-pyramid-container">
            <div className="tech-pyramid">
              <p style={{fontSize: '13px', color: 'var(--ppt-text-muted)', textAlign: 'center', marginBottom: '12px'}}>
                Select a layer of the hardware/software stack to view details:
              </p>
              
              {TECH_LAYERS.map((t, idx) => (
                <div 
                  key={idx}
                  className={`pyramid-layer layer-${idx+1} ${activeTechLayer === idx ? 'pyramid-layer-active' : ''}`}
                  onClick={() => setActiveTechLayer(idx)}
                >
                  {t.title}
                </div>
              ))}
            </div>

            <div className="tech-info-card">
              <h3 className="tech-info-title">{TECH_LAYERS[activeTechLayer].title}</h3>
              <div className="tech-item-row">
                <span className="tech-item-key">Software/HW:</span>
                <span className="tech-item-val" style={{fontWeight: 700}}>{TECH_LAYERS[activeTechLayer].tech}</span>
              </div>
              <div className="tech-item-row" style={{marginTop: '16px'}}>
                <span className="tech-item-key">Function:</span>
                <span className="tech-item-val">{TECH_LAYERS[activeTechLayer].role}</span>
              </div>
              <div className="tech-item-row" style={{marginTop: '16px'}}>
                <span className="tech-item-key">Economic Value:</span>
                <span className="tech-item-val" style={{color: 'var(--ppt-accent)', fontWeight: 600}}>{TECH_LAYERS[activeTechLayer].cost}</span>
              </div>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="usp-table-container">
            <table className="usp-table">
              <thead>
                <tr>
                  <th>Advanced Feature Capability</th>
                  <th className="usp-primary">Plant Medic Ecosystem</th>
                  <th>Generic Leaf Scan Apps</th>
                  <th>Manual Agriculture Inspections</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="usp-feature-row">AI-Based Spot Leaf Diagnosis</td>
                  <td className="usp-primary"><span className="check-icon-yes">✔</span> (99% confidence, 2s response)</td>
                  <td><span className="check-icon-yes">✔</span> (Variable model accuracy)</td>
                  <td><span className="check-icon-no">✘</span> (Relies on human expertise)</td>
                </tr>
                <tr>
                  <td className="usp-feature-row">Soil Sensor IoT Alerts (ESP32)</td>
                  <td className="usp-primary"><span className="check-icon-yes">✔</span> (Real-time telemetry link)</td>
                  <td><span className="check-icon-no">✘</span> (No physical hardware integration)</td>
                  <td><span className="check-icon-no">✘</span> (Manual soil checks)</td>
                </tr>
                <tr>
                  <td className="usp-feature-row">Soil NPK & pH Management</td>
                  <td className="usp-primary"><span className="check-icon-yes">✔</span> (Real-time chemical indicators)</td>
                  <td><span className="check-icon-no">✘</span> (No soil nutrient tracking)</td>
                  <td><span className="check-icon-no">✘</span> (Expensive lab tests only)</td>
                </tr>
                <tr>
                  <td className="usp-feature-row">AI Fertilizer & Crop Rotation Planner</td>
                  <td className="usp-primary"><span className="check-icon-yes">✔</span> (NPK replenishment cycles)</td>
                  <td><span className="check-icon-no">✘</span> (No rotational planner)</td>
                  <td><span className="check-icon-no">✘</span> (Traditional cycles only)</td>
                </tr>
                <tr>
                  <td className="usp-feature-row">Weather-Based Outbreak Warnings</td>
                  <td className="usp-primary"><span className="check-icon-yes">✔</span> (Synced forecast calculation)</td>
                  <td><span className="check-icon-no">✘</span> (Retroactive checking only)</td>
                  <td><span className="check-icon-no">✘</span> (Guesswork based on clouds)</td>
                </tr>
                <tr>
                  <td className="usp-feature-row">Integrated Subsidy suggestions</td>
                  <td className="usp-primary"><span className="check-icon-yes">✔</span> (PM-FBY & scheme suggestions)</td>
                  <td><span className="check-icon-no">✘</span> (Diagnostics only)</td>
                  <td><span className="check-icon-yes">✔</span> (Through village council agents)</td>
                </tr>
                <tr>
                  <td className="usp-feature-row">Before/After Recovery tracking</td>
                  <td className="usp-primary"><span className="check-icon-yes">✔</span> (Saves sequence of images)</td>
                  <td><span className="check-icon-no">✘</span> (No tracking database)</td>
                  <td><span className="check-icon-no">✘</span> (Mental notes only)</td>
                </tr>
                <tr>
                  <td className="usp-feature-row">Average Hardware Setup Cost</td>
                  <td className="usp-primary" style={{fontWeight: 700}}>Low (~Rs 1,200 per acre)</td>
                  <td>Free app / High Ads</td>
                  <td>Free (but high labor cost)</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      case 7:
        return (
          <div className="roi-container">
            <div className="roi-inputs-panel">
              <p style={{fontSize: '13px', color: 'var(--ppt-text-muted)'}}>
                Adjust farming variables to calculate potential savings and net earnings boost with Plant Medic:
              </p>
              
              <div className="sim-slider-row">
                <div className="sim-slider-label">
                  <span>Farm Size</span>
                  <span>{farmAcres} Acres</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="30" 
                  value={farmAcres}
                  onChange={(e) => setFarmAcres(Number(e.target.value))}
                  className="sim-slider"
                />
              </div>

              <div className="sim-slider-row">
                <div className="sim-slider-label">
                  <span>Average Yield Value per Acre (Annual)</span>
                  <span>Rs {acreYieldVal.toLocaleString()}</span>
                </div>
                <input 
                  type="range" 
                  min="20000" 
                  max="150000" 
                  step="5000"
                  value={acreYieldVal}
                  onChange={(e) => setAcreYieldVal(Number(e.target.value))}
                  className="sim-slider"
                />
              </div>

              <div className="sim-slider-row">
                <div className="sim-slider-label">
                  <span>Average Disease Loss Percentage</span>
                  <span>{diseaseLossPct}%</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="50" 
                  value={diseaseLossPct}
                  onChange={(e) => setDiseaseLossPct(Number(e.target.value))}
                  className="sim-slider"
                />
              </div>
            </div>

            <div className="roi-results-panel">
              <div className="roi-res-grid">
                <div className="roi-card">
                  <div className="roi-card-lbl">Raw Annual Disease Loss</div>
                  <div className="roi-card-val" style={{color: '#f87171'}}>Rs {rawAnnualLoss.toLocaleString()}</div>
                </div>
                
                <div className="roi-card">
                  <div className="roi-card-lbl">Recovered Crop Yield (85%)</div>
                  <div className="roi-card-val">Rs {recoveredLoss.toLocaleString()}</div>
                </div>

                <div className="roi-card">
                  <div className="roi-card-lbl">Pesticide Cost Reduction</div>
                  <div className="roi-card-val" style={{color: '#60a5fa'}}>Rs {pesticideSavings.toLocaleString()}</div>
                </div>

                <div className="roi-card">
                  <div className="roi-card-lbl">IoT Node Hardware Cost</div>
                  <div className="roi-card-val" style={{color: '#a78bfa'}}>Rs {hardwareInvestmentCost.toLocaleString()}</div>
                </div>
              </div>

              <div style={{background: 'rgba(34,197,94,0.1)', border: '1px solid var(--ppt-border)', padding: '10px 16px', borderRadius: '8px', textAlign: 'center', marginTop: '12px'}}>
                <div style={{fontSize: '11px', color: 'var(--ppt-text-muted)'}}>Net Annual Earnings Increase</div>
                <div style={{fontSize: '26px', fontWeight: 800, color: 'var(--ppt-accent)'}}>
                  Rs {(netEarningsBoost - hardwareInvestmentCost).toLocaleString()}
                </div>
                <div style={{fontSize: '9px', color: 'var(--ppt-text-muted)', marginTop: '2px'}}>
                  (Hardware investment amortized in year 1. ROI factor: {(netEarningsBoost / Math.max(1, hardwareInvestmentCost)).toFixed(1)}x)
                </div>
              </div>
            </div>
          </div>
        );
      case 8:
        return (
          <div className="biz-grid">
            <div className="biz-card">
              <div className="biz-card-header">
                <span className="biz-emoji">🌾</span>
                <h3 className="biz-title">Direct-to-Farmer (B2C)</h3>
              </div>
              <p className="biz-desc">
                Affordable model helping individual smallholders monitor fields, diagnose leaves, and target crop health.
              </p>
              <ul className="biz-details-list">
                <li>Free diagnostic scan tier</li>
                <li>Low cost hardware setup (~Rs 1,500)</li>
                <li>Localized disease push alerts</li>
              </ul>
            </div>

            <div className="biz-card" style={{borderColor: '#fbbf24', background: 'rgba(245, 158, 11, 0.03)'}}>
              <div className="biz-card-header">
                <span className="biz-emoji" style={{color: '#fbbf24'}}>💼</span>
                <h3 className="biz-title" style={{color: '#fbbf24'}}>MSME & Agri-Service (B2B)</h3>
              </div>
              <p className="biz-desc">
                Enabling village entrepreneurs to license scanning equipment and charge testing service fees to local farms.
              </p>
              <ul className="biz-details-list">
                <li>Franchise testing diagnostic kits</li>
                <li>Aggregated fertilizer ordering commission</li>
                <li>Creates local rural technical jobs</li>
              </ul>
            </div>

            <div className="biz-card">
              <div className="biz-card-header">
                <span className="biz-emoji">🏛️</span>
                <h3 className="biz-title">Government & Co-ops (B2G)</h3>
              </div>
              <p className="biz-desc">
                Partnering with government crop departments and cooperatives for regional epidemiological dashboards.
              </p>
              <ul className="biz-details-list">
                <li>Hotspot heatmap subscriptions</li>
                <li>Insurance validation tracking</li>
                <li>Targeted crop insurance subsidies</li>
              </ul>
            </div>
          </div>
        );
      case 9:
        return (
          <div className="roadmap-container">
            <div className="timeline-line-wrapper">
              <div className="timeline-back-line" />
              <div className="timeline-nodes-row">
                {ROADMAP_PHASES.map((p, idx) => (
                  <div 
                    key={idx} 
                    className={`timeline-node ${activeRoadmapPhase === idx ? 'timeline-node-active' : ''}`}
                    onClick={() => setActiveRoadmapPhase(idx)}
                  >
                    <div className="timeline-circle">{idx + 1}</div>
                    <div className="timeline-lbl">{p.title.split(' - ')[0]}</div>
                    <div style={{fontSize: '9px', color: 'var(--ppt-text-muted)', marginTop: '2px'}}>{p.period}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="timeline-details">
              <h4 style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>{ROADMAP_PHASES[activeRoadmapPhase].title}</span>
                <span style={{fontSize: '12px', color: 'var(--ppt-text-muted)'}}>{ROADMAP_PHASES[activeRoadmapPhase].period}</span>
              </h4>
              <p style={{marginTop: '8px', fontSize: '13px'}}>{ROADMAP_PHASES[activeRoadmapPhase].details}</p>
            </div>
          </div>
        );
      case 10:
        return (
          <div className="conclusion-layout">
            <div className="conclusion-points">
              <p style={{fontSize: '14px', color: 'var(--ppt-text-muted)', marginBottom: '8px'}}>
                Key Takeaways for Evaluators:
              </p>
              <div className="conc-point-card">
                <span>🛡️</span>
                <p><strong>Proactive, Not Reactive:</strong> Prevents disease outbreak losses before symptoms visible to the human eye occur.</p>
              </div>
              <div className="conc-point-card">
                <span>💰</span>
                <p><strong>Frugal Innovation:</strong> Renders high-end telemetry with cheap, easily available ESP32 edge modules (~Rs 1,200/node).</p>
              </div>
              <div className="conc-point-card">
                <span>👩‍🌾</span>
                <p><strong>Empowers MSME ecosystem:</strong> Incubates local technical micro-franchises for agricultural testing services.</p>
              </div>
            </div>

            <div className="quiz-panel">
              <div>
                <span style={{fontSize: '11px', color: 'var(--ppt-accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px'}}>Interactive Presentation Review</span>
                <h3 className="quiz-question" style={{marginTop: '8px'}}>Question: What distinguishes Plant Medic from standard crop photo scanning apps?</h3>
                <div className="quiz-options-list">
                  {QUIZ_OPTS.map((o, idx) => (
                    <button
                      key={idx}
                      className={`quiz-opt-btn ${
                        quizAnswer === idx 
                          ? idx === 1 
                            ? 'quiz-opt-correct' 
                            : 'quiz-opt-incorrect'
                          : ''
                      }`}
                      onClick={() => handleQuizAnswer(idx)}
                      disabled={quizAnswer !== null}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>

              {quizScore && (
                <div className="quiz-score-banner">
                  {quizScore}
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className={`ppt-overlay ${lightTheme ? 'ppt-light-theme' : ''}`} 
      ref={deckRef}
    >
      <div className="ppt-bg-grid" />
      <div className="ppt-bg-glows" aria-hidden>
        <div className="ppt-glow ppt-glow-1" />
        <div className="ppt-glow ppt-glow-2" />
      </div>

      {/* Top Header Controls */}
      <header className="ppt-header">
        <div 
          className="ppt-progress-bar" 
          style={{ width: `${((currentSlide + 1) / SLIDES.length) * 100}%` }}
        />
        
        <div className="ppt-logo-area">
          <span className="ppt-drawer-trigger" onClick={() => setDrawerOpen(true)} style={{cursor: 'pointer', fontSize: '18px', marginRight: '8px'}} title="Show Slides Outline">☰</span>
          <span className="ppt-logo-leaf">🌿</span>
          <span className="ppt-logo-title">Plant Medic</span>
          <span className="ppt-logo-badge">Hackathon 2026</span>
        </div>

        <div className="ppt-controls-area">
          <div className="ppt-select-wrapper">
            <select 
              value={currentSlide} 
              onChange={(e) => jumpToSlide(Number(e.target.value))}
              className="ppt-slide-select"
            >
              {SLIDES.map((s, i) => (
                <option key={i} value={i}>
                  Slide {i+1}: {s.category}
                </option>
              ))}
            </select>
            <span className="ppt-select-arrow">▼</span>
          </div>

          <button 
            className={`ppt-btn ${isPlaying ? 'ppt-btn-active' : ''}`}
            onClick={() => setIsPlaying(!isPlaying)}
            title="Auto Play Slideshow"
          >
            <span>{isPlaying ? '⏸' : '▶'}</span>
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button 
            className="ppt-btn"
            onClick={() => setLightTheme(!lightTheme)}
            title="Toggle Light/Dark Theme"
          >
            <span>💡</span>
          </button>

          <button 
            className="ppt-btn"
            onClick={handlePrint}
            title="Export Presentation to PDF"
          >
            <span>📄</span>
            <span>PDF</span>
          </button>

          <button 
            className="ppt-btn ppt-btn-active"
            onClick={handleDownloadPPTX}
            title="Download PowerPoint Presentation (.pptx)"
          >
            <span>📊</span>
            <span>Download PPT</span>
          </button>

          <button 
            className="ppt-btn"
            onClick={toggleFullscreen}
            title="Fullscreen Toggle"
          >
            <span>{isFullscreen ? '🗗' : '🗖'}</span>
          </button>

          <button 
            className="ppt-btn ppt-btn-close"
            onClick={onClose}
            title="Close presentation and return to app"
          >
            <span>✕</span>
            <span>Close</span>
          </button>
        </div>
      </header>

      {/* Floating Arrows */}
      <button 
        className="ppt-arrow-btn ppt-arrow-prev" 
        onClick={prevSlide}
        aria-label="Previous Slide"
      >
        ‹
      </button>
      <button 
        className="ppt-arrow-btn ppt-arrow-next" 
        onClick={nextSlide}
        aria-label="Next Slide"
      >
        ›
      </button>

      {/* Sidebar Slide Outline Drawer */}
      <div className={`ppt-drawer ${drawerOpen ? 'ppt-drawer-open' : ''}`}>
        <div className="ppt-drawer-header">
          <span className="ppt-drawer-title">Presentation Outline</span>
          <button className="ppt-btn" onClick={() => setDrawerOpen(false)}>✕</button>
        </div>
        <div className="ppt-drawer-list">
          {SLIDES.map((s, i) => (
            <div 
              key={i} 
              className={`ppt-drawer-item ${currentSlide === i ? 'ppt-drawer-item-active' : ''}`}
              onClick={() => jumpToSlide(i)}
            >
              <span className="ppt-drawer-num">{i + 1}</span>
              <div style={{flex: 1, minWidth: 0}}>
                <div style={{fontSize: '10px', color: 'var(--ppt-accent)', fontWeight: 700}}>{s.category}</div>
                <div className="ppt-drawer-name" title={s.title}>{s.title}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Center Slide Stage */}
      <main className="ppt-workspace">
        <div className="ppt-slide-card" key={currentSlide}>
          
          <div className="ppt-slide-header">
            <span className="ppt-slide-kicker">
              {SLIDES[currentSlide].category}
            </span>
            <h2 className="ppt-slide-title">
              {SLIDES[currentSlide].title}
            </h2>
          </div>

          <div className="ppt-slide-body">
            {renderSlideContent(currentSlide)}
          </div>

          <div className="ppt-slide-footer">
            <span>🌿 Plant Medic Presentation</span>
            <span style={{fontWeight: 700}}>Slide {currentSlide + 1} of {SLIDES.length}</span>
            <span>Use Left/Right arrow keys or click the dots below</span>
          </div>

        </div>
      </main>

      {/* Print-Only Multi-Slide Container */}
      <div className="ppt-print-container">
        {SLIDES.map((slide, index) => (
          <div className="print-slide-card" key={index}>
            <div className="ppt-slide-header">
              <span className="ppt-slide-kicker">{slide.category}</span>
              <h2 className="ppt-slide-title">{slide.title}</h2>
            </div>
            <div className="ppt-slide-body">
              {renderSlideContent(index)}
            </div>
            <div className="ppt-slide-footer">
              <span>🌿 Plant Medic Presentation</span>
              <span style={{fontWeight: 700}}>Slide {index + 1} of {SLIDES.length}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Nav dots */}
      <footer className="ppt-footer-nav">
        <div className="ppt-nav-dots">
          {SLIDES.map((_, i) => (
            <button 
              key={i}
              className={`ppt-nav-dot ${currentSlide === i ? 'ppt-nav-dot-active' : ''}`}
              onClick={() => jumpToSlide(i)}
              title={`Jump to slide ${i+1}`}
            />
          ))}
        </div>
      </footer>
    </div>
  );
}

function MiniCircularProgress({ percentage, color, label, value }: { percentage: number, color: string, label: string, value: string }) {
  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: '1', minWidth: '40px' }}>
      <div style={{ position: 'relative', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="28" height="28" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="14" cy="14" r={radius} fill="transparent" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="2.0" />
          <circle cx="14" cy="14" r={radius} fill="transparent" stroke={color} strokeWidth="2.0" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
        </svg>
        <span style={{ position: 'absolute', fontSize: '7.5px', fontWeight: 800, color: '#fff' }}>{value}</span>
      </div>
      <span style={{ fontSize: '8px', color: 'var(--ppt-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2px' }}>{label}</span>
    </div>
  );
}
