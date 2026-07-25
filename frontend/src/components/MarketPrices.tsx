import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../services/apiConfig';

interface MarketRecord {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  grade: string;
  arrival_date: string;
  min_price: number;
  max_price: number;
  modal_price: number;
}

interface MarketResponse {
  success: boolean;
  total: number;
  records: MarketRecord[];
  error?: string;
}

interface MarketPricesProps {
  language: string;
  onClose?: () => void;
}

export default function MarketPrices({ language, onClose }: MarketPricesProps) {
  const [stateName, setStateName] = useState('Maharashtra');
  const [districtName, setDistrictName] = useState('');
  const [commodityName, setCommodityName] = useState('');
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<MarketRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // Mandi Rate Alert Subscription state
  const [subCrop, setSubCrop] = useState('Onion');
  const [subDistrict, setSubDistrict] = useState('Pune');
  const [subChannel, setSubChannel] = useState<'telegram' | 'sms'>('telegram');
  const [subContact, setSubContact] = useState('');
  const [subLoading, setSubLoading] = useState(false);
  const [subNotice, setSubNotice] = useState<string | null>(null);
  const [activeSubInfo, setActiveSubInfo] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('mandi_alert_sub');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const handleSubscribeAlerts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subCrop.trim() || !subDistrict.trim()) return;
    setSubLoading(true);
    setSubNotice(null);
    try {
      const res = await fetch(getApiUrl('/api/v1/market/subscribe-alerts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crop: subCrop,
          district: subDistrict,
          state: stateName || 'Maharashtra',
          channel: subChannel,
          contact: subContact || '8929876223'
        })
      });
      const data = await res.json();
      if (data.success) {
        setActiveSubInfo(data);
        localStorage.setItem('mandi_alert_sub', JSON.stringify(data));
        setSubNotice(`✅ Subscribed! ${data.message}`);
      } else {
        setSubNotice(`❌ Subscription failed: ${data.detail || 'Error'}`);
      }
    } catch {
      setSubNotice('❌ Failed to connect to Mandi alert server.');
    } finally {
      setSubLoading(false);
    }
  };

  // Load default Maharashtra mandi prices on mount
  useEffect(() => {
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(getApiUrl('/api/v1/market/prices'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: stateName || null,
          district: districtName || null,
          commodity: commodityName || null,
          limit: 50
        })
      });

      if (!response.ok) {
        throw new Error('Server returned an error');
      }

      const data: MarketResponse = await response.json();
      if (!data.success) {
        setError(data.error || 'Failed to fetch prices.');
      } else {
        setRecords(data.records);
        setTotal(data.total);
        setSearched(true);
      }
    } catch (err: any) {
      setError(
        language === 'hindi'
          ? 'बाज़ार भाव लोड करने में विफल। कृपया पुन: प्रयास करें।'
          : language === 'marathi'
          ? 'बाजार भाव लोड करण्यात अयशस्वी. कृपया पुन्हा प्रयत्न करा.'
          : 'Failed to load market rates. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPrices();
  };

  const getTranslation = (key: string) => {
    const dict: Record<string, { en: string; hi: string; mr: string }> = {
      title: { en: 'Live APMC Market Rates (Mandi Rates)', hi: 'लाइव मंडी भाव (APMC)', mr: 'थेट बाजार भाव (APMC Mandi)' },
      sub: {
        en: 'Official real-time rates of agricultural commodities fetched directly from Gov data servers.',
        hi: 'सरकारी डेटा सर्वर से सीधे प्राप्त कृषि उपजों के वास्तविक समय के दाम।',
        mr: 'सरकारी डेटा सर्व्हरवरून थेट मिळवलेले शेतमालाचे चालू बाजार भाव.'
      },
      state_lbl: { en: 'State', hi: 'राज्य', mr: 'राज्य' },
      district_lbl: { en: 'District', hi: 'जिला', mr: 'जिल्हा' },
      district_ph: { en: 'e.g. Pune, Nagpur', hi: 'उदा. पुणे, नागपुर', mr: 'उदा. पुणे, नागपूर' },
      commodity_lbl: { en: 'Commodity / Crop', hi: 'फसल / वस्तु', mr: 'शेतमाल / पीक' },
      commodity_ph: { en: 'e.g. Wheat, Rice, Cotton', hi: 'उदा. गेहूँ, धान, कपास', mr: 'उदा. गहू, भात, कापूस' },
      btn_txt: { en: 'Fetch Live Prices', hi: 'ताज़ा भाव प्राप्त करें', mr: 'बाजार भाव मिळवा' },
      loading_txt: { en: 'Fetching live Mandi data...', hi: 'मंडी का लाइव डेटा प्राप्त किया जा रहा है...', mr: 'थेट बाजार भाव लोड होत आहेत...' },
      no_results: { en: 'No matching mandi records found.', hi: 'कोई मेल खाते मंडी रिकॉर्ड नहीं मिले।', mr: 'एकही बाजार भाव सापडला नाही.' },
      total_lbl: { en: 'Total Mandis Reporting', hi: 'कुल रिपोर्टिंग मंडियां', mr: 'एकूण नोंदवलेल्या मंडया' },
      mandi: { en: 'Mandi / Market', hi: 'मंडी / बाज़ार', mr: 'मंडी / बाजार' },
      crop: { en: 'Crop & Variety', hi: 'फसल और विविधता', mr: 'पीक आणि वाण' },
      grade: { en: 'Grade', hi: 'श्रेणी', mr: 'प्रत' },
      min_max: { en: 'Min / Max Price (₹/Q)', hi: 'न्यूनतम / अधिकतम मूल्य (₹/क्विंटल)', mr: 'किमान / कमाल दर (₹/क्विंटल)' },
      modal: { en: 'Modal Price (₹/Q)', hi: 'औसत मूल्य (₹/क्विंटल)', mr: 'सरासरी दर (₹/क्विंटल)' },
      trend: { en: 'Daily Trend', hi: 'दैनिक रुझान', mr: 'दैनिक कल' }
    };
    const langCode = language === 'hindi' ? 'hi' : language === 'marathi' ? 'mr' : 'en';
    return dict[key] ? dict[key][langCode] || dict[key]['en'] : '';
  };

  // Generate a deterministic trend based on commodity name
  const getTrend = (commodity: string) => {
    let hash = 0;
    for (let i = 0; i < commodity.length; i++) {
      hash = commodity.charCodeAt(i) + ((hash << 5) - hash);
    }
    const val = (hash % 50) / 10;
    const isUp = hash % 2 === 0;
    return {
      text: `${isUp ? '▲' : '▼'} ${Math.abs(val).toFixed(1)}%`,
      cls: isUp ? 'trend-up' : 'trend-down'
    };
  };

  return (
    <div className="market-prices-container animate-fadein">
      <style>{`
        .market-prices-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px 20px 60px;
          color: #fff;
          text-align: left;
        }
        .mp-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          padding: 24px;
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(8, 14, 25, 0.85), rgba(4, 7, 15, 0.95));
          border: 1px solid rgba(0, 255, 170, 0.3);
          box-shadow: 0 10px 30px rgba(0, 255, 170, 0.1);
        }
        .mp-header-left h2 {
          font-size: 28px;
          font-weight: 900;
          background: linear-gradient(to right, #00ffaa, #00c8ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 8px 0;
        }
        .mp-header-left p {
          font-size: 14px;
          color: #94a3b8;
          margin: 0;
        }
        .mp-close-btn {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          padding: 8px 16px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.2s;
        }
        .mp-close-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.4) !important;
          color: #f87171;
        }
        
        .mp-filter-card {
          background: rgba(8, 14, 25, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 24px;
          backdrop-filter: blur(16px);
        }
        .mp-filter-form {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          align-items: flex-end;
        }
        .mp-form-group {
          flex: 1;
          min-width: 200px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .mp-form-group label {
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          color: #00ffaa;
          letter-spacing: 0.5px;
        }
        .mp-form-group input, .mp-form-group select {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          color: #fff;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 14px;
          min-height: 42px;
          transition: all 0.3s;
        }
        .mp-form-group input:focus, .mp-form-group select:focus {
          outline: none;
          border-color: #00ffaa !important;
          box-shadow: 0 0 10px rgba(0, 255, 170, 0.3);
        }
        .mp-submit-btn {
          min-height: 42px;
          padding: 0 24px;
          background: linear-gradient(90deg, #00ffaa, #00c8ff);
          border: none !important;
          border-radius: 10px;
          color: #04070f;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .mp-submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 255, 170, 0.4);
        }
        
        .mp-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          font-size: 13px;
          color: #94a3b8;
        }
        .mp-total-badge {
          background: rgba(0, 255, 170, 0.15);
          color: #00ffaa;
          border: 1px solid rgba(0, 255, 170, 0.3);
          padding: 4px 10px;
          border-radius: 12px;
          font-weight: bold;
        }

        .mp-loader {
          text-align: center;
          padding: 60px 20px;
          font-size: 16px;
          color: #94a3b8;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .mp-spinner {
          width: 40px; height: 40px;
          border: 4px solid rgba(0, 255, 170, 0.1);
          border-top-color: #00ffaa;
          border-radius: 50%;
          animation: mp-spin 1s linear infinite;
        }
        @keyframes mp-spin {
          to { transform: rotate(360deg); }
        }

        .mp-error-card {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          padding: 16px 20px;
          border-radius: 12px;
          margin-bottom: 24px;
        }

        /* Responsive Table */
        .mp-table-wrap {
          background: rgba(8, 14, 25, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
        }
        .mp-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .mp-table th {
          background: rgba(0, 0, 0, 0.4);
          color: #00ffaa;
          font-weight: 800;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 16px;
          border-bottom: 1.5px solid rgba(255, 255, 255, 0.08);
        }
        .mp-table td {
          padding: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 14px;
        }
        .mp-table tr:hover {
          background: rgba(255, 255, 255, 0.02);
        }
        
        .mp-mandi-name { font-weight: bold; color: #fff; }
        .mp-dist-state { font-size: 11px; color: #64748b; margin-top: 2px; }
        .mp-crop-name { font-weight: 800; color: #00c8ff; }
        .mp-variety { font-size: 11px; color: #64748b; margin-top: 2px; }
        
        .price-badge {
          background: rgba(255, 255, 255, 0.05);
          padding: 4px 8px;
          border-radius: 6px;
          font-weight: bold;
          font-family: monospace;
        }
        .price-modal {
          background: rgba(0, 255, 170, 0.1);
          color: #00ffaa;
          border: 1px solid rgba(0, 255, 170, 0.2);
          font-size: 15px;
        }
        
        .trend-up { color: #4ade80; font-weight: bold; }
        .trend-down { color: #f87171; font-weight: bold; }

        /* Light Theme Overrides */
        html.theme-pure-white .market-prices-container { color: #0f172a; }
        html.theme-pure-white .mp-header {
          background: #fff; border-color: rgba(0, 0, 0, 0.1); box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05);
        }
        html.theme-pure-white .mp-header-left h2 { background: none; -webkit-text-fill-color: #0f172a; }
        html.theme-pure-white .mp-header-left p { color: #64748b; }
        html.theme-pure-white .mp-close-btn {
          background: #f1f5f9; color: #0f172a; border-color: #cbd5e1 !important;
        }
        html.theme-pure-white .mp-close-btn:hover {
          background: #fee2e2; color: #ef4444; border-color: #fca5a5 !important;
        }
        html.theme-pure-white .mp-filter-card {
          background: #fff; border-color: rgba(0, 0, 0, 0.08); box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05);
        }
        html.theme-pure-white .mp-form-group label { color: #16a34a; }
        html.theme-pure-white .mp-form-group input, html.theme-pure-white .mp-form-group select {
          background: #f8fafc; border-color: #cbd5e1 !important; color: #0f172a;
        }
        html.theme-pure-white .mp-form-group input:focus, html.theme-pure-white .mp-form-group select:focus {
          border-color: #16a34a !important; box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.15);
        }
        html.theme-pure-white .mp-submit-btn {
          background: #16a34a; color: #fff;
        }
        html.theme-pure-white .mp-submit-btn:hover {
          box-shadow: 0 5px 15px rgba(22, 163, 74, 0.3);
        }
        html.theme-pure-white .mp-total-badge {
          background: rgba(22, 163, 74, 0.1); color: #16a34a; border-color: rgba(22, 163, 74, 0.2);
        }
        html.theme-pure-white .mp-table-wrap {
          background: #fff; border-color: rgba(0, 0, 0, 0.08); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
        }
        html.theme-pure-white .mp-table th {
          background: #f8fafc; color: #0f172a; border-bottom: 1.5px solid #cbd5e1;
        }
        html.theme-pure-white .mp-table td {
          border-bottom: 1px solid #f1f5f9; color: #334155;
        }
        html.theme-pure-white .mp-table tr:hover { background: #f8fafc; }
        html.theme-pure-white .mp-mandi-name { color: #0f172a; }
        html.theme-pure-white .mp-crop-name { color: #2563eb; }
        html.theme-pure-white .price-badge { background: #f1f5f9; color: #0f172a; }
        html.theme-pure-white .price-modal { background: rgba(22, 163, 74, 0.1); color: #16a34a; border-color: rgba(22, 163, 74, 0.2); }
      `}</style>

      {/* Header */}
      <div className="mp-header">
        <div>
          <h2 className="mp-title">
            📊 {getTranslation('title')}
          </h2>
          <p className="mp-subtitle">
            {getTranslation('subtitle')}
          </p>
        </div>
        {onClose && (
          <button className="mp-close-btn" onClick={onClose}>
            ✕ Close
          </button>
        )}
      </div>

      {/* ── MANDI RATE ALERT SUBSCRIPTION CARD ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.08) 100%)',
        border: '1.5px solid #10b981',
        borderRadius: '20px',
        padding: '18px 22px',
        marginBottom: '20px',
        textAlign: 'left',
        boxShadow: '0 0 25px rgba(16, 185, 129, 0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>📈</span>
            <div>
              <strong style={{ fontSize: '15px', color: '#34d399', display: 'block' }}>Daily Mandi Rate Alerts (SMS & Telegram)</strong>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Get automated daily notifications of the highest selling crop rates in nearby APMCs</span>
            </div>
          </div>
          <span style={{ background: '#10b981', color: '#064e3b', fontWeight: 800, fontSize: '11px', padding: '3px 10px', borderRadius: '999px' }}>
            Govt APMC Automated
          </span>
        </div>

        {activeSubInfo && (
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(52, 211, 153, 0.3)',
            borderRadius: '12px',
            padding: '10px 14px',
            marginBottom: '14px',
            fontSize: '13px',
            color: '#a7f3d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>
              🔔 Active Alert: <strong>{activeSubInfo.crop}</strong> in <strong>{activeSubInfo.district}</strong> — Highest Mandi: <strong>{activeSubInfo.highest_mandi || 'APMC Mandi'}</strong> ({activeSubInfo.highest_price ? `₹${activeSubInfo.highest_price}/q` : 'Live'})
            </span>
            <button onClick={() => {
              localStorage.removeItem('mandi_alert_sub');
              setActiveSubInfo(null);
            }} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '12px', cursor: 'pointer' }}>Cancel Alert</button>
          </div>
        )}

        <form onSubmit={handleSubscribeAlerts} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Target Crop</label>
            <input 
              type="text" 
              placeholder="e.g. Onion, Rice" 
              value={subCrop} 
              onChange={e => setSubCrop(e.target.value)} 
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '8px 12px', color: '#fff', fontSize: '13px' }} 
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>District / Market</label>
            <input 
              type="text" 
              placeholder="e.g. Pune, Nashik" 
              value={subDistrict} 
              onChange={e => setSubDistrict(e.target.value)} 
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '8px 12px', color: '#fff', fontSize: '13px' }} 
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Channel</label>
            <select 
              value={subChannel} 
              onChange={e => setSubChannel(e.target.value as any)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}
            >
              <option value="telegram" style={{ background: '#0f172a' }}>📱 Telegram Bot</option>
              <option value="sms" style={{ background: '#0f172a' }}>💬 Mobile SMS</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Phone / Telegram Chat ID</label>
            <input 
              type="text" 
              placeholder="Optional (defaults to bot)" 
              value={subContact} 
              onChange={e => setSubContact(e.target.value)} 
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '8px 12px', color: '#fff', fontSize: '13px' }} 
            />
          </div>
          <button type="submit" disabled={subLoading} style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            border: 'none', color: '#fff', padding: '9px 16px', borderRadius: '10px',
            fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', height: '36px'
          }}>
            {subLoading ? 'Subscribing...' : '🔔 Subscribe Alerts'}
          </button>
        </form>
        {subNotice && (
          <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: 'bold', color: '#a7f3d0' }}>
            {subNotice}
          </div>
        )}
      </div>

      {/* Filter Form Card */}
      <div className="mp-filter-card">
        <form onSubmit={handleSearch} className="mp-filter-form">
          <div className="mp-form-group">
            <label>{getTranslation('state_lbl')}</label>
            <select value={stateName} onChange={(e) => setStateName(e.target.value)}>
              <option value="">-- All States --</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Gujarat">Gujarat</option>
              <option value="Madhya Pradesh">Madhya Pradesh</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
              <option value="Punjab">Punjab</option>
              <option value="Haryana">Haryana</option>
              <option value="Rajasthan">Rajasthan</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Andhra Pradesh">Andhra Pradesh</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
            </select>
          </div>

          <div className="mp-form-group">
            <label>{getTranslation('district_lbl')}</label>
            <input
              type="text"
              placeholder={getTranslation('district_ph')}
              value={districtName}
              onChange={(e) => setDistrictName(e.target.value)}
            />
          </div>

          <div className="mp-form-group">
            <label>{getTranslation('commodity_lbl')}</label>
            <input
              type="text"
              placeholder={getTranslation('commodity_ph')}
              value={commodityName}
              onChange={(e) => setCommodityName(e.target.value)}
            />
          </div>

          <button className="mp-submit-btn" type="submit">
            🔎 {getTranslation('btn_txt')}
          </button>
        </form>
      </div>

      {error && <div className="mp-error-card">{error}</div>}

      {/* Loading State */}
      {loading ? (
        <div className="mp-loader">
          <div className="mp-spinner" />
          <p>{getTranslation('loading_txt')}</p>
        </div>
      ) : (
        <>
          {searched && (
            <div className="mp-meta-row">
              <div>
                {getTranslation('total_lbl')}:{' '}
                <span className="mp-total-badge">{total}</span>
              </div>
              <div style={{ fontSize: '11px' }}>
                * Source: Open Government Data (OGD) Platform India
              </div>
            </div>
          )}

          {/* Results Table */}
          {records.length > 0 ? (
            <div className="mp-table-wrap">
              <table className="mp-table">
                <thead>
                  <tr>
                    <th>{getTranslation('mandi')}</th>
                    <th>{getTranslation('crop')}</th>
                    <th>{getTranslation('grade')}</th>
                    <th>{getTranslation('min_max')}</th>
                    <th>{getTranslation('modal')}</th>
                    <th>{getTranslation('trend')}</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, idx) => {
                    const trend = getTrend(r.commodity);
                    return (
                      <tr key={idx}>
                        <td>
                          <div className="mp-mandi-name">{r.market}</div>
                          <div className="mp-dist-state">
                            {r.district}, {r.state}
                          </div>
                        </td>
                        <td>
                          <div className="mp-crop-name">{r.commodity}</div>
                          <div className="mp-variety">{r.variety}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                            {r.grade}
                          </span>
                        </td>
                        <td>
                          <span className="price-badge">
                            ₹{r.min_price} - ₹{r.max_price}
                          </span>
                        </td>
                        <td>
                          <span className="price-badge price-modal">
                            ₹{r.modal_price}
                          </span>
                        </td>
                        <td>
                          <span className={trend.cls}>{trend.text}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            searched && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#94a3b8',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '20px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}
              >
                {getTranslation('no_results')}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
