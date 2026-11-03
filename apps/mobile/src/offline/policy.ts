// Oflayn GLB keshi siyosati (sof): kesh kaliti va LRU tozalash.

export interface CacheEntry {
  revisionId: string;
  bytes: number;
  /** Oxirgi ochilgan/yuklangan vaqt (ms). */
  lastUsed: number;
  /** Offline tabi uchun: buyum nomi va R-belgi (bo'lmasa — revision_id ko'rsatiladi). */
  name?: string;
  revisionLabel?: string;
}

export interface CacheLimits {
  maxRevisions: number;
  maxBytes: number;
}

/**
 * Kesh kaliti — `revision_id` (kontrakt 1.2, 4: URL reviziya bo'yicha o'zgarmas).
 * Fayl nomi: ruxsat etilmagan belgilar `_` ga almashtiriladi.
 */
export const glbFileName = (revisionId: string) => `${revisionId.replace(/[^A-Za-z0-9._-]/g, '_')}.glb`;

/**
 * O'chiriladigan reviziyalar: eng eski ishlatilganidan boshlab, soni va hajmi chegaraga tushguncha.
 * `keep` — hozir ochilayotgan reviziya, u o'chirilmaydi (o'zi chegaradan katta bo'lsa ham).
 */
export function planEviction(entries: readonly CacheEntry[], limits: CacheLimits, keep?: string): string[] {
  const sorted = [...entries].sort((a, b) => a.lastUsed - b.lastUsed);
  let count = sorted.length;
  let bytes = sorted.reduce((s, e) => s + e.bytes, 0);
  const evict: string[] = [];
  for (const e of sorted) {
    if (count <= limits.maxRevisions && bytes <= limits.maxBytes) break;
    if (e.revisionId === keep) continue;
    evict.push(e.revisionId);
    count--;
    bytes -= e.bytes;
  }
  return evict;
}

export const usageOf = (entries: readonly CacheEntry[]) => ({
  count: entries.length,
  bytes: entries.reduce((s, e) => s + e.bytes, 0),
});

export const formatMb = (bytes: number) =>
  `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 2 : 0)} MB`;
