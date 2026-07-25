// apiConfig.ts - Handles dynamic backend API base URL resolution for Web and Capacitor Mobile environments

// Check if running inside Capacitor
export const isCapacitorNative = (): boolean => {
  return typeof window !== 'undefined' && (Boolean((window as any).Capacitor?.isNativePlatform?.()) || Boolean((window as any).Capacitor));
};

// Returns the active API base URL
export const getApiBaseUrl = (): string => {
  // 1. Check if user configured a custom backend URL in LocalStorage
  if (typeof localStorage !== 'undefined') {
    const customUrl = localStorage.getItem('AGRO_AI_API_BASE');
    if (customUrl && customUrl.trim().length > 0) {
      return customUrl.trim().replace(/\/$/, '');
    }
  }

  // 2. Check build-time environment variable
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '');
  }

  // 3. Fallback for mobile native app execution
  if (isCapacitorNative()) {
    // 10.0.2.2 points to localhost host PC in Android Emulator
    return 'http://10.0.2.2:8000';
  }

  // 4. Fallback for standard web browser (relative path using Vite dev server proxy)
  return '';
};

/**
 * Formats endpoint paths into full request URLs
 */
export const getApiUrl = (path: string): string => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${cleanPath}` : cleanPath;
};

export const setApiBaseUrl = (url: string): void => {
  if (typeof localStorage !== 'undefined') {
    if (url && url.trim().length > 0) {
      localStorage.setItem('AGRO_AI_API_BASE', url.trim().replace(/\/$/, ''));
    } else {
      localStorage.removeItem('AGRO_AI_API_BASE');
    }
  }
};
