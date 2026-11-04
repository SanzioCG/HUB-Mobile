// Kliplar: ochish — oldinga ijro, yopish — xuddi shu action teskari (kontrakt 2.2).
import { AnimationMixer, LoopOnce, type AnimationAction, type AnimationClip, type Object3D } from 'three';
import { isOpenableClip } from './model.js';
import { qualify } from './project.js';
import type { Plan } from './sequence.js';

/** Bitta buyumning kliplari; `prefix` — loyiha rejimida buyum kaliti (bitta buyumda ''). */
export interface ClipGroup {
  root: Object3D;
  clips: readonly AnimationClip[];
  prefix: string;
}

export class ClipPlayer {
  private readonly mixers: AnimationMixer[] = [];
  private readonly actions = new Map<string, AnimationAction>();
  private readonly open = new Set<string>();
  private readonly pending = new Map<AnimationAction, () => void>();
  /** Har yangi `run` oldingi rejani to'xtatadi (ijrodagi klip oxirigacha boradi). */
  private runId = 0;
  /** Ochiq kliplar to'plami o'zgarganda (host tugmalari holati uchun). */
  onChange: ((open: string[]) => void) | null = null;

  /** Bitta buyum: `(root, clips)`; loyiha (`.uhub`, 10.4): har buyum o'z mixer'i bilan, nomlar kalit bilan. */
  constructor(root: Object3D | readonly ClipGroup[], clips: readonly AnimationClip[] = []) {
    const groups = Array.isArray(root) ? root : [{ root: root as Object3D, clips, prefix: '' }];
    for (const g of groups) {
      const mixer = new AnimationMixer(g.root);
      this.mixers.push(mixer);
      for (const clip of g.clips) {
        if (!isOpenableClip(clip.name)) continue;
        const a = mixer.clipAction(clip);
        a.setLoop(LoopOnce, 1);
        a.clampWhenFinished = true;
        a.play();
        a.paused = true; // yopiq holat: time = 0
        this.actions.set(qualify(g.prefix, clip.name), a);
      }
      mixer.addEventListener('finished', (e) => {
        const done = this.pending.get(e.action);
        this.pending.delete(e.action);
        done?.();
      });
    }
  }

  get names(): string[] {
    return [...this.actions.keys()];
  }

  has(name: string): boolean {
    return this.actions.has(name);
  }

  isOpen(name: string): boolean {
    return this.open.has(name);
  }

  /**
   * Klipni joriy holatidan ochiq (dir=1) yoki yopiq (dir=-1) tomonga ijro etadi.
   * Allaqachon shu holatda bo'lsa sakrash bo'lmaydi: keyingi kadrda tugaydi.
   */
  play(name: string, dir: 1 | -1): Promise<void> {
    const a = this.actions.get(name);
    if (!a) return Promise.resolve();
    const was = this.open.has(name);
    if (dir > 0) this.open.add(name);
    else this.open.delete(name);
    if (was !== this.open.has(name)) this.onChange?.([...this.open]);
    this.pending.get(a)?.(); // avvalgi kutuvchini bo'shatish
    a.enabled = true;
    a.timeScale = dir;
    a.paused = false;
    return new Promise((resolve) => this.pending.set(a, resolve));
  }

  /**
   * Kliplarni ro'yxat tartibida ketma-ket ochadi (kontrakt 6: `reveal`): keyingisi oldingisi tugagach boshlanadi.
   * `cancelled()` true bo'lsa to'xtaydi (yangi tanlov keldi). Tugallanganda true.
   */
  async openSequence(names: readonly string[], cancelled: () => boolean = () => false): Promise<boolean> {
    for (const name of names) {
      await this.play(name, 1);
      if (cancelled()) return false;
    }
    return true;
  }

  /**
   * Reja (kontrakt 1.6, 2.2 — `sequence.ts`): bosqichlar ketma-ket, bosqich ichida birga. Yangi `run` yoki
   * `cancelled()` keyingi bosqichlarni bekor qiladi. Tugallanganda true.
   */
  async run(plan: Plan, cancelled: () => boolean = () => false): Promise<boolean> {
    const id = ++this.runId;
    for (const step of plan) {
      await Promise.all(step.map((m) => this.play(m.clip, m.dir)));
      if (id !== this.runId || cancelled()) return false;
    }
    return true;
  }

  /** Klipni yolg'iz ijro etish — `reveal` tartibisiz (faqat dev sinov sahifasi, kontrakt 2.2). */
  toggle(name: string): Promise<void> {
    return this.play(name, this.isOpen(name) ? -1 : 1);
  }

  playAll(dir: 1 | -1): Promise<void> {
    return Promise.all(this.names.map((n) => this.play(n, dir))).then(() => undefined);
  }

  update(dt: number): void {
    for (const m of this.mixers) m.update(dt);
  }

  dispose(): void {
    for (const done of this.pending.values()) done();
    this.pending.clear();
    for (const m of this.mixers) m.stopAllAction();
  }
}
