import Constants from 'expo-constants';

export type Delivery = 'online' | 'offline';

/** Mock server porti (mock/.env.example). Dev'da manzil Expo serverining IP'sidan olinadi. */
const DEV_API_PORT = 8787;

// EXPO_PUBLIC_* o'zgaruvchilari bundle'ga to'g'ridan-to'g'ri joylanadi (babel-preset-expo).
// app.config `extra` orqali uzatilmaydi: Expo config yuklagichida aniqlanmagan qiymat `{}` bo'lib qolgan.
const envString = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const ENV_API_URL = envString(process.env.EXPO_PUBLIC_API_URL);
const ENV_GLB_DELIVERY = envString(process.env.EXPO_PUBLIC_GLB_DELIVERY);

/** Standart server manzili: EXPO_PUBLIC_API_URL → dev'da Expo hostUri IP + 8787 → null. */
export function defaultApiUrl(): string | null {
  if (ENV_API_URL) return trimSlash(ENV_API_URL);
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:${DEV_API_PORT}` : null;
}

/** GLB yetkazish yo'li (ADR-M002), EXPO_PUBLIC_GLB_DELIVERY bilan almashtiriladi. */
export const defaultDelivery: Delivery = ENV_GLB_DELIVERY === 'offline' ? 'offline' : 'online';

/**
 * Android AR sahifasini ochish yo'li (M-A5): `custom-tabs` — expo-web-browser (Chrome Custom Tabs, ilovaga qaytish
 * qulay); `chrome` — Linking.openURL (to'liq Chrome). WebXR Custom Tabs'da ishlamasa —
 * EXPO_PUBLIC_AR_OPEN=chrome. Founder telefonda tekshiradi (M-A5 hisoboti).
 */
export type ArOpen = 'custom-tabs' | 'chrome';
export const AR_OPEN: ArOpen =
  envString(process.env.EXPO_PUBLIC_AR_OPEN) === 'chrome' ? 'chrome' : 'custom-tabs';

/** API so'rovlari uchun timeout. */
export const API_TIMEOUT_MS = 15_000;

export const trimSlash = (url: string) => url.trim().replace(/\/+$/, '');

/**
 * Oflayn GLB keshi chegaralari (ADR-M002, B yo'li): oxirgi 20 reviziya yoki 500 MB, LRU bo'yicha tozalanadi.
 * Founder sozlamasi — kontraktda yo'q.
 */
export const CACHE_LIMITS = {
  maxRevisions: 20,
  maxBytes: 500 * 1024 * 1024,
} as const;
