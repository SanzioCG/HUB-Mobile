// 3D ekrandagi reviziya va skaner banneri (kontrakt 6.3). Sof funksiya — Jest bilan tekshiriladi.
import type { ItemSizeMm } from '../api/types';
import { uz } from '../i18n/uz';
import type { ScanSelection } from './selection';

/** 3D ekranda ochiladigan reviziya: loyiha buyumi yoki skanerlangan etiketkadagi reviziya. */
export interface ViewTarget {
  itemId: string;
  name: string;
  sizeMm: ItemSizeMm | null;
  glbUrl: string;
  revisionId: string;
  revisionLabel: string;
  /** API'dan; skanerlangan reviziya uchun noma'lum — null. */
  approved: boolean | null;
  /** Kontrakt 4: iOS Quick Look uchun. null — USDZ yo'q yoki noma'lum (skaner). */
  usdzUrl: string | null;
  /** "…" paneli: loyiha yangilangan sana (ISO-8601) yoki null. */
  updatedAt: string | null;
}

/** Kontrakt 6.3: eski reviziya etiketkasi → sariq banner; `part_in_latest=false` — qo'shimcha qator. */
export function scanBanner(
  scan: ScanSelection | undefined,
  target: ViewTarget,
): { lines: string[]; action: string | null } | null {
  const r = scan?.result;
  if (!r || r.is_latest) return null;
  const latest = r.latest_revision_label ?? r.latest_revision_id ?? uz.common.dash;
  if (target.revisionId === r.revision_id) {
    const lines = [uz.select.oldRevision(r.revision_label, latest)];
    if (!r.part_in_latest) lines.push(uz.select.notInLatest);
    return { lines, action: r.latest_glb_url ? uz.select.openLatest(latest) : null };
  }
  // Joriy reviziya ochilgan: detal unda yo'q bo'lsa — eslatma qoladi.
  return r.part_in_latest ? null : { lines: [uz.select.notInLatest], action: null };
}
