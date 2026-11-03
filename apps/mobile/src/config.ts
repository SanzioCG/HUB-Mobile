import Constants from 'expo-constants';

export type Delivery = 'online' | 'offline';

const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string | null; glbDelivery?: string };

/** Mock server porti (mock/.env.example). Dev'da manzil Expo serverining IP'sidan olinadi. */
const DEV_API_PORT = 8787;

/** Standart server manzili: EXPO_PUBLIC_API_URL → dev'da Expo hostUri IP + 8787 → null. */
export function defaultApiUrl(): string | null {
  if (extra.apiUrl) return trimSlash(extra.apiUrl);
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:${DEV_API_PORT}` : null;
}

/** GLB yetkazish yo'li (ADR-M002), EXPO_PUBLIC_GLB_DELIVERY bilan almashtiriladi. */
export const defaultDelivery: Delivery = extra.glbDelivery === 'offline' ? 'offline' : 'online';

/** API so'rovlari uchun timeout. */
export const API_TIMEOUT_MS = 15_000;

export const trimSlash = (url: string) => url.trim().replace(/\/+$/, '');
