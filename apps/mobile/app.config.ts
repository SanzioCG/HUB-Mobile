import type { ExpoConfig } from 'expo/config';

// APP_VARIANT=development — dev build (LAN'dagi HTTP mock bilan). Production'da HTTP ruxsat etilmaydi (kontrakt 4: HTTPS).
// Expo Go bu native sozlamalarni ishlatmaydi — u o'zi HTTP'ga ruxsat beradi.
const IS_DEV_BUILD = process.env.APP_VARIANT === 'development';

const config: ExpoConfig = {
  name: 'U-HUB',
  slug: 'uhub-mobile',
  version: '0.1.0',
  scheme: 'uhub',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  backgroundColor: '#111214',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'uz.uhub.mobile',
    // Faqat dev build: LAN'dagi HTTP mock serverga ulanish uchun ATS istisnosi.
    ...(IS_DEV_BUILD && { infoPlist: { NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } } }),
  },
  android: {
    package: 'uz.uhub.mobile',
    adaptiveIcon: {
      backgroundColor: '#111214',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: { favicon: './assets/favicon.png' },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    'expo-asset',
    // Faqat dev build: Android'da HTTP (cleartext) — LAN mock uchun.
    ['expo-build-properties', { android: { usesCleartextTraffic: IS_DEV_BUILD } }],
  ],
  extra: {
    // Server manzili: EXPO_PUBLIC_API_URL (.env) ustun; bo'lmasa dev'da Expo server IP'si + 8787 (src/config.ts).
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? null,
    // GLB yetkazish yo'li (ADR-M002): 'online' (A) yoki 'offline' (B).
    glbDelivery: process.env.EXPO_PUBLIC_GLB_DELIVERY ?? 'online',
  },
};

export default config;
