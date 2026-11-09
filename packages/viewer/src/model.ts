// GLB sahna daraxti bo'yicha sof funksiyalar. Detallar `extras.uhub.uid` bo'yicha, kliplar nomi bo'yicha — indeks yo'q.
import type { AnimationClip, Object3D } from 'three';
import type { DoorInfo, MaterialInfo, PartExtras } from './bridge.js';
import { qualify } from './project.js';
import type { RevealPart } from './sequence.js';

export const ITEM_PREFIX = 'item__';
/**
 * Kontrakt 2.2: alohida ochiladigan kliplar — eshik, tortma, 1.10 dan pantograf (`lift__<id>__open`).
 * `all__open` ataylab kirmaydi (individual kliplar bilan to'qnashadi).
 */
const OPENABLE_RE = /^(door|drawer|lift)__.+__open$/;

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
 * Detal joylashgan eshik/tortma/pantografning klipi — kontrakt 2.1/2.2 nomlash qolipi bo'yicha:
 * `pivot__door__<id>` → `door__<id>__open`, `slide__drawer__<id>` (va uning `__mid` i) → `drawer__<id>__open`,
 * `pivot__lift__<id>` (va ichidagi `hang__lift__…`) → `lift__<id>__open` (1.10).
 */
export function ownClipName(obj: Object3D | null): string | null {
  for (let o = obj; o; o = o.parent) {
    const m = /^(?:pivot__(door|lift)|slide__(drawer))__(.+?)(?:__mid)?$/.exec(o.name);
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

/**
 * Detal ustidagi eng yaqin eshik pivot'ining ma'lumoti (eshik detalining o'zida emas, pivot tugunida).
 * 1.9: ramkali eshik bo'laklarida (`frame`/`glass`) `extras.uhub.door` — tabaqa uid'i (satr), u o'tkazib yuboriladi.
 */
export function doorInfo(obj: Object3D | null): DoorInfo | null {
  for (let o = obj; o; o = o.parent) {
    const d = (o.userData as { uhub?: { door?: unknown } }).uhub?.door;
    if (d && typeof d === 'object' && typeof (d as DoorInfo).hinge_side === 'string') return d as DoorInfo;
  }
  return null;
}

/** Kontrakt 1.10 (2.2): `pivot__lift__<id>` tugunidagi `extras.uhub.lift`. */
export interface LiftInfo {
  angle_deg: number;
  axis: string;
  /** Pantografdan oldin ochiladigan eshik kliplari, tartib bilan. */
  reveal: string[];
}

/**
 * Har pantograf: klipi (`lift__<id>__open`) va `reveal` i — `pivot__lift__<id>` tugunidan (1.10, 2.1/2.2).
 * Klip GLB'da yo'qligini chaqiruvchi tekshiradi.
 */
export function liftNodes(root: Object3D): { clip: string; lift: LiftInfo }[] {
  const out: { clip: string; lift: LiftInfo }[] = [];
  root.traverse((o) => {
    const m = /^pivot__lift__(.+)$/.exec(o.name);
    if (!m) return;
    const x = (o.userData as { uhub?: { lift?: Partial<LiftInfo> } }).uhub?.lift;
    const reveal = Array.isArray(x?.reveal) ? x.reveal.filter((c): c is string => typeof c === 'string') : [];
    out.push({
      clip: `lift__${m[1]}__open`,
      lift: { angle_deg: Number(x?.angle_deg ?? 0), axis: String(x?.axis ?? 'x'), reveal },
    });
  });
  return out;
}

/**
 * `RevealIndex` uchun yozuvlar (kontrakt 1.6 / 1.10, 2.2): har pantograf tuguni (`kind: 'lift'`, `reveal` — undan
 * oldingi eshiklar va o'zi) va har detal (o'z klipi, `reveal`). Loyiha rejimida nomlar buyum kaliti bilan (`qualify`).
 * `has` — klip GLB'da (ijrochida) bormi.
 */
export function revealParts(
  items: readonly { key: string; root: Object3D }[],
  has: (clip: string) => boolean,
): RevealPart[] {
  const out: RevealPart[] = [];
  for (const it of items) {
    for (const { clip, lift } of liftNodes(it.root))
      out.push({
        clip: has(qualify(it.key, clip)) ? qualify(it.key, clip) : null,
        kind: 'lift',
        reveal: [...lift.reveal, clip].map((c) => qualify(it.key, c)),
      });
    for (const node of indexParts(it.root).values()) {
      const x = partExtras(node)!;
      const own = ownClipName(node);
      const q = own ? qualify(it.key, own) : null;
      out.push({
        clip: q && has(q) ? q : null,
        kind: x.kind,
        reveal: (x.reveal ?? []).map((c) => qualify(it.key, c)),
      });
    }
  }
  return out;
}

/**
 * Bukilgan yon devorning yoyi (`part__<uid>_bend<n>`, `extras.uhub.bend_of` = tekis detal uid'i): tanlov tekis
 * detalga o'tadi. Yoy bo'lmasa yoki tekis detal topilmasa — o'zi.
 */
export function selectionTarget(node: Object3D, parts: ReadonlyMap<string, Object3D>): Object3D {
  const of = (node.userData as { uhub?: { bend_of?: unknown } }).uhub?.bend_of;
  return (typeof of === 'string' && parts.get(of)) || node;
}

/** Tekis detalning yoylari (`bend_of` = uid) — tanlovda u bilan birga ajratiladi. */
export function bendsOf(uid: string, parts: ReadonlyMap<string, Object3D>): Object3D[] {
  return [...parts.values()].filter(
    (o) => (o.userData as { uhub?: { bend_of?: unknown } }).uhub?.bend_of === uid,
  );
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

/**
 * Kontrakt 8: `<script id="uhub-config" type="application/json">` mazmuni. `mode: "ar"` — AR sahifasi (M-A5,
 * backend `/ar/<token>`; TODO(contract): 1.4 taklifi 6-bo'lim).
 */
export interface UhubConfig {
  glb_url: string;
  usdz_url?: string | null;
  title?: string;
  mode: 'share' | 'ar';
}

/** `uhub-config` matnini tekshiradi; yo'q yoki noto'g'ri bo'lsa null (viewer postMessage rejimida qoladi). */
export function parseUhubConfig(text: string | null | undefined): UhubConfig | null {
  if (!text) return null;
  try {
    const c = JSON.parse(text) as Partial<UhubConfig>;
    if (typeof c.glb_url !== 'string' || !c.glb_url) return null;
    const mode = c.mode === 'ar' ? 'ar' : 'share';
    return { glb_url: c.glb_url, usdz_url: c.usdz_url ?? null, title: c.title ?? '', mode };
  } catch {
    return null;
  }
}
