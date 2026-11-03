// Kontrakt uhub-mobile/1.1, 4-bo'lim: mobil API tiplari.
// Kontraktda javobsiz joylar mock (mock/src/app.ts, data.ts) qiymatlari bilan olingan — BARCHA taxminlar shu faylda.
import { uz } from '../i18n/uz';

/** TODO(contract): `user` maydonlari kontraktda yo'q; mock: {id, name}. */
export interface User {
  id: number;
  name: string;
}

/** TODO(contract): `company` maydonlari kontraktda yo'q; mock: {id, name}. */
export interface Company {
  id: number;
  name: string;
}

export interface PairResponse {
  device_token: string;
  user: User;
  company: Company;
}

/** TODO(contract): `status` qiymatlari ro'yxati kontraktda yo'q; mock: production | design | done. */
export type ProjectStatus = 'production' | 'design' | 'done' | (string & {});

export interface ProjectSummary {
  id: number;
  number: number;
  name: string;
  status: ProjectStatus;
  items_count: number;
  /** ISO-8601. */
  updated_at: string;
  /** TODO(contract): null ruxsat etiladimi — kontraktda yo'q; mock null qaytaradi. */
  thumb_url: string | null;
}

/** TODO(contract): buyum `size_mm` formati kontraktda yo'q; mock: [eni, balandligi, chuqurligi]. */
export type ItemSizeMm = [number, number, number];

export interface ProjectItem {
  item_id: string;
  name: string;
  revision_id: string;
  size_mm: ItemSizeMm;
  glb_url: string;
  /** TODO(contract): USDZ V-1b da; null ruxsat etiladimi — kontraktda yo'q. */
  usdz_url: string | null;
  /** TODO(contract): null ruxsat etiladimi — kontraktda yo'q. */
  thumb_url: string | null;
  approved: boolean;
}

export interface ProjectDetail extends ProjectSummary {
  items: ProjectItem[];
}

export interface ResolveResponse {
  project_id: number;
  project_number: number;
  item_id: string;
  item_name: string;
  revision_id: string;
  part_uid: string;
  part_name: string;
  glb_url: string;
  is_latest: boolean;
  latest_revision_id: string | null;
  latest_glb_url: string | null;
}

/** TODO(contract): xato javobi tanasi kontraktda yo'q; mock: { error: "<kod>" }. */
export interface ErrorBody {
  error: string;
}

export function errorCodeOf(body: unknown): string | undefined {
  const e = (body as Partial<ErrorBody> | null)?.error;
  return typeof e === 'string' ? e : undefined;
}

// ---------- ko'rinish uchun taxminlar ----------

export type StatusFilter = 'all' | 'production' | 'unapproved';

/**
 * Segment filtr. TODO(contract): "Sexda" va "Tasdiqlanmagan" qaysi `status` qiymatlariga mos kelishi kontraktda yo'q;
 * loyiha ro'yxatida `approved` yo'q. Taxmin: Sexda = production, Tasdiqlanmagan = design.
 */
export function matchesStatusFilter(status: ProjectStatus, filter: StatusFilter): boolean {
  if (filter === 'production') return status === 'production';
  if (filter === 'unapproved') return status === 'design';
  return true;
}

export type StatusTone = 'yellow' | 'green' | 'muted';

/** TODO(contract): holat ranglari — taxmin: production sariq (jarayonda), done yashil, qolgani kulrang. */
export function statusTone(status: ProjectStatus): StatusTone {
  if (status === 'production') return 'yellow';
  if (status === 'done') return 'green';
  return 'muted';
}

/** TODO(contract): holat matni — mock qiymatlari uchun; noma'lum qiymat o'zi ko'rsatiladi. */
export function statusLabel(status: ProjectStatus): string {
  if (status === 'production') return uz.status.production;
  if (status === 'design') return uz.status.design;
  if (status === 'done') return uz.status.done;
  return uz.status.unknown(status);
}

/** TODO(contract): `revision_id` formati kontraktda yo'q; mock: "m0-r5" → "R5". Mos kelmasa — o'zi. */
export function revisionLabel(revisionId: string): string {
  const m = /r(\d+)$/i.exec(revisionId);
  return m ? `R${m[1]}` : revisionId;
}

export function formatSize(size: ItemSizeMm): string {
  return size.join(' × ');
}
