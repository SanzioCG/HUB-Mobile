// M-A6, 2-qism: ilova ichidagi yuklanish ekrani — sof mantiq (testlanadi).
// Progress haqiqiy bosqichlarga bog'langan: shriftlar → secure-store (server, token) → kesh indeksi → birinchi API
// so'rovi (oflaynda — keshdan). Soxta taymer yo'q.
//
// Founder qarori (2026-11-04): yuklanish ekrani har doim ko'rsatiladi va kamida `MIN_SHOW_MS` (≈1–1.5 s) turadi —
// brend ekrani ko'rinsin. Bosqichlar undan uzoq cho'zilsa — tugaguncha (progress haqiqiy).

export const BOOT_STAGES = ['fonts', 'session', 'cache', 'api'] as const;
export type BootStage = (typeof BOOT_STAGES)[number];

/** Tizim splash'idan yuklanish ekraniga darhol o'tiladi. */
export const SHOW_AFTER_MS = 0;
export const MIN_SHOW_MS = 1200;
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
  if (p.phase === 'splash') return p.elapsed >= SHOW_AFTER_MS ? 'loading' : 'splash';
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
