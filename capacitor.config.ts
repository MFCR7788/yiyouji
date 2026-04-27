import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hhs.taibu',
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
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;
