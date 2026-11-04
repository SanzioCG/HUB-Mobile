// M-A6, 2-qism: ilova ichidagi yuklanish ekrani — sof mantiq (testlanadi).
// Progress haqiqiy bosqichlarga bog'langan: shriftlar → secure-store (server, token) → kesh indeksi → birinchi API
// so'rovi (oflaynda — keshdan). Soxta taymer yo'q.
//
// Miltillamaslik qarori: tizim splash'i `SHOW_AFTER_MS` gacha ushlab turiladi. Shu vaqtgacha hammasi tayyor bo'lsa —
// yuklanish ekrani umuman ko'rsatilmaydi (to'g'ridan-to'g'ri ilovaga). Ko'rsatilgan bo'lsa — kamida `MIN_SHOW_MS`.

export const BOOT_STAGES = ['fonts', 'session', 'cache', 'api'] as const;
export type BootStage = (typeof BOOT_STAGES)[number];

export const SHOW_AFTER_MS = 300;
export const MIN_SHOW_MS = 600;
/** Birinchi API so'rovi yuklanishni shundan ko'p ushlab turmaydi — keyin ilova o'zi oflayn/xato holatini ko'rsatadi. */
export const API_STAGE_TIMEOUT_MS = 4000;

export type BootPhase = 'splash' | 'loading' | 'ready';

export const bootProgress = (done: ReadonlySet<BootStage>) =>
  BOOT_STAGES.filter((s) => done.has(s)).length / BOOT_STAGES.length;

/**
 * Keyingi holat. `elapsed` — boshlanishdan beri, `shownFor` — yuklanish ekrani ko'rsatilganidan beri (ms).
 */
export function nextPhase(p: {
  phase: BootPhase;
  allDone: boolean;
  elapsed: number;
  shownFor: number;
}): BootPhase {
  if (p.phase === 'ready') return 'ready';
  if (p.phase === 'splash') {
    if (p.allDone) return 'ready';
    return p.elapsed >= SHOW_AFTER_MS ? 'loading' : 'splash';
  }
  return p.allDone && p.shownFor >= MIN_SHOW_MS ? 'ready' : 'loading';
}

/** Promise yoki timeout — qaysi biri oldin (yuklanish qotib qolmasin). */
export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | 'timeout'> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => resolve('timeout'), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(t);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}
