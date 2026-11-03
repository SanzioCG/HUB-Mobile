// Juftlash ma'lumotlari — expo-secure-store (iOS Keychain / Android Keystore).
import * as SecureStore from 'expo-secure-store';
import type { Company, User } from '../api/types';

const KEY = {
  token: 'uhub_device_token',
  profile: 'uhub_profile',
  apiUrl: 'uhub_api_url',
} as const;

export interface StoredSession {
  token: string;
  user: User;
  company: Company;
}

export async function loadSession(): Promise<StoredSession | null> {
  const [token, profile] = await Promise.all([
    SecureStore.getItemAsync(KEY.token),
    SecureStore.getItemAsync(KEY.profile),
  ]);
  if (!token) return null;
  try {
    const { user, company } = JSON.parse(profile ?? '{}') as Partial<StoredSession>;
    if (user && company) return { token, user, company };
  } catch {
    // buzilgan profil — token bilan ishlashda davom etmaymiz
  }
  return null;
}

export async function saveSession(s: StoredSession): Promise<void> {
  await SecureStore.setItemAsync(KEY.token, s.token);
  await SecureStore.setItemAsync(KEY.profile, JSON.stringify({ user: s.user, company: s.company }));
}

export async function clearSession(): Promise<void> {
  await Promise.all([SecureStore.deleteItemAsync(KEY.token), SecureStore.deleteItemAsync(KEY.profile)]);
}

export const loadApiUrl = () => SecureStore.getItemAsync(KEY.apiUrl);
export const saveApiUrl = (url: string) => SecureStore.setItemAsync(KEY.apiUrl, url);

/**
 * 401 oqimi: token o'chiriladi, keyin `onCleared` (juftlash ekraniga qaytish).
 * Bir vaqtda kelgan bir nechta 401 bitta tozalashga birlashtiriladi.
 */
export function createUnauthorizedHandler(onCleared: () => void): () => Promise<void> {
  let pending: Promise<void> | null = null;
  return () => {
    pending ??= clearSession()
      .catch(() => undefined)
      .then(() => {
        pending = null;
        onCleared();
      });
    return pending;
  };
}
