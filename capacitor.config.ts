import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cryptobulla.antigravity',
  appName: 'Anti-Gravity',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    hostname: 'localhost',
    cleartext: true
  }
  // Live Sync (uncomment for local testing):
  // server: {
  //   url: 'http://192.168.1.2:5173',
  //   cleartext: true
  // }
};

export default config;
