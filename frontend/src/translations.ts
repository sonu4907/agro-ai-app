export type Language = 'en' | 'hi' | 'mr';

export interface TranslationSchema {
  // App Header & Nav
  appName: string;
  smartFarmControl: string;
  plantMedic: string;
  weatherForecast: string;
  marketPrices: string;
  govSchemes: string;
  
  // Dashboard & Tabs
  liveDashboard: string;
  controls: string;
  farmAssistant: string;
  notifications: string;
  
  // Smart Irrigation Card
  weatherAwareCare: string;
  smartIrrigationScheduler: string;
  rainForecast12h: string;
  targetSoilMoisture: string;
  automatedMode: string;
  rainPredicted: string;
  dryNoRain: string;
  activeWeatherGuided: string;
  manualOverride: string;
  
  // Smart Irrigation Decision Labels
  statusDelayedRain: string;
  statusIrrigateActive: string;
  statusMoistureSufficient: string;
  statusBlockedLowTank: string;
  
  // Soil Telemetry & NPK
  soilMoisture: string;
  nitrogen: string;
  phosphorus: string;
  potassium: string;
  phLevel: string;
  waterTankLevel: string;
  optimal: string;
  acidic: string;
  alkaline: string;
  
  // Crop Lifecycle Stepper
  cropStageTitle: string;
  sowingStage: string;
  vegetativeStage: string;
  floweringStage: string;
  fruitingStage: string;
  sowingDays: string;
  vegetativeDays: string;
  floweringDays: string;
  fruitingDays: string;
  sowingFocus: string;
  vegetativeFocus: string;
  floweringFocus: string;
  fruitingFocus: string;
  stageGuidance: string;
  
  // Calculator
  fertilizerCalculatorTitle: string;
  selectedCrop: string;
  plotSize: string;
  acres: string;
  hectares: string;
  ureaBagSize: string;
  sensorMode: string;
  autoLiveTelemetry: string;
  manualInputs: string;
  exportReceipt: string;
  copiedReceipt: string;
  subsidizedCost: string;
  totalCostEstimate: string;
  
  // Disease Scanner
  uploadLeafPhoto: string;
  offlineCompressionNotice: string;
  diagnoseCrop: string;
  scanResults: string;
  treatmentAdvice: string;

  // Weather Panel
  weatherTitle: string;
  diseaseThreats: string;
  airQuality: string;
  highRiskWarning: string;
}

export const translations: Record<Language, TranslationSchema> = {
  en: {
    appName: "AgroAI Plant Medic",
    smartFarmControl: "Smart Farm Control",
    plantMedic: "Plant Medic",
    weatherForecast: "Weather Forecast",
    marketPrices: "Mandi Market Prices",
    govSchemes: "Government Schemes",
    
    liveDashboard: "Live Dashboard",
    controls: "Device Controls",
    farmAssistant: "Farm Assistant",
    notifications: "Alerts & Notifications",
    
    weatherAwareCare: "Weather-Aware Automated Care",
    smartIrrigationScheduler: "Smart Irrigation Scheduler",
    rainForecast12h: "Rain Forecast (12h)",
    targetSoilMoisture: "Target Soil Moisture",
    automatedMode: "Automated Mode",
    rainPredicted: "🌧️ Rain Predicted",
    dryNoRain: "☀️ Dry / No Rain",
    activeWeatherGuided: "⚡ Active (Weather Guided)",
    manualOverride: "🔴 Manual Override",
    
    statusDelayedRain: "Delayed (Rain Predicted in 12h)",
    statusIrrigateActive: "Irrigation Active / Scheduled",
    statusMoistureSufficient: "Sufficient Soil Moisture",
    statusBlockedLowTank: "Blocked (Low Tank Water)",
    
    soilMoisture: "Soil Moisture",
    nitrogen: "Nitrogen (N)",
    phosphorus: "Phosphorus (P)",
    potassium: "Potassium (K)",
    phLevel: "pH Level",
    waterTankLevel: "Water Reservoir Tank",
    optimal: "Optimal",
    acidic: "Acidic",
    alkaline: "Alkaline",
    
    cropStageTitle: "Crop Lifecycle Stage & Growth Timeline",
    sowingStage: "Sowing / Basal",
    vegetativeStage: "Vegetative Growth",
    floweringStage: "Flowering & Budding",
    fruitingStage: "Fruiting / Maturity",
    sowingDays: "0–15 Days",
    vegetativeDays: "16–45 Days",
    floweringDays: "46–70 Days",
    fruitingDays: "71+ Days",
    sowingFocus: "Phosphorus Focus (Rooting)",
    vegetativeFocus: "Nitrogen Focus (Canopy & Leaves)",
    floweringFocus: "Balanced P & K (Bloom boost)",
    fruitingFocus: "Potassium Focus (Fruit & Grain)",
    stageGuidance: "Stage Agronomic Advice",
    
    fertilizerCalculatorTitle: "Smart Fertilizer & Chemical Dosage Calculator",
    selectedCrop: "Selected Crop",
    plotSize: "Land Plot Size",
    acres: "Acres",
    hectares: "Hectares",
    ureaBagSize: "Urea Bag Size",
    sensorMode: "Soil Sensor Mode",
    autoLiveTelemetry: "📡 Auto Live Telemetry",
    manualInputs: "✏️ Manual Inputs",
    exportReceipt: "📤 Export Mandi Receipt",
    copiedReceipt: "📋 Copied Mandi List!",
    subsidizedCost: "Est. Subsidized Cost",
    totalCostEstimate: "Total Estimated Input Cost",
    
    uploadLeafPhoto: "Upload or Capture Leaf Photo",
    offlineCompressionNotice: "Low Bandwidth Compression Active (2G/3G Ready)",
    diagnoseCrop: "Diagnose Crop Disease",
    scanResults: "Diagnosis & Treatment Protocol",
    treatmentAdvice: "Recommended Spray & Prevention",

    weatherTitle: "Farm Weather & Disease Threat Panel",
    diseaseThreats: "Crop Disease Risk Factors",
    airQuality: "Air Quality Index (AQI)",
    highRiskWarning: "⚠️ High Disease Risk Alert"
  },

  hi: {
    appName: "एग्रो-एआई प्लांट मेडिक",
    smartFarmControl: "स्मार्ट फार्म कंट्रोल",
    plantMedic: "फसल रोग निदान",
    weatherForecast: "मौसम पूर्वानुमान",
    marketPrices: "मंडी भाव",
    govSchemes: "सरकारी योजनाएं",
    
    liveDashboard: "लाइव डैशबोर्ड",
    controls: "डिवाइस नियंत्रण",
    farmAssistant: "कृषि सहायक",
    notifications: "अलर्ट और सूचनाएं",
    
    weatherAwareCare: "मौसम-आधारित स्वचालित सिंचाई",
    smartIrrigationScheduler: "स्मार्ट सिंचाई शेड्यूलर",
    rainForecast12h: "बारिश का पूर्वानुमान (12 घंटे)",
    targetSoilMoisture: "लक्ष्य मिट्टी की नमी",
    automatedMode: "स्वचालित मोड",
    rainPredicted: "🌧️ बारिश की संभावना",
    dryNoRain: "☀️ सूखा / बारिश नहीं",
    activeWeatherGuided: "⚡ सक्रिय (मौसम निर्देशित)",
    manualOverride: "🔴 मैनुअल नियंत्रण",
    
    statusDelayedRain: "आस्थगित (12 घंटे में बारिश की संभावना)",
    statusIrrigateActive: "सिंचाई चालू / निर्धारित",
    statusMoistureSufficient: "मिट्टी में पर्याप्त नमी",
    statusBlockedLowTank: "अवरुद्ध (टैंक में पानी कम)",
    
    soilMoisture: "मिट्टी की नमी",
    nitrogen: "नाइट्रोजन (N)",
    phosphorus: "फास्फोरस (P)",
    potassium: "पोटेशियम (K)",
    phLevel: "पीएच स्तर",
    waterTankLevel: "जल जलाशय टैंक",
    optimal: "उत्कृष्ट",
    acidic: "अम्लीय",
    alkaline: "क्षारीय",
    
    cropStageTitle: "फसल विकास चरण और समयरेखा",
    sowingStage: "बुआई / शुरुआती चरण",
    vegetativeStage: "वानस्पतिक वृद्धि",
    floweringStage: "फूल आना और कली बनना",
    fruitingStage: "फल / दाना पकना",
    sowingDays: "0–15 दिन",
    vegetativeDays: "16–45 दिन",
    floweringDays: "46–70 दिन",
    fruitingDays: "71+ दिन",
    sowingFocus: "फास्फोरस केंद्रित (जड़ों के लिए)",
    vegetativeFocus: "नाइट्रोजन केंद्रित (पत्तियों के लिए)",
    floweringFocus: "संतुलित P और K (फूलों के लिए)",
    fruitingFocus: "पोटेशियम केंद्रित (फल और दाने के लिए)",
    stageGuidance: "चरण-वार कृषि सलाह",
    
    fertilizerCalculatorTitle: "स्मार्ट उर्वरक और रसायन खुराक कैलकुलेटर",
    selectedCrop: "चुनी गई फसल",
    plotSize: "खेत का आकार",
    acres: "एकड़",
    hectares: "हेक्टेयर",
    ureaBagSize: "यूरिया बैग का आकार",
    sensorMode: "मृदा सेंसर मोड",
    autoLiveTelemetry: "📡 स्वचालित लाइव डेटा",
    manualInputs: "✏️ मैनुअल इनपुट",
    exportReceipt: "📤 मंडी पर्ची डाउनलोड करें",
    copiedReceipt: "📋 पर्ची कॉपी हो गई!",
    subsidizedCost: "अनुमानित सब्सिडी लागत",
    totalCostEstimate: "कुल अनुमानित उर्वरक लागत",
    
    uploadLeafPhoto: "पत्ती की फोटो अपलोड या कैप्चर करें",
    offlineCompressionNotice: "धीमे इंटरनेट (2G/3G) के लिए कंप्रेसन सक्रिय",
    diagnoseCrop: "फसल रोग की जांच करें",
    scanResults: "निदान और उपचार विधि",
    treatmentAdvice: "अनुशंसित स्प्रे और रोकथाम",

    weatherTitle: "खेत का मौसम और फसल रोग जोखिम पैनल",
    diseaseThreats: "फसल रोग जोखिम कारक",
    airQuality: "वायु गुणवत्ता सूचकांक (AQI)",
    highRiskWarning: "⚠️ उच्च रोग जोखिम चेतावनी"
  },

  mr: {
    appName: "ॲग्रो-एआई प्लांट मेडिक",
    smartFarmControl: "स्मार्ट शेती नियंत्रण",
    plantMedic: "पिक रोग निदान",
    weatherForecast: "हवामान अंदाज",
    marketPrices: "बाजार भाव (मंडी)",
    govSchemes: "शासकीय योजना",
    
    liveDashboard: "थेट डैशबोर्ड",
    controls: "उपकरण नियंत्रण",
    farmAssistant: "शेती सहाय्यक",
    notifications: "सूचना व इशारे",
    
    weatherAwareCare: "हवामानावर आधारित स्वयंचलित काळजी",
    smartIrrigationScheduler: "स्मार्ट पाणी व्यवस्थापन",
    rainForecast12h: "पावसाचा अंदाज (१२ तास)",
    targetSoilMoisture: "लक्ष्य मातीतील ओलावा",
    automatedMode: "स्वयंचलित मोड",
    rainPredicted: "🌧️ पावसाची शक्यता",
    dryNoRain: "☀️ कोरडे / पाऊस नाही",
    activeWeatherGuided: "⚡ सक्रिय (हवामान आधारित)",
    manualOverride: "🔴 मॅन्युअल नियंत्रण",
    
    statusDelayedRain: "लांबणीवर (१२ तासांत पाऊस शक्य)",
    statusIrrigateActive: "पाणी देणे सुरू / नियोजित",
    statusMoistureSufficient: "मातीत पुरेसा ओलावा",
    statusBlockedLowTank: "अडवले (टाकीत पाणी कमी)",
    
    soilMoisture: "मातीतील ओलावा",
    nitrogen: "नत्र (N)",
    phosphorus: "स्फुरद (P)",
    potassium: "पालश (K)",
    phLevel: "सामू (pH) पातळी",
    waterTankLevel: "पाण्याची टाकी पातळी",
    optimal: "उत्कृष्ट",
    acidic: "आम्लयुक्त",
    alkaline: "विषम/क्षारयुक्त",
    
    cropStageTitle: "पिकाचा वाढीचा टप्पा व कालरेषा",
    sowingStage: "पेरणी / पायाभूत टप्पा",
    vegetativeStage: "शाकीय वाढ (पाने व फांद्या)",
    floweringStage: "फुलोरा व कळी धरण्याचा टप्पा",
    fruitingStage: "फळधारणा / दाणे भरणे",
    sowingDays: "०-१५ दिवस",
    vegetativeDays: "१६-४५ दिवस",
    floweringDays: "४६-७० दिवस",
    fruitingDays: "७१+ दिवस",
    sowingFocus: "स्फुरद केंद्रित (मुळांच्या वाढीसाठी)",
    vegetativeFocus: "नत्र केंद्रित (पानांच्या वाढीसाठी)",
    floweringFocus: "संतुलित P व K (फुलधारणा वाढवण्यासाठी)",
    fruitingFocus: "पालश केंद्रित (फळ व दाण्यांसाठी)",
    stageGuidance: "टप्प्यानुसार कृषी सल्ला",
    
    fertilizerCalculatorTitle: "स्मार्ट खत व रासायनिक मात्रा कॅल्क्युलेटर",
    selectedCrop: "निवडलेले पीक",
    plotSize: "शेत जमिनीचे क्षेत्रफळ",
    acres: "एकर",
    hectares: "हेक्टर",
    ureaBagSize: "युरिया गोणीचे वजन",
    sensorMode: "माती सेन्सर पद्धत",
    autoLiveTelemetry: "📡 थेट ऑटो डेटा",
    manualInputs: "✏️ मॅन्युअल माहिती",
    exportReceipt: "📤 खरेदी पावती डाउनलोड करा",
    copiedReceipt: "📋 पावती कॉपी झाली!",
    subsidizedCost: "अंदाजित अनुदानित किंमत",
    totalCostEstimate: "एकूण खत खरेदी खर्च",
    
    uploadLeafPhoto: "पानाचा फोटो अपलोड किंवा काढा",
    offlineCompressionNotice: "कमी इंटरनेट (2G/3G) साठी इमेज कॉम्प्रेशन सुरू",
    diagnoseCrop: "पिकाच्या रोगाचे निदान करा",
    scanResults: "निदान व उपाययोजना",
    treatmentAdvice: "फवारणी व प्रतिबंधात्मक उपाय",

    weatherTitle: "शेत हवामान व रोग धोका फलक",
    diseaseThreats: "पिकांवरील रोगाचा धोका",
    airQuality: "हवा गुणवत्ता निर्देशांक (AQI)",
    highRiskWarning: "⚠️ गंभीर रोग धोका इशारा"
  }
};
