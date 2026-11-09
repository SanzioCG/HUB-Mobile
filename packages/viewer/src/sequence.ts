// Kontrakt 1.6 (2.2): ichki tortma (eshik ortida) — `reveal` tartibi. Sof rejalashtiruvchi: qaysi kliplar qaysi
// tartibda ijro etilishini qaytaradi, ijro etmaydi. Tartib ma'lumotdan (`reveal`), hisoblanmaydi.
//
// - Tortmani ochish: fasadining `reveal` ro'yxati tartib bilan (avval eshik, keyin tortma).
// - Tortmani yopish: teskari (avval tortma, keyin eshik — agar eshik ortida boshqa ochiq tortma qolmasa).
// - Eshikni yopish: avval uning ortidagi ochiq tortmalar, keyin eshik. "Ortidagi" — `reveal` ida shu eshik bor tortmalar.
// - Hammasini ochish: avval eshiklar, keyin ichki tortmalar; yopish — teskari.
//
// Kontrakt 1.10 (2.2): pantograf (`lift__<id>__open`) — xuddi ichki tortma qoidasi: `reveal` i
// (`pivot__lift__<id>` dagi `extras.uhub.lift.reveal`) — undan oldin ochiladigan eshiklar. Ochishda avval eshiklar,
// keyin pantograf; yopishda teskari; eshik yopilishidan oldin uning ortidagi tushgan pantograf ko'tariladi.
// "Hammasini ochish" da pantograflar eshiklardan keyin (`reveal` bo'sh bo'lsa ham — `all__open` kabi).

export type Dir = 1 | -1;
export interface Move {
  clip: string;
  dir: Dir;
}
/** Bosqichlar ketma-ket; bir bosqich ichidagi harakatlar birga. */
export type Plan = Move[][];

/**
 * Detal: o'z klipi (`pivot__door`/`slide__drawer`/`pivot__lift` ostida bo'lsa) va `reveal` ro'yxati.
 * Pantograf tugunining o'zi ham shu shaklda keladi: `kind: 'lift'`, `reveal` — `extras.uhub.lift.reveal`.
 */
export interface RevealPart {
  clip: string | null;
  kind: string;
  reveal: readonly string[];
}

export class RevealIndex {
  /** klip → undan oldin ochilishi kerak bo'lgan kliplar (tartib bilan, o'zisiz). */
  private readonly prereq = new Map<string, string[]>();
  /** Pantograf kliplari — "hammasini ochish" da eshiklardan keyin. */
  private readonly lifts = new Set<string>();

  constructor(
    parts: readonly RevealPart[],
    private readonly clips: readonly string[],
  ) {
    const known = new Set(clips);
    // Pantograf tuguni (`lift`) va fasad (`drawer_front`/`door`) ning `reveal` i ustun; bo'lmasa — o'sha klipdagi
    // istalgan detal (pantograf furniturasida `reveal` yo'q).
    const rank = (k: string) => (k === 'lift' || k === 'drawer_front' || k === 'door' ? 0 : 1);
    const sorted = [...parts].sort((a, b) => rank(a.kind) - rank(b.kind));
    for (const p of sorted) {
      if (p.kind === 'lift' && p.clip && known.has(p.clip)) this.lifts.add(p.clip);
      if (!p.clip || !known.has(p.clip) || this.prereq.has(p.clip)) continue;
      const before: string[] = [];
      for (const c of p.reveal) {
        if (c === p.clip) break;
        if (known.has(c) && !before.includes(c)) before.push(c);
      }
      this.prereq.set(p.clip, before);
    }
  }

  prerequisites(clip: string): string[] {
    return this.prereq.get(clip) ?? [];
  }

  /** `clip` ni oldindan talab qiladigan kliplar (eshik ortidagi tortmalar). */
  dependents(clip: string): string[] {
    return this.clips.filter((c) => this.prerequisites(c).includes(clip));
  }

  /** Bog'liqlik chuqurligi: eshik va tashqi tortma — 0, ichki tortma va pantograf — 1 … */
  depth(clip: string, seen = new Set<string>()): number {
    if (seen.has(clip)) return 0;
    seen.add(clip);
    const pre = this.prerequisites(clip);
    const d = pre.length ? 1 + Math.max(...pre.map((c) => this.depth(c, seen))) : 0;
    return this.lifts.has(clip) ? Math.max(1, d) : d;
  }

  /**
   * Kliplar ro'yxatini ochish tartibida to'ldiradi: har klipdan oldin uning ochilmagan oldingi kliplari
   * (masalan detal `reveal` ida faqat pantograf bo'lsa ham — avval uning eshiklari). Takrorlar yo'q.
   */
  expand(clips: readonly string[]): string[] {
    const out: string[] = [];
    const add = (c: string, seen: Set<string>) => {
      if (out.includes(c) || seen.has(c)) return;
      seen.add(c);
      for (const p of this.prerequisites(c)) add(p, seen);
      out.push(c);
    };
    for (const c of clips) add(c, new Set());
    return out;
  }

  /** Bitta klipni ochish. */
  planOpen(clip: string, isOpen: (c: string) => boolean): Plan {
    const plan: Plan = [];
    for (const c of [...this.prerequisites(clip), clip]) if (!isOpen(c)) plan.push([{ clip: c, dir: 1 }]);
    return plan;
  }

  /** Bitta klipni yopish. */
  planClose(clip: string, isOpen: (c: string) => boolean): Plan {
    // Eshik: avval ortidagi ochiq tortmalar (chuqurrog'i oldin), keyin o'zi.
    const closing = new Set([clip, ...this.openDependents(clip, isOpen)]);
    const plan = this.planSet([...closing].filter(isOpen), -1);
    // Tortma: keyin uning eshiklari teskari tartibda — ortida boshqa ochiq tortma qolmasa.
    const pre = this.prerequisites(clip);
    for (const c of [...pre].reverse()) {
      if (!isOpen(c)) continue;
      const stillNeeded = this.dependents(c).some((d) => d !== clip && !closing.has(d) && isOpen(d));
      if (stillNeeded) break;
      closing.add(c);
      plan.push([{ clip: c, dir: -1 }]);
    }
    return plan;
  }

  toggle(clip: string, isOpen: (c: string) => boolean): Plan {
    return isOpen(clip) ? this.planClose(clip, isOpen) : this.planOpen(clip, isOpen);
  }

  /** Bir nechta klip birga: ochishda sayozdan chuqurga, yopishda teskari; bir chuqurlik — bitta bosqich. */
  planSet(clips: readonly string[], dir: Dir): Plan {
    const layers = new Map<number, string[]>();
    for (const c of clips) {
      const d = this.depth(c);
      layers.set(d, [...(layers.get(d) ?? []), c]);
    }
    const order = [...layers.keys()].sort((a, b) => (dir > 0 ? a - b : b - a));
    return order.map((d) => layers.get(d)!.map((clip) => ({ clip, dir })));
  }

  planAll(dir: Dir, isOpen: (c: string) => boolean): Plan {
    return this.planSet(
      this.clips.filter((c) => (dir > 0 ? !isOpen(c) : isOpen(c))),
      dir,
    );
  }

  private openDependents(clip: string, isOpen: (c: string) => boolean, acc = new Set<string>()): string[] {
    for (const d of this.dependents(clip)) {
      if (acc.has(d) || !isOpen(d)) continue;
      acc.add(d);
      this.openDependents(d, isOpen, acc);
    }
    return [...acc];
  }
}
