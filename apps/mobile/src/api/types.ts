// Kontrakt uhub-mobile/1.3 (docs/contract/uhub-mobile-1.3.md), 4-bo'lim: mobil API tiplari.
// Kontraktda javobsiz qolgan joylar — TODO(contract). BARCHA taxminlar shu faylda.
import { uz } from '../i18n/uz';

/** Kontrakt 4: `role` ∈ designer | manager | shop | admin. Email/telefon yo'q. */
export type UserRole = 'designer' | 'manager' | 'shop' | 'admin';

/**
 * Kontrakt 4: identifikatorlar — shaffof satrlar (U-HUB: UUID). Mock va avval saqlangan ma'lumotda son bo'lishi
 * mumkin — faqat tenglik bo'yicha solishtiriladi, son sifatida o'qilmaydi.
 */
export type Id = string | number;

export interface User {
  id: Id;
  name: string;
  role: UserRole;
}

export interface Company {
  id: Id;
  name: string;
}

export interface PairResponse {
  device_token: string;
  user: User;
  company: Company;
}

/** Kontrakt 4: `status` ∈ draft | validated | approved; noma'lum qiymat — `draft` deb ko'rsatiladi. */
export type ProjectStatus = 'draft' | 'validated' | 'approved';

export function normalizeStatus(s: unknown): ProjectStatus {
  return s === 'validated' || s === 'approved' ? s : 'draft';
}

export interface ProjectSummary {
  id: Id;
  number: number;
  name: string;
  status: ProjectStatus;
  items_count: number;
  /** ISO-8601. */
  updated_at: string;
  thumb_url: string | null;
}

/** Kontrakt 4: obyekt {width, height, depth}, mm (o'nlik bo'lishi mumkin). */
export interface ItemSizeMm {
  width: number;
  height: number;
  depth: number;
}

/** Kontrakt 4: `export_status` ∈ ready | pending | failed. */
export type ExportStatus = 'ready' | 'pending' | 'failed';

export interface ProjectItem {
  item_id: string;
  name: string;
  revision_id: string;
  revision_label: string;
  approved: boolean;
  size_mm: ItemSizeMm;
  export_status: ExportStatus;
  /** Faqat `export_status` ≠ ready bo'lsa null. */
  glb_url: string | null;
  /** V-1b gacha doim null. */
  usdz_url: string | null;
  thumb_url: string | null;
}

export interface ProjectDetail {
  id: Id;
  number: number;
  name: string;
  status: ProjectStatus;
  updated_at: string;
  items: ProjectItem[];
}

export interface ResolveResponse {
  project_id: Id;
  project_number: number;
  item_id: string;
  item_name: string;
  revision_id: string;
  revision_label: string;
  approved: boolean;
  part_uid: string;
  part_name: string;
  glb_url: string;
  /** Kontrakt 1.4: V-1b gacha null. */
  usdz_url: string | null;
  is_latest: boolean;
  /** false — detal oxirgi reviziyada o'chirilgan. */
  part_in_latest: boolean;
  /** Doim to'ldiriladi; is_latest=true bo'lsa revision_* bilan bir xil. */
  latest_revision_id: string;
  latest_revision_label: string;
  latest_glb_url: string;
}

/** Kontrakt 1.4 (4): `POST /mobile/ar-link {item_id, revision_id}` — hammasi imzolangan, 10 daqiqa. */
export interface ArLinkResponse {
  /** AR sahifasi (3-bo'lim) — ilova uni tizim brauzerida ochadi. */
  launch_url: string;
  /** AR varianti (animatsiyasiz). */
  glb_url: string;
  /** V-1b gacha null. */
  usdz_url: string | null;
  /** ISO-8601. */
  expires_at: string;
}

/** Kontrakt 4: xato tanasi har doim `{ error, message }`; mantiq faqat `error` ga, matn `message` dan. */
export interface ErrorBody {
  error: string;
  message: string;
}

/** Kontrakt 4: `error` kodlari (ilova mantig'i shularga tayanadi). */
export const ERROR = {
  badQr: 'bad_qr',
  badRequest: 'bad_request',
  tokenInvalid: 'token_invalid',
  tokenRevoked: 'token_revoked',
  notFound: 'not_found',
  pairCodeInvalid: 'pair_code_invalid',
  pairCodeExpired: 'pair_code_expired',
  rateLimited: 'rate_limited',
  serverError: 'server_error',
} as const;

/** Xato tanasini o'qish; maydon yo'q yoki satr bo'lmasa — undefined. */
export function parseErrorBody(body: unknown): { code?: string; message?: string } {
  const b = (body ?? {}) as Partial<Record<keyof ErrorBody, unknown>>;
  return {
    code: typeof b.error === 'string' ? b.error : undefined,
    message: typeof b.message === 'string' ? b.message : undefined,
  };
}

// ---------- ko'rinish ----------

/** M-A4: Hammasi / Tasdiqlangan (`approved`) / Tasdiqlanmagan (`draft` + `validated`). */
export type StatusFilter = 'all' | 'approved' | 'unapproved';

export function matchesStatusFilter(status: ProjectStatus, filter: StatusFilter): boolean {
  if (filter === 'approved') return status === 'approved';
  if (filter === 'unapproved') return status !== 'approved';
  return true;
}

export type StatusTone = 'yellow' | 'green' | 'muted';

/** `approved` — yashil; `validated` va `draft` — sariq (ikkalasi ham tasdiqlanmagan). */
export function statusTone(status: ProjectStatus): StatusTone {
  return status === 'approved' ? 'green' : 'yellow';
}

export function statusLabel(status: ProjectStatus): string {
  if (status === 'approved') return uz.status.approved;
  if (status === 'validated') return uz.status.validated;
  return uz.status.draft;
}

/** Kenglik × balandlik × chuqurlik (o'nlik bo'lishi mumkin — ortiqcha nollarsiz). */
export function formatSize(size: ItemSizeMm): string {
  const n = (v: number) => String(Math.round(v * 10) / 10);
  return `${n(size.width)} × ${n(size.height)} × ${n(size.depth)}`;
}

/** Kontrakt 4: `role` matni. */
export function roleLabel(role: UserRole): string {
  return uz.roles[role] ?? role;
}
