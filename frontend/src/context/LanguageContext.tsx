import React, { createContext, useContext, useState, useEffect } from 'react';

import { translations, type Language } from '../translations';

export type ExtendedLanguage = 'en' | 'hi' | 'mr' | 'te' | 'gu' | 'pa' | 'ta' | 'kn' | 'bn';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function applyGoogleTranslate(lang: string) {
  try {
    // Set google translate cookies
    document.cookie = `googtrans=/en/${lang}; path=/; domain=${window.location.hostname}`;
    document.cookie = `googtrans=/en/${lang}; path=/`;

    const combo = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
    if (combo) {
      combo.value = lang;
      combo.dispatchEvent(new Event('change'));
    }
  } catch (e) {
    console.warn("Google Translate trigger error:", e);
  }
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<string>(() => {
    const saved = localStorage.getItem('agroai_language');
    return saved || 'en';
  });

  useEffect(() => {
    if (language && language !== 'en') {
      setTimeout(() => applyGoogleTranslate(language), 500);
    }
  }, [language]);

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem('agroai_language', lang);
    applyGoogleTranslate(lang);
  };

  const t = (text: string): string => {
    const lang = (language === 'en' || language === 'hi' || language === 'mr') ? language : 'en';
    const translationSet = translations[lang as Language];
    if (translationSet && text in translationSet) {
      return translationSet[text as keyof typeof translationSet];
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'en',
      setLanguage: () => {},
      t: (text: string) => text
    };
  }
  return context;
};

export const LanguageSelector: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="language-selector-pill" style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      background: 'rgba(255, 255, 255, 0.08)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '20px',
      padding: '4px 10px',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#fff',
      ...style
    }}>
      <span>🌐</span>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#38bdf8',
          fontWeight: 'bold',
          fontSize: '13px',
          cursor: 'pointer',
          outline: 'none'
        }}
      >
        <option value="en" style={{ background: '#0f172a', color: '#fff' }}>🇬🇧 English</option>
        <option value="hi" style={{ background: '#0f172a', color: '#fff' }}>🇮🇳 हिन्दी (Hindi)</option>
        <option value="mr" style={{ background: '#0f172a', color: '#fff' }}>🌾 मराठी (Marathi)</option>
        <option value="te" style={{ background: '#0f172a', color: '#fff' }}>🌾 తెలుగు (Telugu)</option>
        <option value="gu" style={{ background: '#0f172a', color: '#fff' }}>🌾 ગુજરાતી (Gujarati)</option>
        <option value="pa" style={{ background: '#0f172a', color: '#fff' }}>🌾 ਪੰਜਾਬੀ (Punjabi)</option>
        <option value="ta" style={{ background: '#0f172a', color: '#fff' }}>🌾 தமிழ் (Tamil)</option>
        <option value="kn" style={{ background: '#0f172a', color: '#fff' }}>🌾 ಕನ್ನಡ (Kannada)</option>
        <option value="bn" style={{ background: '#0f172a', color: '#fff' }}>🌾 বাংলা (Bengali)</option>
      </select>
    </div>
  );
};
