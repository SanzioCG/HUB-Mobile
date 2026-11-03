// "Oxirgi skanerlar": oxirgi 10 ta resolve natijasi + vaqt (AsyncStorage).
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ResolveResponse } from '../api/types';

export const RECENT_MAX = 10;
const KEY = 'uhub.recentScans';

export interface RecentScan {
  qr: string;
  at: number;
  result: ResolveResponse;
  /** Detal raqami — resolve'da yo'q; viewer `selected` dan keyin to'ldiriladi. */
  part_number?: string;
}

/** Yangisi boshida; bir xil QR bitta yozuv; ko'pi bilan `max`. */
export function pushRecent(list: readonly RecentScan[], scan: RecentScan, max = RECENT_MAX): RecentScan[] {
  const prev = list.find((s) => s.qr === scan.qr);
  const merged = { ...scan, part_number: scan.part_number ?? prev?.part_number };
  return [merged, ...list.filter((s) => s.qr !== scan.qr)].slice(0, max);
}

export async function loadRecent(): Promise<RecentScan[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as RecentScan[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function addRecent(scan: RecentScan): Promise<RecentScan[]> {
  const next = pushRecent(await loadRecent(), scan);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

/** Viewer detalni tanlagach raqamni yozib qo'yish. */
export async function setRecentNumber(qr: string, partNumber: string): Promise<void> {
  const list = await loadRecent();
  const i = list.findIndex((s) => s.qr === qr);
  if (i < 0 || list[i]!.part_number === partNumber) return;
  list[i] = { ...list[i]!, part_number: partNumber };
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}
