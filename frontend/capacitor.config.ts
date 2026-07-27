import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.agro.ai',
  appName: 'Plant Medic',
  webDir: 'dist',
  server: {
    // Use the local web bundle (dist) but allow cleartext HTTP for local API fallback
    cleartext: true,
    // allowNavigation allows loading resources from Render backend
    allowNavigation: ['agro-ai-ml-service.onrender.com']
  }
};

export default config;
