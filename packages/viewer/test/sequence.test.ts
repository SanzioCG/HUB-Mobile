// Kontrakt 1.6 (2.2): ichki tortma — `reveal` tartibi. Tuzilma haqiqiy V-1a faylidagi "Shkaf 600" kabi:
// eshik D, tashqi "Tortma fasadi 1" (T1, reveal [T1]), eshik ortidagi "Tortma fasadi 2" (T2, reveal [D, T2]).
// Haqiqiy fayl bilan xuddi shu tekshiruv — real-uhub.test.ts (UHUB_REAL_FILE berilganda).
import { describe, expect, it } from 'vitest';
import { RevealIndex, type Plan } from '../src/sequence.js';

const D = 'door__d__open';
const T1 = 'drawer__t1__open';
const T2 = 'drawer__t2__open';
const T3 = 'drawer__t3__open';

const index = (extra: { clip: string; kind: string; reveal: string[] }[] = []) =>
  new RevealIndex(
    [
      { clip: null, kind: 'panel', reveal: [D] }, // yon devor — eshik ortida
      { clip: D, kind: 'door', reveal: [] },
      { clip: T1, kind: 'drawer_front', reveal: [T1] },
      { clip: T1, kind: 'panel', reveal: [T1] }, // tortma tubi
      { clip: T2, kind: 'panel', reveal: [D, T2] }, // ichki tortma tubi — fasaddan oldin kelsa ham
      { clip: T2, kind: 'drawer_front', reveal: [D, T2] },
      ...extra,
    ],
    [D, T1, T2, ...extra.map((e) => e.clip)],
  );

const state = (...open: string[]) => {
  const s = new Set(open);
  return (c: string) => s.has(c);
};
const flat = (p: Plan) => p.map((step) => step.map((m) => `${m.dir > 0 ? '+' : '-'}${m.clip}`).sort());

describe('ichki tortma tartibi', () => {
  it('"Tortma fasadi 2" ochilishi: avval eshik, keyin tortma (ketma-ket)', () => {
    expect(flat(index().planOpen(T2, state()))).toEqual([[`+${D}`], [`+${T2}`]]);
    // eshik allaqachon ochiq — faqat tortma
    expect(flat(index().planOpen(T2, state(D)))).toEqual([[`+${T2}`]]);
  });

  it('yopilishi teskari: avval tortma, keyin eshik', () => {
    expect(flat(index().planClose(T2, state(D, T2)))).toEqual([[`-${T2}`], [`-${D}`]]);
    expect(flat(index().toggle(T2, state(D, T2)))).toEqual([[`-${T2}`], [`-${D}`]]);
  });

  it('tortma ochiq turganda eshikni yopish: avval tortma, keyin eshik', () => {
    expect(flat(index().planClose(D, state(D, T2)))).toEqual([[`-${T2}`], [`-${D}`]]);
    expect(flat(index().planClose(D, state(D)))).toEqual([[`-${D}`]]);
  });

  it('tashqi "Tortma fasadi 1" eshikka tegmaydi', () => {
    expect(flat(index().planOpen(T1, state()))).toEqual([[`+${T1}`]]);
    expect(flat(index().planClose(T1, state(T1, D)))).toEqual([[`-${T1}`]]);
    expect(index().prerequisites(T1)).toEqual([]);
  });

  it('eshik ortida boshqa ochiq tortma qolsa — eshik yopilmaydi', () => {
    const idx = index([{ clip: T3, kind: 'drawer_front', reveal: [D, T3] }]);
    expect(flat(idx.planClose(T2, state(D, T2, T3)))).toEqual([[`-${T2}`]]);
    expect(flat(idx.planClose(D, state(D, T2, T3)))).toEqual([[`-${T2}`, `-${T3}`], [`-${D}`]]);
  });

  it('hammasini ochish: avval eshiklar (va tashqi tortmalar), keyin ichki; yopish — teskari', () => {
    expect(flat(index().planAll(1, state()))).toEqual([[`+${D}`, `+${T1}`].sort(), [`+${T2}`]]);
    expect(flat(index().planAll(-1, state(D, T1, T2)))).toEqual([[`-${T2}`], [`-${D}`, `-${T1}`].sort()]);
    expect(flat(index().planAll(1, state(D, T1, T2)))).toEqual([]);
  });

  it('reveal ichidagi noma’lum klip e’tiborsiz; tartib ma’lumotdan (hisoblanmaydi)', () => {
    const idx = new RevealIndex(
      [{ clip: T2, kind: 'drawer_front', reveal: ['door__yoq__open', D, T2] }],
      [D, T2],
    );
    expect(idx.prerequisites(T2)).toEqual([D]);
    expect(idx.dependents(D)).toEqual([T2]);
    expect(idx.depth(T2)).toBe(1);
    expect(idx.depth(D)).toBe(0);
  });
});
