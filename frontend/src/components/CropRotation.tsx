import React, { useState } from 'react';

interface CropRecommendation {
  crop_name: string;
  scientific_name: string;
  expected_yield: string;
  profitability: string;
  soil_benefits: string[];
  sowing_time: string;
  duration: string;
  water_requirement: string;
  fertilizer_requirement: string[];
  prevention_tips: string[];
}

interface RotationResponse {
  success: boolean;
  current_crop: string;
  recommended_crops: CropRecommendation[];
  soil_health_assessment: string;
  overall_advice: string;
  error?: string;
}

interface CropRotationProps {
  language: string;
  onClose?: () => void;
}

export default function CropRotation({ language, onClose }: CropRotationProps) {
  const [soilType, setSoilType] = useState('');
  const [region, setRegion] = useState('');
  const [previousCrop, setPreviousCrop] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RotationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!soilType || !region || !previousCrop) {
      setError(language === 'hindi' ? 'कृपया सभी फ़ील्ड भरें।' : language === 'marathi' ? 'कृपया सर्व फील्ड भरा.' : 'Please fill all fields.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/v1/rotation/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soil_type: soilType,
          region: region,
          previous_crop: previousCrop,
          language: language
        })
      });

      if (!response.ok) {
        throw new Error('Server returned an error');
      }

      const data: RotationResponse = await response.json();
      if (!data.success) {
        setError(data.error || 'Failed to get recommendations.');
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(language === 'hindi' ? 'सिफारिशें लोड करने में विफल। कृपया पुन: प्रयास करें।' : language === 'marathi' ? 'शिफारसी लोड करण्यात अयशस्वी. कृपया पुन्हा प्रयत्न करा.' : 'Failed to load recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const SOIL_OPTIONS = [
    { value: 'loamy', label: { en: 'Loamy Soil', hi: 'दुमट मिट्टी (Loamy)', mr: 'लोमी माती' } },
    { value: 'clayey', label: { en: 'Clayey Soil', hi: 'चिकनी मिट्टी (Clayey)', mr: 'चिकनमाती' } },
    { value: 'sandy', label: { en: 'Sandy Soil', hi: 'बलुआ मिट्टी (Sandy)', mr: 'वाळूची माती' } },
    { value: 'black_cotton', label: { en: 'Black Cotton Soil', hi: 'काली कपास मिट्टी (Black)', mr: 'काळी कापसाची माती' } },
    { value: 'red_soil', label: { en: 'Red Soil', hi: 'लाल मिट्टी (Red)', mr: 'लाल माती' } },
    { value: 'alluvial', label: { en: 'Alluvial Soil', hi: 'जलोढ़ मिट्टी (Alluvial)', mr: 'गाळाची माती' } },
  ];

  const getTranslation = (key: 'title' | 'sub' | 'soil_lbl' | 'region_lbl' | 'region_placeholder' | 'prev_lbl' | 'prev_placeholder' | 'btn_txt' | 'loading_txt' | 'assessment' | 'advice' | 'expected_yield' | 'profitability' | 'duration' | 'sowing' | 'water' | 'soil_health' | 'fertilizer' | 'prevention') => {
    const dict = {
      title: { en: 'Crop Rotation & Yield Advisor', hi: 'फसल चक्र और उपज सलाहकार', mr: 'पिक फिरती आणि उत्पन्न सल्लागार' },
      sub: { en: 'Plan your next crop for optimal soil health and maximum profitability.', hi: 'बेहतर मिट्टी के स्वास्थ्य और अधिकतम लाभ के लिए अपनी अगली फसल की योजना बनाएं।', mr: 'उत्कृष्ट मातीचे आरोग्य आणि जास्तीत जास्त नफ्यासाठी तुमच्या पुढील पिकाचे नियोजन करा.' },
      soil_lbl: { en: 'Soil Type', hi: 'मिट्टी का प्रकार', mr: 'मातीचा प्रकार' },
      region_lbl: { en: 'Region / Location', hi: 'क्षेत्र / स्थान', mr: 'प्रदेश / स्थान' },
      region_placeholder: { en: 'e.g. Punjab, Maharashtra', hi: 'उदा. पंजाब, महाराष्ट्र', mr: 'उदा. पंजाब, महाराष्ट्र' },
      prev_lbl: { en: 'Previous Crop', hi: 'पिछली फसल', mr: 'मागील पीक' },
      prev_placeholder: { en: 'e.g. Rice, Wheat, Cotton', hi: 'उदा. धान, गेहूँ, कपास', mr: 'उदा. भात, गहू, कापूस' },
      btn_txt: { en: 'Generate AI Recommendation', hi: 'एआई सिफारिश प्राप्त करें', mr: 'AI शिफारस मिळवा' },
      loading_txt: { en: 'AgroAI is planning rotation...', hi: 'एआई योजना बना रहा है...', mr: 'AI नियोजन करत आहे...' },
      assessment: { en: 'Soil Health Assessment', hi: 'मिट्टी स्वास्थ्य मूल्यांकन', mr: 'माती आरोग्य मूल्यमापन' },
      advice: { en: 'Overall Farmer Advice', hi: 'विशेष किसान सलाह', mr: 'एकूण शेतकरी सल्ला' },
      expected_yield: { en: 'Expected Yield', hi: 'संभावित उपज', mr: 'अपेक्षित उत्पन्न' },
      profitability: { en: 'Profitability', hi: 'लाभप्रदता', mr: 'नफा' },
      duration: { en: 'Growth Duration', hi: 'फसल की अवधि', mr: 'पिकाचा कालावधी' },
      sowing: { en: 'Sowing Time', hi: 'बोवाई का समय', mr: 'पेरणीची वेळ' },
      water: { en: 'Water Requirement', hi: 'पानी की आवश्यकता', mr: 'पाण्याची गरज' },
      soil_health: { en: 'Soil Benefits', hi: 'मिट्टी के लिए लाभ', mr: 'मातीचे फायदे' },
      fertilizer: { en: 'Fertilizer Guide', hi: 'उर्वरक गाइड (NPK)', mr: 'खत मार्गदर्शक (NPK)' },
      prevention: { en: 'Pest/Disease Control', hi: 'रोग एवं कीट नियंत्रण', mr: 'रोग आणि कीड नियंत्रण' },
    };
    const lang = language === 'hindi' ? 'hi' : language === 'marathi' ? 'mr' : 'en';
    return dict[key][lang];
  };

  return (
    <div className="cr-container animate-fadein">
      {onClose && (
        <button type="button" className="cr-back-btn" onClick={onClose} title="Go back to Home">
          ⬅️ Back to Doctor
        </button>
      )}
      <div className="cr-header">
        <div className="hero-badge">🌱 Intelligent Planning</div>
        <h1 className="hero-h1">{getTranslation('title')}</h1>
        <p className="hero-sub">{getTranslation('sub')}</p>
      </div>

      <div className="cr-content-layout">
        {/* Form panel */}
        <form onSubmit={handleSubmit} className="upload-card cr-form-card">
          <div className="cr-form-group">
            <label className="cr-label">{getTranslation('soil_lbl')}</label>
            <select
              value={soilType}
              onChange={(e) => setSoilType(e.target.value)}
              className="cr-select"
            >
              <option value="">-- Select Soil Type --</option>
              {SOIL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label[language === 'hindi' ? 'hi' : language === 'marathi' ? 'mr' : 'en']}
                </option>
              ))}
            </select>
          </div>

          <div className="cr-form-group">
            <label className="cr-label">{getTranslation('region_lbl')}</label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder={getTranslation('region_placeholder')}
              className="cr-input"
            />
          </div>

          <div className="cr-form-group">
            <label className="cr-label">{getTranslation('prev_lbl')}</label>
            <input
              type="text"
              value={previousCrop}
              onChange={(e) => setPreviousCrop(e.target.value)}
              placeholder={getTranslation('prev_placeholder')}
              className="cr-input"
            />
          </div>

          {error && <div className="inline-error">⚠️ {error}</div>}

          <button type="submit" className="analyze-btn cr-submit-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="cr-spinner" /> {getTranslation('loading_txt')}
              </>
            ) : (
              <>
                <span>🔄</span> {getTranslation('btn_txt')}
              </>
            )}
          </button>
        </form>

        {/* Results panel */}
        {result && (
          <div className="cr-results-wrapper">
            {/* Soil Health assessment */}
            <div className="cr-assessment-card">
              <h3>🧬 {getTranslation('assessment')}</h3>
              <p>{result.soil_health_assessment}</p>
            </div>

            {/* Recommended crops list */}
            <div className="cr-recommendations-list">
              {result.recommended_crops.map((crop, idx) => {
                const colors = [
                  { border: 'rgba(34, 197, 94, 0.45)', glow: 'rgba(34, 197, 94, 0.18)', badge: 'cr-badge-green' },
                  { border: 'rgba(59, 130, 246, 0.45)', glow: 'rgba(59, 130, 246, 0.18)', badge: 'cr-badge-blue' },
                  { border: 'rgba(168, 85, 247, 0.45)', glow: 'rgba(168, 85, 247, 0.18)', badge: 'cr-badge-purple' },
                ];
                const col = colors[idx % colors.length];

                return (
                  <div
                    key={idx}
                    className="cr-crop-card"
                    style={{
                      borderColor: col.border,
                      boxShadow: `0 0 25px ${col.glow}, 0 12px 40px rgba(0,0,0,0.5)`,
                    } as React.CSSProperties}
                  >
                    <div className="cr-crop-header">
                      <div>
                        <span className={`cr-rank-badge ${col.badge}`}>Choice #{idx + 1}</span>
                        <h2 className="cr-crop-name">{crop.crop_name}</h2>
                        <span className="cr-scientific">{crop.scientific_name}</span>
                      </div>
                      <div className="cr-duration-badge">⏱️ {crop.duration}</div>
                    </div>

                    <div className="cr-crop-details-grid">
                      <div className="cr-detail-tile">
                        <span className="cr-tile-icon">🌾</span>
                        <div>
                          <p className="cr-tile-lbl">{getTranslation('expected_yield')}</p>
                          <p className="cr-tile-val">{crop.expected_yield}</p>
                        </div>
                      </div>
                      <div className="cr-detail-tile">
                        <span className="cr-tile-icon">💰</span>
                        <div>
                          <p className="cr-tile-lbl">{getTranslation('profitability')}</p>
                          <p className="cr-tile-val">{crop.profitability}</p>
                        </div>
                      </div>
                      <div className="cr-detail-tile">
                        <span className="cr-tile-icon">📅</span>
                        <div>
                          <p className="cr-tile-lbl">{getTranslation('sowing')}</p>
                          <p className="cr-tile-val">{crop.sowing_time}</p>
                        </div>
                      </div>
                      <div className="cr-detail-tile">
                        <span className="cr-tile-icon">💧</span>
                        <div>
                          <p className="cr-tile-lbl">{getTranslation('water')}</p>
                          <p className="cr-tile-val">{crop.water_requirement}</p>
                        </div>
                      </div>
                    </div>

                    <div className="cr-sections-grid">
                      <div className="cr-sec-box">
                        <h4>🌱 {getTranslation('soil_health')}</h4>
                        <ul>
                          {crop.soil_benefits.map((b, i) => (
                            <li key={i}>✅ {b}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="cr-sec-box">
                        <h4>🧪 {getTranslation('fertilizer')}</h4>
                        <ul>
                          {crop.fertilizer_requirement.map((f, i) => (
                            <li key={i}>⚡ {f}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {crop.prevention_tips && crop.prevention_tips.length > 0 && (
                      <div className="cr-sec-box cr-pest-box">
                        <h4>🛡️ {getTranslation('prevention')}</h4>
                        <ul>
                          {crop.prevention_tips.map((t, i) => (
                            <li key={i}>⚠️ {t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* General Advice */}
            <div className="cr-advice-card">
              <h3>👨‍🌾 {getTranslation('advice')}</h3>
              <p>{result.overall_advice}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
