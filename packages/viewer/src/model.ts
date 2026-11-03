// GLB sahna daraxti bo'yicha sof funksiyalar. Hamma narsa nom va extras orqali topiladi — indeks yo'q.
import type { AnimationClip, Object3D } from 'three';
import type { PartExtras } from './bridge.js';

export const PART_PREFIX = 'part__';
export const ITEM_PREFIX = 'item__';
/** Kontrakt 2.2: alohida ochiladigan kliplar. `all__open` ataylab kirmaydi (individual kliplar bilan to'qnashadi). */
const OPENABLE_RE = /^(door|drawer)__.+__open$/;

export const isOpenableClip = (name: string) => OPENABLE_RE.test(name);

export function findClip(clips: readonly AnimationClip[], name: string): AnimationClip | undefined {
  return clips.find((c) => c.name === name);
}

export function openableClipNames(clips: readonly AnimationClip[]): string[] {
  return clips.map((c) => c.name).filter(isOpenableClip);
}

export function partExtras(obj: Object3D): PartExtras | undefined {
  const x = (obj.userData as { uhub?: PartExtras }).uhub;
  return x && typeof x.uid === 'string' ? x : undefined;
}

/** Bosilgan obyektdan yuqoriga: eng yaqin `part__` tugun (extras.uhub bilan). */
export function findPartAncestor(obj: Object3D | null): Object3D | null {
  for (let o = obj; o; o = o.parent) {
    if (o.name.startsWith(PART_PREFIX) && partExtras(o)) return o;
  }
  return null;
}

/**
 * uid → tugun. uid `extras.uhub.uid` dan olinadi, tugun nomidan emas
 * (kontrakt 2.1: ruxsat etilmagan belgili uid nomda kodlangan bo'lishi mumkin).
 */
export function indexParts(root: Object3D): Map<string, Object3D> {
  const map = new Map<string, Object3D>();
  root.traverse((o) => {
    const x = o.name.startsWith(PART_PREFIX) ? partExtras(o) : undefined;
    if (x && !map.has(x.uid)) map.set(x.uid, o);
  });
  return map;
}

export function findItemNode(root: Object3D): Object3D | undefined {
  let found: Object3D | undefined;
  root.traverse((o) => {
    if (!found && o.name.startsWith(ITEM_PREFIX)) found = o;
  });
  return found;
}

/**
 * Detal joylashgan eshik/tortmaning klipi — kontrakt 2.1/2.2 nomlash qolipi bo'yicha:
 * `pivot__door__<id>` → `door__<id>__open`, `slide__drawer__<id>` → `drawer__<id>__open`.
 */
export function ownClipName(obj: Object3D | null): string | null {
  for (let o = obj; o; o = o.parent) {
    const m = /^(?:pivot__(door)|slide__(drawer))__(.+)$/.exec(o.name);
    if (m) return `${m[1] ?? m[2]}__${m[3]}__open`;
  }
  return null;
}

/** `reveal` kliplari ro'yxat tartibida (takrorlar olib tashlanadi); GLB'da yo'qlari alohida. */
export function revealPlan(extras: PartExtras, available: ReadonlySet<string>) {
  const clips: string[] = [];
  const missing: string[] = [];
  for (const name of extras.reveal ?? []) {
    if (clips.includes(name) || missing.includes(name)) continue;
    (available.has(name) ? clips : missing).push(name);
  }
  return { clips, missing };
}
