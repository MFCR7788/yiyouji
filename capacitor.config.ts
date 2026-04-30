import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hhs.mingai',
  appName: '易有吉',
  webDir: 'capacitor-www',
  server: {
    url: 'https://yiyouji.zjsian.com',
    cleartext: false,
    allowNavigation: [
      'yiyouji.zjsian.com',
      '*.yiyouji.zjsian.com',
      '*.vercel.app',
    ],
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1a1a2e',
      showSpinner: true,
      spinnerColor: '#e8b84b',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1a1a2e',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
  android: {
    backgroundColor: '#1a1a2e',
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#1a1a2e',
  },
};

export default config;
