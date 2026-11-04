// Host (React Native WebView yoki brauzer oynasi) bilan tiplangan xabarlar.
// Xabar shakli: { type, ...maydonlar }. Transport: JSON satr yoki obyekt.

/** Kontrakt 2.1: `part__<uid>` tugunidagi extras.uhub. */
export interface PartExtras {
  kind: string;
  uid: string;
  number: string;
  name: string;
  material: string;
  size_mm: number[];
  edges: Record<string, string>;
  article: string | null;
  reveal: string[];
  qr: string;
}

export interface DimensionLine {
  label: string;
  from: [number, number, number];
  to: [number, number, number];
}

export interface LoadedItem {
  /** `item__<item_id>` tugun nomi. */
  node: string;
  /** Kontrakt 2.4 `asset.extras.uhub` (approved, revision_id, …). */
  meta: Record<string, unknown> | null;
  /** Kontrakt 2.3. */
  dimensions: { overall_mm?: Record<string, number>; lines?: DimensionLine[] } | null;
  /** Ochiladigan kliplar (`door__*`, `drawer__*`) — host tugmalari uchun. */
  clips: string[];
}

export type ViewMode = 'solid' | 'edges' | 'xray';
export type ViewName = 'front' | 'side' | 'top' | 'iso';
export type GroupName = 'carcass' | 'fronts' | 'hardware';

/** Kontrakt 2.1: `pivot__door__<id>` dagi eshik ma'lumoti. */
export interface DoorInfo {
  hinge_side: string;
  open_angle_deg: number;
  leaf: number;
  leaves: number;
}

/** Kontrakt 2.5: detal plitasi materialining `extras.uhub`. */
export interface MaterialInfo {
  id: string;
  code: string;
  supplier: string;
  name: string;
  kind: string;
  thickness_mm: number | null;
}

export type HostMessage =
  | { type: 'load'; glbUrl: string; token: string }
  | { type: 'select'; uid: string }
  | { type: 'showAll' }
  | { type: 'openAll' }
  | { type: 'closeAll' }
  | { type: 'toggle'; clip: string }
  | { type: 'setMode'; mode: ViewMode }
  | { type: 'setDims'; on: boolean }
  | { type: 'resetView' }
  /** Tanlovni bekor qilish (karta yopildi); kliplar holati o'zgarmaydi. */
  | { type: 'deselect' }
  /** O'ng panel: kamera ko'rinishi. */
  | { type: 'setView'; view: ViewName }
  /** O'ng panel: qatlam (`group__<group>`) ko'rinishi. */
  | { type: 'setGroupVisible'; group: GroupName; on: boolean }
  /** O'ng panel: modelni ekranga sig'dirish. */
  | { type: 'fit' }
  /** Ochilish zonalari (M-A5): eshik yoyi va tortma yurishi — yoqish/o'chirish. Standart — o'chiq. */
  | { type: 'setHelpers'; on: boolean };

export type ErrorCode =
  'bad_message' | 'not_loaded' | 'load_failed' | 'part_not_found' | 'clip_not_found' | 'contract_mismatch';

export type ViewerMessage =
  | { type: 'ready' }
  /** GLB yuklanishi (baytlar); `total` — server hajmni bermasa null. */
  | { type: 'progress'; loaded: number; total: number | null }
  | { type: 'loaded'; item: LoadedItem; parts: PartExtras[] }
  /** `clip` — detal joylashgan eshik/tortma klipi (`pivot__door__<id>` → `door__<id>__open`), bo'lmasa null. */
  | {
      type: 'selected';
      uid: string;
      extras: PartExtras;
      clip: string | null;
      /** Eshik detali bo'lsa — pivot tugunidagi ma'lumot (2.1). */
      door: DoorInfo | null;
      /** Plita materiali `extras.uhub` (2.5). */
      material: MaterialInfo | null;
    }
  /** Bo'sh joyga bosildi — tanlov bekor. */
  | { type: 'deselected' }
  | { type: 'error'; code: ErrorCode; message: string }
  /** Dev: ishlash ko'rsatkichlari (renderer.info asosida), har ~2 s. */
  | { type: 'stats'; load_ms: number; fps: number; triangles: number; textures_mb: number };

export type ParseResult = { ok: true; msg: HostMessage } | { ok: false; error: string };

const MODES: readonly ViewMode[] = ['solid', 'edges', 'xray'];
const VIEWS: readonly ViewName[] = ['front', 'side', 'top', 'iso'];
const GROUPS: readonly GroupName[] = ['carcass', 'fronts', 'hardware'];
const isStr = (v: unknown): v is string => typeof v === 'string';
const nonEmpty = (v: unknown): v is string => isStr(v) && v.length > 0;

/** Kiruvchi xabarni tekshiradi; noma'lum yoki noto'g'ri maydonli xabar — `ok: false`. */
export function parseIncoming(raw: unknown): ParseResult {
  let data = raw;
  if (isStr(raw)) {
    try {
      data = JSON.parse(raw);
    } catch {
      return { ok: false, error: 'JSON emas' };
    }
  }
  if (typeof data !== 'object' || data === null) return { ok: false, error: 'obyekt emas' };
  const m = data as Record<string, unknown>;
  const bad = (field: string) => ({ ok: false as const, error: `${String(m.type)}: "${field}" noto'g'ri` });
  switch (m.type) {
    case 'load':
      if (!nonEmpty(m.glbUrl)) return bad('glbUrl');
      if (!isStr(m.token)) return bad('token');
      return { ok: true, msg: { type: 'load', glbUrl: m.glbUrl, token: m.token } };
    case 'select':
      if (!nonEmpty(m.uid)) return bad('uid');
      return { ok: true, msg: { type: 'select', uid: m.uid } };
    case 'toggle':
      if (!nonEmpty(m.clip)) return bad('clip');
      return { ok: true, msg: { type: 'toggle', clip: m.clip } };
    case 'setMode':
      if (!MODES.includes(m.mode as ViewMode)) return bad('mode');
      return { ok: true, msg: { type: 'setMode', mode: m.mode as ViewMode } };
    case 'setDims':
      if (typeof m.on !== 'boolean') return bad('on');
      return { ok: true, msg: { type: 'setDims', on: m.on } };
    case 'setView':
      if (!VIEWS.includes(m.view as ViewName)) return bad('view');
      return { ok: true, msg: { type: 'setView', view: m.view as ViewName } };
    case 'setGroupVisible':
      if (!GROUPS.includes(m.group as GroupName)) return bad('group');
      if (typeof m.on !== 'boolean') return bad('on');
      return { ok: true, msg: { type: 'setGroupVisible', group: m.group as GroupName, on: m.on } };
    case 'fit':
      return { ok: true, msg: { type: 'fit' } };
    case 'setHelpers':
      if (typeof m.on !== 'boolean') return bad('on');
      return { ok: true, msg: { type: 'setHelpers', on: m.on } };
    case 'showAll':
    case 'openAll':
    case 'closeAll':
    case 'resetView':
    case 'deselect':
      return { ok: true, msg: { type: m.type } };
    default:
      return { ok: false, error: `noma'lum type: ${String(m.type)}` };
  }
}

/** Bizga tegishli bo'lishi mumkin bo'lgan xabar (boshqa skriptlarning postMessage'iga javob bermaslik uchun). */
function looksLikeOurs(raw: unknown): boolean {
  if (isStr(raw)) return raw.trimStart().startsWith('{') && raw.includes('"type"');
  return typeof raw === 'object' && raw !== null && isStr((raw as { type?: unknown }).type);
}

interface RNWindow extends Window {
  ReactNativeWebView?: { postMessage(data: string): void };
}

export interface Bridge {
  post(msg: ViewerMessage): void;
  /** Chiquvchi xabarlarni sahifa ichida kuzatish (dev panel). */
  onOutgoing(fn: (msg: ViewerMessage) => void): void;
}

export function createBridge(handle: (msg: HostMessage) => void): Bridge {
  const w = window as RNWindow;
  const listeners: ((msg: ViewerMessage) => void)[] = [];

  const post = (msg: ViewerMessage) => {
    if (w.ReactNativeWebView) w.ReactNativeWebView.postMessage(JSON.stringify(msg));
    else if (w.parent !== w) w.parent.postMessage(msg, '*');
    for (const fn of listeners) fn(msg);
  };

  const receive = (ev: Event) => {
    const raw = (ev as MessageEvent).data;
    const res = parseIncoming(raw);
    if (res.ok) handle(res.msg);
    else if (looksLikeOurs(raw)) post({ type: 'error', code: 'bad_message', message: res.error });
  };
  // iOS WebView: window; Android WebView: document.
  window.addEventListener('message', receive);
  document.addEventListener('message', receive);

  return { post, onOutgoing: (fn) => listeners.push(fn) };
}

/** Sahifa host ichida emas (dev rejim yoki oddiy brauzer). */
export function isStandalone(): boolean {
  const w = window as RNWindow;
  return !w.ReactNativeWebView && w.parent === w;
}
