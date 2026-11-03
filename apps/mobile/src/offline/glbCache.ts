// Oflayn GLB keshi (ADR-M002, B yo'li): `documentDirectory/cache/<revision_id>.glb` + LRU indeksi (AsyncStorage).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { CACHE_LIMITS } from '../config';
import { glbFileName, planEviction, usageOf, type CacheEntry } from './policy';

const INDEX_KEY = 'uhub.glbCache';

export function cacheDir(): Directory {
  return new Directory(Paths.document, 'cache');
}

const glbFile = (revisionId: string) => new File(cacheDir(), glbFileName(revisionId));

async function loadIndex(): Promise<Record<string, CacheEntry>> {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    return raw ? (JSON.parse(raw) as Record<string, CacheEntry>) : {};
  } catch {
    return {};
  }
}

const saveIndex = (index: Record<string, CacheEntry>) =>
  AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index)).catch(() => undefined);

/** Indeksda bor va fayl diskda mavjud. */
export async function isCached(revisionId: string): Promise<boolean> {
  const index = await loadIndex();
  return Boolean(index[revisionId]) && glbFile(revisionId).exists;
}

/** Keshdagi reviziyalar (ro'yxatlarda "Oflayn mavjud" uchun). */
export async function cachedEntries(): Promise<Record<string, CacheEntry>> {
  return loadIndex();
}

export async function cacheUsage() {
  return usageOf(Object.values(await loadIndex()));
}

/** glTF binary sarlavhasi: "glTF". */
function isGlb(file: File): boolean {
  const h = file.open();
  try {
    return String.fromCharCode(...h.readBytesSync(4)) === 'glTF';
  } finally {
    h.close();
  }
}

const inFlight = new Map<string, Promise<File>>();

/**
 * Reviziya keshda bo'lishini ta'minlaydi: bor bo'lsa — LRU vaqti yangilanadi; yo'q bo'lsa — yuklab olinadi
 * (`.part` → `glTF` tekshiruvi → ko'chirish) va chegaradan oshganlar LRU bo'yicha o'chiriladi.
 */
export function ensureCached(revisionId: string, url: string, token: string): Promise<File> {
  const running = inFlight.get(revisionId);
  if (running) return running;
  const job = (async () => {
    const dir = cacheDir();
    if (!dir.exists) dir.create({ intermediates: true });
    const file = glbFile(revisionId);
    const index = await loadIndex();
    if (!file.exists) {
      const part = new File(dir, `${glbFileName(revisionId)}.part`);
      if (part.exists) part.delete();
      await File.downloadFileAsync(url, part, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        idempotent: true,
      });
      if (!isGlb(part)) {
        part.delete();
        throw new Error('yuklangan fayl GLB emas (server xatosi?)');
      }
      await part.move(file);
    }
    index[revisionId] = { revisionId, bytes: file.size ?? 0, lastUsed: Date.now() };
    for (const old of planEviction(Object.values(index), CACHE_LIMITS, revisionId)) {
      const f = glbFile(old);
      if (f.exists) f.delete();
      delete index[old];
    }
    await saveIndex(index);
    return file;
  })().finally(() => inFlight.delete(revisionId));
  inFlight.set(revisionId, job);
  return job;
}

export async function clearCache(): Promise<void> {
  const dir = cacheDir();
  if (dir.exists) dir.delete();
  await AsyncStorage.removeItem(INDEX_KEY).catch(() => undefined);
}
