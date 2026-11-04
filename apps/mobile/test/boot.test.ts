// M-A6, 2-qism: yuklanish ekrani — progress haqiqiy bosqichlardan, miltillamaslik qoidasi, qotib qolmaslik.
import {
  BOOT_STAGES,
  MIN_SHOW_MS,
  SHOW_AFTER_MS,
  bootProgress,
  nextPhase,
  withTimeout,
  type BootStage,
} from '../src/boot/phase';

it('progress — bajarilgan bosqichlar ulushi (shriftlar → secure-store → kesh → API)', () => {
  expect(BOOT_STAGES).toEqual(['fonts', 'session', 'cache', 'api']);
  expect(bootProgress(new Set())).toBe(0);
  expect(bootProgress(new Set<BootStage>(['fonts', 'session']))).toBe(0.5);
  expect(bootProgress(new Set(BOOT_STAGES))).toBe(1);
});

it(`${SHOW_AFTER_MS} ms gacha tayyor — yuklanish ekrani ko‘rsatilmaydi (miltillamaydi)`, () => {
  expect(nextPhase({ phase: 'splash', allDone: true, elapsed: 120, shownFor: 0 })).toBe('ready');
  expect(nextPhase({ phase: 'splash', allDone: false, elapsed: 120, shownFor: 0 })).toBe('splash');
});

it(`uzoq davom etsa — yuklanish ekrani, kamida ${MIN_SHOW_MS} ms`, () => {
  expect(nextPhase({ phase: 'splash', allDone: false, elapsed: SHOW_AFTER_MS, shownFor: 0 })).toBe('loading');
  expect(nextPhase({ phase: 'loading', allDone: true, elapsed: 900, shownFor: 100 })).toBe('loading');
  expect(nextPhase({ phase: 'loading', allDone: true, elapsed: 2000, shownFor: MIN_SHOW_MS })).toBe('ready');
  expect(nextPhase({ phase: 'ready', allDone: false, elapsed: 0, shownFor: 0 })).toBe('ready');
});

it('server javob bermasa — timeout, yuklanish qotib qolmaydi', async () => {
  jest.useFakeTimers();
  const p = withTimeout(new Promise<never>(() => {}), 4000);
  jest.advanceTimersByTime(4000);
  await expect(p).resolves.toBe('timeout');
  jest.useRealTimers();
  await expect(withTimeout(Promise.resolve(7), 100)).resolves.toBe(7);
  await expect(withTimeout(Promise.reject(new Error('x')), 100)).rejects.toThrow('x');
});
