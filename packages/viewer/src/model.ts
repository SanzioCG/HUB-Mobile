// GLB sahna daraxti bo'yicha sof funksiyalar. Detallar `extras.uhub.uid` bo'yicha, kliplar nomi bo'yicha — indeks yo'q.
import type { AnimationClip, Object3D } from 'three';
import type { DoorInfo, MaterialInfo, PartExtras } from './bridge.js';

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

/**
 * Bosilgan obyektdan yuqoriga: `extras.uhub.uid` bor eng yaqin tugun.
 * Kontrakt 1.2 (2.1): tugun nomiga tayanilmaydi. TODO(contract-1.2): qoralamadan.
 */
export function findPartAncestor(obj: Object3D | null): Object3D | null {
  for (let o = obj; o; o = o.parent) {
    if (partExtras(o)) return o;
  }
  return null;
}

/**
 * uid → tugun, faqat `extras.uhub.uid` bo'yicha (kontrakt 1.2, 2.1: tugun nomi `part__x<base32>` bo'lishi mumkin,
 * unga tayanilmaydi). TODO(contract-1.2): qoralamadan.
 */
export function indexParts(root: Object3D): Map<string, Object3D> {
  const map = new Map<string, Object3D>();
  root.traverse((o) => {
    const x = partExtras(o);
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
 * `pivot__door__<id>` → `door__<id>__open`, `slide__drawer__<id>` (va uning `__mid` i) → `drawer__<id>__open`.
 */
export function ownClipName(obj: Object3D | null): string | null {
  for (let o = obj; o; o = o.parent) {
    const m = /^(?:pivot__(door)|slide__(drawer))__(.+?)(?:__mid)?$/.exec(o.name);
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

/** Detal ustidagi eng yaqin eshik pivot'ining ma'lumoti (eshik detalining o'zida emas, pivot tugunida). */
export function doorInfo(obj: Object3D | null): DoorInfo | null {
  for (let o = obj; o; o = o.parent) {
    const d = (o.userData as { uhub?: { door?: DoorInfo } }).uhub?.door;
    if (d) return d;
  }
  return null;
}

/** Detal plitasining materiali — birinchi primitive (yuzalar), kontrakt 2.5. */
export function partMaterialInfo(part: Object3D): MaterialInfo | null {
  let found: MaterialInfo | null = null;
  part.traverse((o) => {
    if (found || !(o as { isMesh?: boolean }).isMesh) return;
    const m = (
      o as unknown as {
        material: { userData?: { uhub?: MaterialInfo } } | { userData?: { uhub?: MaterialInfo } }[];
      }
    ).material;
    const first = Array.isArray(m) ? m[0] : m;
    found = first?.userData?.uhub ?? null;
  });
  return found;
}

/** Kontrakt 8: `<script id="uhub-config" type="application/json">` mazmuni. */
export interface UhubConfig {
  glb_url: string;
  usdz_url?: string | null;
  title?: string;
  mode: 'share';
}

/** `uhub-config` matnini tekshiradi; yo'q yoki noto'g'ri bo'lsa null (viewer postMessage rejimida qoladi). */
export function parseUhubConfig(text: string | null | undefined): UhubConfig | null {
  if (!text) return null;
  try {
    const c = JSON.parse(text) as Partial<UhubConfig>;
    if (typeof c.glb_url !== 'string' || !c.glb_url) return null;
    return { glb_url: c.glb_url, usdz_url: c.usdz_url ?? null, title: c.title ?? '', mode: 'share' };
  } catch {
    return null;
  }
}
