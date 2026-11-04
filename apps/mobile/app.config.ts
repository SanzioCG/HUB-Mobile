import type { ExpoConfig } from 'expo/config';

/**
 * M-A8: ilova varianti — `APP_VARIANT` (eas.json profili va EAS environment'i beradi; lokal `expo start` — development).
 * - development: dev build (Expo Go yoki dev client);
 * - internal: ichki sinov APK (`preview` profili) — nomi "U-HUB (test)";
 * - production: do'kon uchun (AAB). HTTP ruxsat etilmaydi (kontrakt 4: HTTPS).
 * Expo Go bu native sozlamalarni ishlatmaydi — u o'zi HTTP'ga ruxsat beradi.
 */
type AppVariant = 'development' | 'internal' | 'production';
const VARIANTS: readonly AppVariant[] = ['development', 'internal', 'production'];
const APP_VARIANT: AppVariant = VARIANTS.includes(process.env.APP_VARIANT as AppVariant)
  ? (process.env.APP_VARIANT as AppVariant)
  : 'development';
/** HTTP (cleartext) va iOS ATS istisnosi. internal — DEP-1 gacha LAN mock uchun; HTTPS server kelgach olib tashlanadi. */
const ALLOW_HTTP = APP_VARIANT !== 'production';

/**
 * EAS loyiha identifikatori (`eas init` beradi; maxfiy emas). Bo'sh bo'lsa — OTA (expo-updates) o'chiq,
 * Expo Go va lokal ishga tushirish o'zgarmaydi.
 */
const EAS_PROJECT_ID: string | null = 'fc157f7a-83bf-4267-80b7-07a8a468e2f7';

/**
 * Kontrakt 1.6 (10.3): tizim "Ulashish / Ochish" orqali `.uhub`. Expo Go bu native sozlamalarni ishlatmaydi —
 * faqat dev/production build'da sinaladi; Expo Go'da asosiy yo'l — "Fayldan ochish" (hujjat tanlash).
 */
const UHUB_UTI = 'uz.uhub.project';
const UHUB_MIME = ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'];

/**
 * M-A6: rasmlar repo ildizidagi `assets/` dan (yagona manba, docs/design/ASSETS.md). Fayl shu nom bilan almashtiriladi —
 * kod o'zgarmaydi. Expo Go'da loyiha ikonkasi va tizim splash'i ko'rinmaydi (Expo Go o'zinikini ko'rsatadi) — faqat build'da.
 */
const BRAND = '../../assets/brand';
const BG = '#0B0D0F';

const config: ExpoConfig = {
  // Ichki o'rnatma keyingi production ilova bilan adashtirilmasin; `package` ikkalasida bir xil.
  name: APP_VARIANT === 'internal' ? 'U-HUB (test)' : 'U-HUB',
  // M-A8: EAS loyihasi "uhub-mobile" tashkilotida (founder qarori).
  owner: 'uhub-mobile',
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
      // development va internal: LAN'dagi HTTP mock uchun ATS istisnosi (DEP-1 gacha).
      ...(ALLOW_HTTP && { NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } }),
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
    // development va internal: Android'da HTTP (cleartext) — LAN mock uchun (DEP-1 gacha; HTTPS kelgach olib tashlanadi).
    ['expo-build-properties', { android: { usesCleartextTraffic: ALLOW_HTTP } }],
  ],
  // Server manzili (EXPO_PUBLIC_API_URL) va GLB yetkazish yo'li (EXPO_PUBLIC_GLB_DELIVERY) — src/config.ts da
  // to'g'ridan-to'g'ri o'qiladi, `extra` orqali emas. `appVariant` — Sozlamalar va dev elementlari uchun (src/config.ts).
  extra: {
    appVariant: APP_VARIANT,
    ...(EAS_PROJECT_ID ? { eas: { projectId: EAS_PROJECT_ID } } : {}),
  },
  // M-A8: OTA (EAS Update). Native o'zgarish bo'lsa runtime versiyasi o'zgaradi — yangi APK kerak.
  runtimeVersion: { policy: 'fingerprint' },
  ...(EAS_PROJECT_ID
    ? {
        updates: {
          url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
          // Ochilganda tekshiradi, fonda yuklaydi, keyingi ochilishda qo'llaydi (ochilish kutmaydi).
          checkAutomatically: 'ON_LOAD',
          fallbackToCacheTimeout: 0,
        },
      }
    : {}),
};

export default config;
