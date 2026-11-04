// `.uhub` fayl yozuvchisi (kontrakt 1.6, 10-bo'lim; ADR-020): ZIP — `manifest.json` (SHA-256 ro'yxati), `viewer/`
// (GLB + `index.json`), `project.json` va `documents/` (mijoz ma'lumoti o'rnida sintetik — ilova ularni o'qimaydi).
// Haqiqiy U-HUB eksporti bilan bir xil tuzilma (V-1a fayli: manifest `format: "uhub/1"`, `files: {yo'l: sha256}`).
import { createHash } from 'node:crypto';
import { NodeIO, type Document } from '@gltf-transform/core';
import { strToU8, zipSync, type Zippable } from 'fflate';
import { buildM0 } from './build.js';
import { ITEM, REVISIONS } from './m0.js';
import { encodeId } from './contract.js';

export interface UhubItem {
  doc: Document;
  itemId: string;
  name: string;
  revisionId: string;
  revisionLabel: string;
  approved: boolean;
  snapshot: string;
  sizeMm: { width: number; height: number; depth: number };
  transform: { translation: [number, number, number]; rotation: [number, number, number, number] };
  warnings?: string[];
}

export interface UhubSpec {
  projectNumber: number;
  projectName: string;
  items: UhubItem[];
  /** Index'dagi `contract` (haqiqiy V-1a fayli "1.5"). */
  contract?: string;
  /** Index `format` (standart `uhub-viewer/1`). */
  format?: string;
}

/** Deterministik ZIP (fixture har safar bir xil): sana o'zgarmas. */
const MTIME = new Date('2026-11-04T00:00:00Z');
const sha256 = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');
const json = (v: unknown) => strToU8(JSON.stringify(v, null, 1));

/** GLB'dagi detallar (`extras.uhub.uid`) — index `parts` (10.2: GLB bilan bir xil to'plam). */
export function partsOf(doc: Document): { uid: string; number: string; name: string; kind: string }[] {
  return doc
    .getRoot()
    .listNodes()
    .map(
      (n) =>
        (n.getExtras() as { uhub?: { uid?: string; number?: string; name?: string; kind?: string } }).uhub,
    )
    .filter(
      (x): x is { uid: string; number: string; name: string; kind: string } => typeof x?.uid === 'string',
    )
    .map(({ uid, number, name, kind }) => ({ uid, number, name, kind }));
}

/** ZIP yozuvlari (yo'l → baytlar), manifest bilan. Testlar uni buzib (SHA, yo'l) qayta yig'adi. */
export async function uhubEntries(spec: UhubSpec): Promise<Record<string, Uint8Array>> {
  const io = new NodeIO();
  const files: Record<string, Uint8Array> = {};
  const items = [];
  for (const it of spec.items) {
    const key = encodeId(it.itemId);
    const glb = `viewer/${key}.glb`;
    files[glb] = await io.writeBinary(it.doc);
    items.push({
      item_id: it.itemId,
      name: it.name,
      revision_id: it.revisionId,
      revision_label: it.revisionLabel,
      approved: it.approved,
      snapshot: it.snapshot,
      size_mm: it.sizeMm,
      transform: it.transform,
      glb,
      thumb: null,
      parts: partsOf(it.doc),
      ...(it.warnings ? { warnings: it.warnings } : {}),
    });
  }
  files['viewer/index.json'] = json({
    format: spec.format ?? 'uhub-viewer/1',
    contract: spec.contract ?? '1.6',
    project_number: spec.projectNumber,
    project_name: spec.projectName,
    exported_at: MTIME.toISOString(),
    items,
  });
  // Mijoz ma'lumoti o'rnida (sintetik): ilova va viewer bularni ochmaydi (kontrakt 10.3).
  files['project.json'] = json({ client: { name: 'Sinov Mijoz', phone: '+998 00 000 00 00' } });
  files['documents/item-1.json'] = json({ note: 'sintetik' });
  files['manifest.json'] = json({
    format: 'uhub/1',
    app_version: 'sample-glb',
    created_at: MTIME.toISOString(),
    files: Object.fromEntries(
      Object.entries(files)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([p, b]) => [p, sha256(b)]),
    ),
  });
  return files;
}

export function zipEntries(files: Record<string, Uint8Array>): Uint8Array {
  const z: Zippable = {};
  for (const [p, b] of Object.entries(files)) z[p] = [b, { mtime: MTIME, level: p.endsWith('.glb') ? 6 : 9 }];
  return zipSync(z);
}

/** Bitta M-0 buyumi uchun `size_mm` (overall). */
const M0_SIZE = { width: 600, height: 900, depth: 560 };
const ID = [0, 0, 0, 1] as [number, number, number, number];

/** Eksport ogohlantirishi (kontrakt 1.6, 10.2) — sintetik matn. */
export const SAMPLE_WARNINGS = ['Rels yurishi katalogda yo‘q — taxminiy qiymat (NL − 10), tasdiqlanmagan'];

/**
 * Sintetik `.uhub` (M-A7, 3-qism): 2 buyum — A: shisha eshik, lmdf, pvc, noma'lum `kind`, `__mid`, `warnings`
 * (R5); B: oddiy M-0 (R3), yonida. Loyiha № 51 — mock bilan bir xil QR etiketkalari.
 */
export function sampleUhubSpec(): UhubSpec {
  return {
    projectNumber: ITEM.projectNumber,
    projectName: 'Fayl namunasi (sintetik)',
    items: [
      {
        doc: buildM0('r5', { file: { itemId: 'f1', name: 'Namuna A — shisha eshik', variant: true } }),
        itemId: 'f1',
        name: 'Namuna A — shisha eshik',
        revisionId: REVISIONS.r5.revisionId,
        revisionLabel: REVISIONS.r5.revisionLabel,
        approved: true,
        snapshot: REVISIONS.r5.snapshot,
        sizeMm: M0_SIZE,
        transform: { translation: [0.3, 0, 0], rotation: ID },
        warnings: SAMPLE_WARNINGS,
      },
      {
        doc: buildM0('r3', { file: { itemId: 'f2', name: 'Namuna B' } }),
        itemId: 'f2',
        name: 'Namuna B',
        revisionId: REVISIONS.r3.revisionId,
        revisionLabel: REVISIONS.r3.revisionLabel,
        approved: false,
        snapshot: REVISIONS.r3.snapshot,
        sizeMm: M0_SIZE,
        transform: { translation: [0.95, 0, 0], rotation: ID },
      },
    ],
  };
}

export async function buildSampleUhub(): Promise<Uint8Array> {
  return zipEntries(await uhubEntries(sampleUhubSpec()));
}
