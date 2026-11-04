// `.uhub` yuklagichi (kontrakt 1.6, 10-bo'lim; ADR-020 D5). Ilova ham, brauzer viewer'i ham shuni ishlatadi.
// Sof JS (fflate — ZIP, @noble/hashes — SHA-256): DOM ham, Node ham shart emas (React Native'da ham ishlaydi).
//
// Xavfsizlik (10.3):
// - fayl ≤ 50 MB, ≤ 2 000 yozuv, ochilgandagi jami ≤ 200 MB, siqish nisbati chegarasi (ZIP-bomba);
// - `..`, absolyut yo'l, disk harfi yoki `\` li yozuv bo'lsa — butun fayl rad etiladi;
// - faqat `manifest.json` va `viewer/*` ochiladi, har biri manifestdagi SHA-256 bilan tekshiriladi;
// - `project.json` va `documents/` (mijoz ma'lumoti) **ochilmaydi**: avval faqat markaziy katalog o'qiladi
//   (hech narsa ochilmaydi), keyin filtr faqat ruxsat etilgan yozuvlarni ochadi.
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { strFromU8, unzipSync, type UnzipFileInfo } from 'fflate';

export const UHUB_LIMITS = {
  maxFileBytes: 50 * 1024 * 1024,
  maxEntries: 2000,
  maxTotalBytes: 200 * 1024 * 1024,
  /** Ochilgan/siqilgan nisbati — shu chegaradan katta va 1 MB dan katta yozuv ZIP-bomba deb rad etiladi. */
  maxRatio: 100,
  ratioMinBytes: 1024 * 1024,
} as const;

/** Qo'llanadigan formatlar (major). */
const MANIFEST_FORMAT = 'uhub';
const INDEX_FORMAT = 'uhub-viewer';
const SUPPORTED_MAJOR = 1;

export type UhubErrorCode =
  | 'too_large'
  | 'too_many_entries'
  | 'zip_bomb'
  | 'bad_path'
  | 'bad_zip'
  | 'no_viewer'
  | 'format_unknown'
  | 'sha_mismatch'
  | 'bad_manifest'
  | 'bad_index';

/** Kontrakt 10.3 matnlari (o'zbekcha); qolganlari — tushunarli rad xabarlari. */
export const UHUB_MESSAGES: Record<UhubErrorCode, string> = {
  too_large: 'Fayl juda katta (50 MB dan ortiq) — ochilmadi',
  too_many_entries: 'Fayl tuzilishi noto‘g‘ri (yozuvlar juda ko‘p) — ochilmadi',
  zip_bomb: 'Fayl shubhali (ochilgan hajmi juda katta) — ochilmadi',
  bad_path: 'Fayl ichida ruxsat etilmagan yo‘l bor — xavfsizlik uchun ochilmadi',
  bad_zip: 'Bu .uhub fayli emas yoki fayl buzilgan',
  no_viewer: 'Bu fayl ko‘rish uchun tayyorlanmagan — U-HUB’da qayta eksport qiling',
  format_unknown: 'Ilovani yangilang',
  sha_mismatch: 'Fayl buzilgan yoki o‘zgartirilgan (nazorat summasi mos emas) — ochilmadi',
  bad_manifest: 'Fayl buzilgan (manifest o‘qilmadi)',
  bad_index: 'Fayl buzilgan (buyumlar ro‘yxati o‘qilmadi)',
};

export class UhubError extends Error {
  constructor(
    readonly code: UhubErrorCode,
    readonly detail = '',
  ) {
    super(UHUB_MESSAGES[code]);
    this.name = 'UhubError';
  }
}

/**
 * `instanceof` o'rniga: Babel/Hermes'da `Error` vorisi bo'lgan klass `instanceof` da ishonchsiz bo'lishi mumkin.
 */
export function isUhubError(e: unknown): e is UhubError {
  return (
    e instanceof UhubError ||
    (typeof e === 'object' &&
      e !== null &&
      (e as { name?: unknown }).name === 'UhubError' &&
      typeof (e as { code?: unknown }).code === 'string' &&
      (e as { code: string }).code in UHUB_MESSAGES)
  );
}

export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];

export interface UhubPart {
  uid: string;
  number: string;
  name: string;
  kind: string;
}

export interface UhubItem {
  item_id: string;
  name: string;
  revision_id: string;
  revision_label: string;
  /** Eksport paytidagi holat (10.2). */
  approved: boolean;
  snapshot: string;
  size_mm: { width: number; height: number; depth: number } | null;
  transform: { translation: Vec3; rotation: Quat };
  glb: string;
  thumb: string | null;
  parts: UhubPart[];
  /** 1.6: eksport ogohlantirishlari; bo'lmasa — bo'sh. */
  warnings: string[];
}

export interface UhubIndex {
  format: string;
  contract: string;
  project_number: number;
  project_name: string;
  exported_at: string;
  items: UhubItem[];
}

export interface UhubFile {
  index: UhubIndex;
  /** Tekshirilgan `viewer/*` fayllari (yo'l → baytlar). */
  files: Map<string, Uint8Array>;
}

/** Yozuv yo'li xavfsizmi: `..`, absolyut, disk harfi, `\` — yo'q. */
export function isSafePath(name: string): boolean {
  if (!name || name.includes('\\') || name.startsWith('/') || /^[A-Za-z]:/.test(name)) return false;
  return !name.split('/').some((seg) => seg === '..');
}

/** Faqat shular ochiladi (10.3). */
export const isReadable = (name: string) => name === 'manifest.json' || name.startsWith('viewer/');

const major = (format: unknown, family: string): number | null => {
  if (typeof format !== 'string') return null;
  const m = new RegExp(`^${family}/(\\d+)$`).exec(format);
  return m ? Number(m[1]) : null;
};

const finite = (v: unknown, n: number) =>
  Array.isArray(v) && v.length === n && v.every((x) => typeof x === 'number' && Number.isFinite(x));

function parseJson(bytes: Uint8Array, code: UhubErrorCode): unknown {
  try {
    return JSON.parse(strFromU8(bytes));
  } catch {
    throw new UhubError(code);
  }
}

/** Katalogni tekshiradi (hech narsa ochilmaydi): chegara, yo'llar, ZIP-bomba. */
function scan(data: Uint8Array): UnzipFileInfo[] {
  if (data.byteLength > UHUB_LIMITS.maxFileBytes) throw new UhubError('too_large');
  const entries: UnzipFileInfo[] = [];
  try {
    unzipSync(data, {
      filter: (f) => {
        entries.push(f);
        return false;
      },
    });
  } catch (e) {
    throw new UhubError('bad_zip', String(e));
  }
  if (entries.length === 0) throw new UhubError('bad_zip');
  if (entries.length > UHUB_LIMITS.maxEntries) throw new UhubError('too_many_entries');
  const bad = entries.find((f) => !isSafePath(f.name));
  if (bad) throw new UhubError('bad_path', bad.name);
  let total = 0;
  for (const f of entries) {
    total += f.originalSize;
    if (f.originalSize > UHUB_LIMITS.ratioMinBytes && f.originalSize > f.size * UHUB_LIMITS.maxRatio)
      throw new UhubError('zip_bomb', f.name);
  }
  if (total > UHUB_LIMITS.maxTotalBytes) throw new UhubError('zip_bomb');
  return entries;
}

function parseItem(raw: unknown, files: Map<string, Uint8Array>): UhubItem {
  const r = (raw ?? {}) as Record<string, unknown>;
  const str = (k: string) => {
    if (typeof r[k] !== 'string') throw new UhubError('bad_index', k);
    return r[k];
  };
  const glb = str('glb');
  if (!glb.startsWith('viewer/') || !files.has(glb)) throw new UhubError('bad_index', `glb: ${glb}`);
  const t = (r.transform ?? {}) as Record<string, unknown>;
  const size = r.size_mm as UhubItem['size_mm'];
  return {
    item_id: str('item_id'),
    name: str('name'),
    revision_id: str('revision_id'),
    revision_label: str('revision_label'),
    approved: r.approved === true,
    snapshot: str('snapshot'),
    size_mm: size && typeof size === 'object' ? size : null,
    transform: {
      translation: finite(t.translation, 3) ? (t.translation as Vec3) : [0, 0, 0],
      rotation: finite(t.rotation, 4) ? (t.rotation as Quat) : [0, 0, 0, 1],
    },
    glb,
    thumb: typeof r.thumb === 'string' ? r.thumb : null,
    parts: Array.isArray(r.parts)
      ? (r.parts as Record<string, unknown>[])
          .filter((p) => typeof p?.uid === 'string')
          .map((p) => ({
            uid: String(p.uid),
            number: String(p.number ?? ''),
            name: String(p.name ?? ''),
            kind: String(p.kind ?? ''),
          }))
      : [],
    warnings: Array.isArray(r.warnings) ? r.warnings.filter((w): w is string => typeof w === 'string') : [],
  };
}

/**
 * `.uhub` ni ochadi va tekshiradi. Xato — `UhubError` (`code`, o'zbekcha `message`); ilova yiqilmaydi.
 * Noma'lum qo'shimcha maydonlar e'tiborsiz (10.2).
 */
export function openUhub(data: Uint8Array): UhubFile {
  const entries = scan(data);
  const names = new Set(entries.map((e) => e.name));
  if (!names.has('manifest.json')) throw new UhubError('bad_manifest');
  if (!names.has('viewer/index.json')) throw new UhubError('no_viewer');

  let opened: Record<string, Uint8Array>;
  try {
    opened = unzipSync(data, { filter: (f) => isReadable(f.name) });
  } catch (e) {
    throw new UhubError('bad_zip', String(e));
  }

  const manifest = parseJson(opened['manifest.json']!, 'bad_manifest') as {
    format?: unknown;
    files?: unknown;
  };
  const mMajor = major(manifest.format, MANIFEST_FORMAT);
  if (mMajor === null) throw new UhubError('bad_manifest', 'format');
  if (mMajor !== SUPPORTED_MAJOR) throw new UhubError('format_unknown', String(manifest.format));
  const sums = manifest.files;
  if (!sums || typeof sums !== 'object') throw new UhubError('bad_manifest', 'files');

  const files = new Map<string, Uint8Array>();
  for (const [name, bytes] of Object.entries(opened)) {
    if (name === 'manifest.json' || name.endsWith('/')) continue;
    const want = (sums as Record<string, unknown>)[name];
    if (typeof want !== 'string' || bytesToHex(sha256(bytes)) !== want.toLowerCase())
      throw new UhubError('sha_mismatch', name);
    files.set(name, bytes);
  }

  const raw = parseJson(files.get('viewer/index.json')!, 'bad_index') as Record<string, unknown>;
  const iMajor = major(raw.format, INDEX_FORMAT);
  if (iMajor === null) throw new UhubError('bad_index', 'format');
  if (iMajor !== SUPPORTED_MAJOR) throw new UhubError('format_unknown', String(raw.format));
  if (!Array.isArray(raw.items) || typeof raw.project_number !== 'number') throw new UhubError('bad_index');
  const index: UhubIndex = {
    format: String(raw.format),
    contract: typeof raw.contract === 'string' ? raw.contract : '',
    project_number: raw.project_number,
    project_name: typeof raw.project_name === 'string' ? raw.project_name : '',
    exported_at: typeof raw.exported_at === 'string' ? raw.exported_at : '',
    items: raw.items.map((it) => parseItem(it, files)),
  };
  return { index, files };
}

/**
 * Telefondagi nusxa kaliti (10.3): bir xil `project_number` + `revision_id` lar qayta ochilsa — o'sha kalit
 * (yangi nusxa emas, almashtiriladi).
 */
export function uhubFileId(index: Pick<UhubIndex, 'project_number' | 'items'>): string {
  const revs = index.items
    .map((i) => i.revision_id)
    .sort()
    .join('|');
  return `p${index.project_number}-${bytesToHex(sha256(new TextEncoder().encode(revs))).slice(0, 12)}`;
}

/** `<item_key>` — `glb` yo'lidan (`viewer/<item_key>.glb`). */
export const itemKey = (item: Pick<UhubItem, 'glb'>) =>
  item.glb.replace(/^viewer\//, '').replace(/\.glb$/, '');

// ---------- QR → detal, fayldan (10.4) ----------

export type FileQrResult =
  | { kind: 'no_file' }
  | { kind: 'match'; item: UhubItem; uid: string }
  | { kind: 'other_snapshot'; item: UhubItem; uid: string }
  | { kind: 'no_part' };

/** Kontrakt 10.4 matnlari. */
export const FILE_QR_TEXT = {
  noFile: 'Bu loyiha telefonda yo‘q — faylini oching',
  otherSnapshot: (label: string) => `Etiketka boshqa reviziyadan. Fayldagi: ${label}`,
  noPart: 'Bu detal fayldagi reviziyada yo‘q',
} as const;

/**
 * `uhub:p/<project_number>/<part_uid>/<snapshot>` → fayl(lar)dan. `indexes` — telefondagi ochilgan fayllar.
 * QR tuzilishini tekshirish chaqiruvchida (`parseQr`).
 */
export function resolveFromFiles(
  qr: { projectNumber: number; partUid: string; snapshot: string },
  indexes: readonly Pick<UhubIndex, 'project_number' | 'items'>[],
): FileQrResult {
  const own = indexes.filter((x) => x.project_number === qr.projectNumber);
  if (!own.length) return { kind: 'no_file' };
  const items = own.flatMap((x) => x.items);
  const has = (it: UhubItem) => it.parts.some((p) => p.uid === qr.partUid);
  const exact = items.find((it) => it.snapshot === qr.snapshot && has(it));
  if (exact) return { kind: 'match', item: exact, uid: qr.partUid };
  const other = items.find(has);
  if (other) return { kind: 'other_snapshot', item: other, uid: qr.partUid };
  return { kind: 'no_part' };
}
