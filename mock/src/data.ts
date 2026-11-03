// Mock fixtures: kompaniyalar, loyihalar, buyumlar. Reviziyalar tarkibi GLB'ning o'zidan o'qiladi —
// haqiqiy backend ham detal ro'yxatini eksport qilingan modeldan biladi.
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
  /** TODO(contract-1.2): GLB `asset.extras.uhub.revision_label` (qoralama 2.4). */
  revision_label: string;
  snapshot: string;
  parts: Map<string, PartInfo>;
}

export interface ItemData {
  item_id: string;
  name: string;
  /** TODO(contract): buyumning `size_mm` formati 4-bo'limda yo'q; [eni, balandligi, chuqurligi] deb olindi. */
  size_mm: [number, number, number];
  /** Eskidan yangiga; oxirgisi — joriy reviziya. */
  revisions: RevisionData[];
  /** Kontrakt 1.2 (2.4): tasdiqlash holati faqat API'dan (GLB'da yo'q). */
  approved: boolean;
}

export interface ProjectData {
  id: number;
  number: number;
  name: string;
  /** TODO(contract): `status` qiymatlari ro'yxati kontraktda yo'q. */
  status: string;
  company_id: number;
  updated_at: string;
  items: ItemData[];
}

export interface Store {
  user: { id: number; name: string };
  company: { id: number; name: string };
  projects: ProjectData[];
}

export const COMPANY = { id: 1, name: 'Namuna Mebel' };
export const OTHER_COMPANY = { id: 2, name: 'Boshqa Mebel' };
export const USER = { id: 7, name: 'Dizayner (mock)' };

/** M-0 reviziyalari, eskidan yangiga. Fayl nomi = `<revision_id>.glb` (kontrakt 4: URL reviziya bo'yicha). */
export const M0_REVISION_IDS = ['m0-r3', 'm0-r5'] as const;

const io = new NodeIO();

export async function readRevision(bytes: Uint8Array): Promise<RevisionData> {
  const doc = await io.readBinary(bytes);
  const meta = (doc.getRoot().getAsset().extras as { uhub?: Record<string, unknown> } | undefined)?.uhub;
  if (!meta) throw new Error('GLB: asset.extras.uhub yo‘q');
  const parts = new Map<string, PartInfo>();
  for (const node of doc.getRoot().listNodes()) {
    // Kontrakt 1.2 (2.1): detal `extras.uhub.uid` bo'yicha (tugun nomiga tayanilmaydi).
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

/** `glbs`: revision_id → GLB baytlari (M0_REVISION_IDS tartibida). */
export async function createStore(glbs: Record<string, Uint8Array>): Promise<Store> {
  const revisions: RevisionData[] = [];
  for (const id of M0_REVISION_IDS) {
    const bytes = glbs[id];
    if (!bytes) throw new Error(`fixture yo'q: ${id}.glb (npm run fixtures)`);
    revisions.push(await readRevision(bytes));
  }
  const m0: ItemData = {
    item_id: 'm0',
    name: 'M-0 namuna',
    size_mm: [600, 900, 560],
    revisions,
    approved: false,
  };
  return {
    user: USER,
    company: COMPANY,
    projects: [
      {
        id: 101,
        number: 51,
        name: 'Oshxona — Chilonzor',
        status: 'production',
        company_id: COMPANY.id,
        updated_at: '2026-11-02T14:30:00Z',
        items: [m0],
      },
      {
        id: 102,
        number: 52,
        name: 'Yotoqxona shkafi — Yunusobod',
        status: 'design',
        company_id: COMPANY.id,
        updated_at: '2026-10-28T09:10:00Z',
        items: [],
      },
      {
        id: 103,
        number: 53,
        name: 'Ofis stellaji',
        status: 'done',
        company_id: COMPANY.id,
        updated_at: '2026-10-15T16:45:00Z',
        items: [],
      },
      // Boshqa kompaniya: ro'yxatda ko'rinmaydi; uning etiketkasi resolve'da 403 other_company.
      {
        id: 201,
        number: 77,
        name: 'Begona loyiha',
        status: 'production',
        company_id: OTHER_COMPANY.id,
        updated_at: '2026-11-01T10:00:00Z',
        items: [],
      },
    ],
  };
}
