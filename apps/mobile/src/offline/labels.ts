// Oflayn etiketka qidiruvi (batch M-A2, 3): QR matnidagi `<project_number>/<part_uid>/<snapshot>` bo'yicha
// keshlangan resolve natijalari va ochilgan modellardagi etiketkalar (extras.uhub.qr) ichidan.
import type { ProjectDetail, ResolveResponse } from '../api/types';
import { parseQr, qrKey } from '../scan/qr';

/** Ochilgan modeldagi bitta detal etiketkasi — resolve'ning reviziyaga bog'liq qismi. */
export type LabelRecord = Pick<
  ResolveResponse,
  | 'project_id'
  | 'project_number'
  | 'item_id'
  | 'item_name'
  | 'revision_id'
  | 'revision_label'
  | 'part_uid'
  | 'part_name'
  | 'glb_url'
>;

export interface OfflineData {
  /** qrKey → onlayn olingan resolve natijasi. */
  resolves: Record<string, ResolveResponse>;
  /** qrKey → ochilgan modellardagi etiketka. */
  labels: Record<string, LabelRecord>;
  /** project_id → keshlangan loyiha (joriy reviziyani bilish uchun). */
  projects: Record<string, ProjectDetail>;
}

/** Model yuklanganda: har detalning `qr` matnidan etiketka yozuvi. */
export function labelsFromParts(
  parts: readonly { uid: string; name: string; qr: string }[],
  ctx: Omit<LabelRecord, 'part_uid' | 'part_name' | 'project_number'>,
): Record<string, LabelRecord> {
  const out: Record<string, LabelRecord> = {};
  for (const p of parts) {
    const parsed = parseQr(p.qr);
    if (!parsed) continue;
    out[qrKey(parsed)] = { ...ctx, project_number: parsed.projectNumber, part_uid: p.uid, part_name: p.name };
  }
  return out;
}

/**
 * Oflayn resolve. Avval keshlangan onlayn natija; bo'lmasa — ochilgan modeldagi etiketka asosida natija.
 * Joriy reviziya keshlangan loyihadan; loyiha keshda bo'lmasa — etiketkadagi reviziya joriy deb olinadi.
 * Joriy reviziya etiketkalari keshda bo'lmasa `part_in_latest` noma'lum → true (viewer topmasa "Detal modelda topilmadi").
 */
export function offlineResolve(qr: string, data: OfflineData): ResolveResponse | null {
  const parsed = parseQr(qr);
  if (!parsed) return null;
  const key = qrKey(parsed);
  const cached = data.resolves[key];
  if (cached) return cached;
  const rec = data.labels[key];
  if (!rec) return null;

  const latest = data.projects[String(rec.project_id)]?.items.find((it) => it.item_id === rec.item_id);
  // Kontrakt 2.4: `approved` faqat API'dan — oflaynda keshlangan javob bo'yicha; eski reviziya uchun noma'lum → false.
  if (!latest || latest.revision_id === rec.revision_id || !latest.glb_url) {
    return {
      ...rec,
      approved: latest?.revision_id === rec.revision_id ? latest.approved : false,
      usdz_url: null,
      is_latest: true,
      part_in_latest: true,
      latest_revision_id: rec.revision_id,
      latest_revision_label: rec.revision_label,
      latest_glb_url: rec.glb_url,
    };
  }
  const latestLabels = Object.values(data.labels).filter((l) => l.revision_id === latest.revision_id);
  return {
    ...rec,
    approved: false,
    usdz_url: null,
    is_latest: false,
    part_in_latest: latestLabels.length ? latestLabels.some((l) => l.part_uid === rec.part_uid) : true,
    latest_revision_id: latest.revision_id,
    latest_revision_label: latest.revision_label,
    latest_glb_url: latest.glb_url,
  };
}
