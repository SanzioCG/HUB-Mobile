// Oxirgi JS xatosi: release'da ushlanmagan xato ilovani yopadi va sababi ko'rinmaydi (telefonda log yo'q).
// Xato matni saqlanadi va keyingi ochilishda Sozlamalar → "Oxirgi xato" da ko'rinadi.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'diag:lastError';
const MAX = 2000;

export interface LastError {
  at: string;
  where: string;
  message: string;
}

export function describeError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}\n${error.stack ?? ''}`.slice(0, MAX);
  return String(error).slice(0, MAX);
}

export async function saveLastError(where: string, error: unknown, now: () => Date = () => new Date()) {
  const rec: LastError = { at: now().toISOString(), where, message: describeError(error) };
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(rec));
  } catch {
    // saqlab bo'lmasa — jim (xato ustiga xato chiqarmaslik)
  }
}

export async function loadLastError(): Promise<LastError | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LastError) : null;
  } catch {
    return null;
  }
}

export async function clearLastError(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // jim
  }
}

interface ErrorUtilsLike {
  getGlobalHandler(): (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler(fn: (error: unknown, isFatal?: boolean) => void): void;
}

/**
 * Ushlanmagan JS xatolari (hodisa ishlovchilari, promise'lar): avval saqlanadi, keyin odatdagi ishlovchi
 * (release'da fatal xato ilovani yopadi — buni o'zgartirmaymiz, faqat sababini yozib qo'yamiz).
 */
export function installGlobalErrorCapture(utils: ErrorUtilsLike | undefined): void {
  if (!utils) return;
  const prev = utils.getGlobalHandler();
  utils.setGlobalHandler((error, isFatal) => {
    void saveLastError(isFatal ? 'fatal' : 'global', error).finally(() => prev(error, isFatal));
  });
}
