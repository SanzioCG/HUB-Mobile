// Kontrakt uhub-mobile/1.1, 2-bo'lim: GLB ichidagi extras.uhub tiplari va nomlash qoidalari.

export const CONTRACT_VERSION = '1.1';

export type PartKind = 'panel' | 'door' | 'drawer_front' | 'hardware';

/** 2.1: har `part__<uid>` tugunidagi `extras.uhub`. */
export interface PartExtras {
  kind: PartKind;
  uid: string;
  number: string;
  name: string;
  material: string;
  /** TODO(contract): tartib aniq emas; namunadagidek kamayish tartibida [uzunlik, eni, qalinlik]. */
  size_mm: [number, number, number];
  /** TODO(contract): kalitlar ro'yxati (L1, L2, W1, W2?) va ma'nosi kontraktda yo'q. */
  edges: Record<string, string>;
  /** TODO(contract): artikuli yo'q detal (panel) uchun null ruxsat etiladimi — kontraktda yo'q. */
  article: string | null;
  reveal: string[];
  qr: string;
}

/** 2.3: `item__<item_id>` tugunidagi `extras.uhub.dimensions`. */
export interface DimensionLine {
  label: string;
  from: [number, number, number];
  to: [number, number, number];
}

export interface ItemDimensions {
  overall_mm: { width: number; height: number; depth: number };
  lines: DimensionLine[];
}

/** 2.4: `asset.extras.uhub`. */
export interface AssetMeta {
  contract: string;
  project_number: number;
  item_id: string;
  revision_id: string;
  snapshot: string;
  approved: boolean;
  generated_at: string;
}

/** 2.1: tugun nomlarida faqat a–z 0–9 _ - ; ajratuvchi `__`. */
export const NODE_NAME_RE = /^[a-z0-9_-]+$/;

export const nodeName = {
  item: (itemId: string) => `item__${itemId}`,
  part: (uid: string) => {
    // TODO(contract): ruxsat etilmagan belgili uid tugun nomida qanday kodlanishi kontraktda yo'q.
    if (!NODE_NAME_RE.test(uid)) throw new Error(`uid tugun nomiga yaroqsiz: ${uid}`);
    return `part__${uid}`;
  },
  door: (id: string) => `pivot__door__${id}`,
  drawer: (id: string) => `slide__drawer__${id}`,
  carcass: 'group__carcass',
  fronts: 'group__fronts',
  hardware: 'group__hardware',
};

export const clipName = {
  door: (id: string) => `door__${id}__open`,
  drawer: (id: string) => `drawer__${id}__open`,
  all: 'all__open',
};

/** 6-bo'lim: QR matni `uhub:p/<project_number>/<part_uid>/<snapshot>`. */
export const qrText = (projectNumber: number, uid: string, snapshot: string) =>
  `uhub:p/${projectNumber}/${uid}/${snapshot}`;
