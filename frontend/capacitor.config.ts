import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.agro.ai',
  appName: 'Plant Medic',
  webDir: 'dist',
  server: {
    cleartext: true
  }
};

export default config;
