import type { ExpoConfig } from 'expo/config';

// APP_VARIANT=development — dev build (LAN'dagi HTTP mock bilan). Production'da HTTP ruxsat etilmaydi (kontrakt 4: HTTPS).
// Expo Go bu native sozlamalarni ishlatmaydi — u o'zi HTTP'ga ruxsat beradi.
const IS_DEV_BUILD = process.env.APP_VARIANT === 'development';

/**
 * Kontrakt 1.6 (10.3): tizim "Ulashish / Ochish" orqali `.uhub`. Expo Go bu native sozlamalarni ishlatmaydi —
 * faqat dev/production build'da sinaladi; Expo Go'da asosiy yo'l — "Fayldan ochish" (hujjat tanlash).
 */
const UHUB_UTI = 'uz.uhub.project';
const UHUB_MIME = ['application/zip', 'application/octet-stream'];

/**
 * M-A6: rasmlar repo ildizidagi `assets/` dan (yagona manba, docs/design/ASSETS.md). Fayl shu nom bilan almashtiriladi —
 * kod o'zgarmaydi. Expo Go'da loyiha ikonkasi va tizim splash'i ko'rinmaydi (Expo Go o'zinikini ko'rsatadi) — faqat build'da.
 */
const BRAND = '../../assets/brand';
const BG = '#0B0D0F';

const config: ExpoConfig = {
  name: 'U-HUB',
  slug: 'uhub-mobile',
  version: '0.1.0',
  scheme: 'uhub',
  orientation: 'portrait',
  icon: `${BRAND}/icon.png`,
  userInterfaceStyle: 'dark',
  backgroundColor: BG,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'uz.uhub.mobile',
    infoPlist: {
      // Faqat dev build: LAN'dagi HTTP mock serverga ulanish uchun ATS istisnosi.
      ...(IS_DEV_BUILD && { NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } }),
      UTExportedTypeDeclarations: [
        {
          UTTypeIdentifier: UHUB_UTI,
          UTTypeDescription: 'U-HUB loyiha fayli',
          UTTypeConformsTo: ['public.zip-archive', 'public.data'],
          UTTypeTagSpecification: { 'public.filename-extension': ['uhub'] },
        },
      ],
      CFBundleDocumentTypes: [
        { CFBundleTypeName: 'U-HUB loyiha fayli', LSItemContentTypes: [UHUB_UTI], LSHandlerRank: 'Owner' },
      ],
    },
  },
  android: {
    package: 'uz.uhub.mobile',
    adaptiveIcon: {
      backgroundColor: BG,
      foregroundImage: `${BRAND}/adaptive-foreground.png`,
      monochromeImage: `${BRAND}/adaptive-monochrome.png`,
    },
    predictiveBackGestureEnabled: false,
    intentFilters: [
      {
        action: 'VIEW',
        category: ['DEFAULT', 'BROWSABLE'],
        data: [
          ...UHUB_MIME.map((mimeType) => ({ scheme: 'content', mimeType })),
          { scheme: 'file', mimeType: '*/*', pathPattern: '.*\\.uhub' },
        ],
      },
      { action: 'SEND', category: ['DEFAULT'], data: UHUB_MIME.map((mimeType) => ({ mimeType })) },
    ],
  },
  web: { favicon: `${BRAND}/favicon-48.png` },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    'expo-asset',
    // Tizim splash'i (Android 12+ — faqat markazdagi belgi): iOS va Android bir xil. Keyin ilovaning o'z yuklanish ekrani.
    ['expo-splash-screen', { image: `${BRAND}/splash-icon.png`, imageWidth: 200, backgroundColor: BG }],
    // Faqat dev build: Android'da HTTP (cleartext) — LAN mock uchun.
    ['expo-build-properties', { android: { usesCleartextTraffic: IS_DEV_BUILD } }],
  ],
  // Server manzili (EXPO_PUBLIC_API_URL) va GLB yetkazish yo'li (EXPO_PUBLIC_GLB_DELIVERY) — src/config.ts da
  // to'g'ridan-to'g'ri o'qiladi, `extra` orqali emas.
};

export default config;
