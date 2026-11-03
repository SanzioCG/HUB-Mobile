// Mock fixtures: kompaniyalar, loyihalar, buyumlar (kontrakt 1.3, 4-bo'lim). Reviziyalar tarkibi GLB'ning o'zidan
// o'qiladi — haqiqiy backend ham detal ro'yxatini eksport qilingan modeldan biladi.
import { NodeIO } from '@gltf-transform/core';

/** GLB ichidagi detal extras.uhub (kontrakt 2.1) — mock faqat kerakli maydonlarni o'qiydi. */
export interface PartInfo {
  uid: string;
  number: string;
  name: string;
  qr: string;
}

export interface RevisionData {
  revision_id: string;
  /** GLB `asset.extras.uhub.revision_label` (kontrakt 2.4). */
  revision_label: string;
  snapshot: string;
  parts: Map<string, PartInfo>;
}

/** Kontrakt 4: `export_status` ∈ ready | pending | failed. */
export type ExportStatus = 'ready' | 'pending' | 'failed';

export interface ItemData {
  item_id: string;
  name: string;
  /** Kontrakt 4: obyekt {width, height, depth}, mm (o'nlik bo'lishi mumkin). */
  size_mm: { width: number; height: number; depth: number };
  /** Eskidan yangiga; oxirgisi — joriy reviziya. */
  revisions: RevisionData[];
  /** Kontrakt 2.4: tasdiqlash holati faqat API'dan (GLB'da yo'q). */
  approved: boolean;
  export_status: ExportStatus;
}

/** Kontrakt 4: `status` ∈ draft | validated | approved. */
export type ProjectStatus = 'draft' | 'validated' | 'approved';

export interface ProjectData {
  id: number;
  number: number;
  name: string;
  status: ProjectStatus;
  company_id: number;
  updated_at: string;
  items: ItemData[];
}

export interface Store {
  user: { id: number; name: string; role: 'designer' | 'manager' | 'shop' | 'admin' };
  company: { id: number; name: string };
  projects: ProjectData[];
}

export const COMPANY = { id: 1, name: 'Namuna Mebel' };
export const OTHER_COMPANY = { id: 2, name: 'Boshqa Mebel' };
export const USER = { id: 7, name: 'Dizayner (mock)', role: 'designer' as const };

/** M-0 reviziyalari, eskidan yangiga. Fayl nomi = `<revision_id>.glb` (kontrakt 4: URL reviziya bo'yicha). */
export const M0_REVISION_IDS = ['m0-r3', 'm0-r5'] as const;
/** Og'ir namuna (ixtiyoriy fixture): `m0-heavy.glb`. */
export const HEAVY_REVISION_ID = 'm0-heavy';

const io = new NodeIO();

export async function readRevision(bytes: Uint8Array): Promise<RevisionData> {
  const doc = await io.readBinary(bytes);
  const meta = (doc.getRoot().getAsset().extras as { uhub?: Record<string, unknown> } | undefined)?.uhub;
  if (!meta) throw new Error('GLB: asset.extras.uhub yo‘q');
  const parts = new Map<string, PartInfo>();
  for (const node of doc.getRoot().listNodes()) {
    // Kontrakt 2.1: detal `extras.uhub.uid` bo'yicha (tugun nomiga tayanilmaydi).
    const x = node.getExtras().uhub as Partial<PartInfo> | undefined;
    if (typeof x?.uid !== 'string') continue;
    parts.set(x.uid, { uid: x.uid, number: String(x.number), name: String(x.name), qr: String(x.qr) });
  }
  return {
    revision_id: String(meta.revision_id),
    revision_label: String(meta.revision_label ?? meta.revision_id),
    snapshot: String(meta.snapshot),
    parts,
  };
}

/** Eksport tugamagan buyum: reviziya bor, lekin GLB yo'q (kontrakt 4: glb_url null). */
const pendingRevision = (id: string, label: string, snapshot: string): RevisionData => ({
  revision_id: id,
  revision_label: label,
  snapshot,
  parts: new Map(),
});

/** `glbs`: revision_id → GLB baytlari. M-0 reviziyalari majburiy, og'ir namuna ixtiyoriy. */
export async function createStore(glbs: Record<string, Uint8Array>): Promise<Store> {
  const revisions: RevisionData[] = [];
  for (const id of M0_REVISION_IDS) {
    const bytes = glbs[id];
    if (!bytes) throw new Error(`fixture yo'q: ${id}.glb (npm run fixtures)`);
    revisions.push(await readRevision(bytes));
  }
  const size = { width: 600, height: 900, depth: 560 };
  const items: ItemData[] = [
    { item_id: 'm0', name: 'M-0 namuna', size_mm: size, revisions, approved: false, export_status: 'ready' },
    {
      item_id: 'm1',
      name: 'Yuqori modul, 2 eshik',
      size_mm: { width: 800, height: 720, depth: 320 },
      revisions: [pendingRevision('m1-r1', 'R1', 'p1')],
      approved: false,
      export_status: 'pending',
    },
    {
      item_id: 'm2',
      name: 'Tortmali modul, 4 tortma',
      size_mm: { width: 450, height: 900, depth: 560 },
      revisions: [pendingRevision('m2-r2', 'R2', 'f2')],
      approved: true,
      export_status: 'failed',
    },
  ];
  const heavy = glbs[HEAVY_REVISION_ID];
  if (heavy) {
    items.push({
      item_id: 'm0-heavy',
      name: "M-0 og'ir namuna (o'lchov uchun)",
      size_mm: size,
      revisions: [await readRevision(heavy)],
      approved: true,
      export_status: 'ready',
    });
  }
  return {
    user: USER,
    company: COMPANY,
    projects: [
      {
        id: 101,
        number: 51,
        name: 'Oshxona — Chilonzor',
        status: 'validated',
        company_id: COMPANY.id,
        updated_at: '2026-11-02T14:30:00Z',
        items,
      },
      {
        id: 102,
        number: 52,
        name: 'Yotoqxona shkafi — Yunusobod',
        status: 'draft',
        company_id: COMPANY.id,
        updated_at: '2026-10-28T09:10:00Z',
        items: [],
      },
      {
        id: 103,
        number: 53,
        name: 'Ofis stellaji',
        status: 'approved',
        company_id: COMPANY.id,
        updated_at: '2026-10-15T16:45:00Z',
        items: [],
      },
      // Boshqa kompaniya: ro'yxatda ko'rinmaydi; uning etiketkasi resolve'da 404 (kontrakt 4).
      {
        id: 201,
        number: 77,
        name: 'Begona loyiha',
        status: 'approved',
        company_id: OTHER_COMPANY.id,
        updated_at: '2026-11-01T10:00:00Z',
        items: [],
      },
    ],
  };
}
