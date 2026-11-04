// Kontrakt uhub-mobile/1.6 (docs/contract/uhub-mobile-1.6.md), 2-bo'lim: GLB ichidagi extras.uhub tiplari va nomlash.

export const CONTRACT_VERSION = '1.6';

export type PartKind = 'panel' | 'door' | 'drawer_front' | 'hardware';

/** 2.1: `pivot__door__<id>` tugunidagi `extras.uhub.door`. */
export interface DoorExtras {
  hinge_side: 'left' | 'right' | 'top' | 'bottom';
  open_angle_deg: number;
  leaf: number;
  leaves: number;
}

export type EdgeKey = 'L1' | 'L2' | 'W1' | 'W2';
export const EDGE_KEYS: readonly EdgeKey[] = ['L1', 'L2', 'W1', 'W2'];

/** 2.5: material `extras.uhub`. */
export interface MaterialExtras {
  id: string;
  code: string;
  supplier: string;
  name: string;
  kind: 'ldsp' | 'mdf' | 'mdf_painted' | 'veneer' | 'hpl' | 'abs' | 'metal' | 'plastic' | 'glass';
  /** TODO(contract): metall furnitura uchun qalinlik ma'nosi kontraktda yo'q — null. */
  thickness_mm: number | null;
}

/** 2.1: har `part__…` tugunidagi `extras.uhub`. */
export interface PartExtras {
  kind: PartKind;
  uid: string;
  number: string;
  name: string;
  material: string;
  /** 2.1: [L, W, T] — uzunlik, kenglik, qalinlik (tayyor o'lcham). */
  size_mm: [number, number, number];
  /** 2.1: har doim 4 kalit; qiymat — kromka matni yoki null (kromkasiz). */
  edges: Record<EdgeKey, string | null>;
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

/** 2.4: `asset.extras.uhub`. `approved` GLB'da yo'q — holat faqat API'dan. */
export interface AssetMeta {
  contract: string;
  project_number: number;
  item_id: string;
  revision_id: string;
  revision_label: string;
  snapshot: string;
  generated_at: string;
}

/** 2.1: tugun nomlarida faqat a–z 0–9 _ - ; ajratuvchi `__`. */
export const NODE_NAME_RE = /^[a-z0-9_-]+$/;

/** 2.1: nomda o'zicha turadigan id — shu ifodaga mos va ichida `__` yo'q. */
export const PLAIN_ID_RE = /^[a-z0-9-]+(_[a-z0-9-]+)*$/;

/** 2.1 kodlash: mos id — o'zi, aks holda `x` + base32 (UTF-8, RFC 4648, kichik, `=` siz). `A/1` → `xiextc` (kontrakt misolidagi `xifxte` RFC 4648 ga mos emas — TODO(contract)). */
export const encodeId = (id: string) =>
  PLAIN_ID_RE.test(id) && !id.includes('__') ? id : `x${base32Encode(id)}`;

const B32 = 'abcdefghijklmnopqrstuvwxyz234567';

/** RFC 4648 base32, kichik harflarda, `=` siz (kontrakt 1.2, 2.1). Kirish — UTF-8. */
export function base32Encode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let out = '';
  let buf = 0;
  let bits = 0;
  for (const b of bytes) {
    buf = (buf << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(buf >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(buf << (5 - bits)) & 31];
  return out;
}

export function base32Decode(code: string): string {
  const bytes: number[] = [];
  let buf = 0;
  let bits = 0;
  for (const ch of code) {
    const v = B32.indexOf(ch);
    if (v < 0) throw new Error(`base32 emas: ${ch}`);
    buf = (buf << 5) | v;
    bits += 5;
    if (bits >= 8) {
      bytes.push((buf >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

export const nodeName = {
  item: (itemId: string) => `item__${encodeId(itemId)}`,
  part: (uid: string) => `part__${encodeId(uid)}`,
  door: (id: string) => `pivot__door__${encodeId(id)}`,
  drawer: (id: string) => `slide__drawer__${encodeId(id)}`,
  /** 2.1/2.2: teleskopik relsning o'rta elementi. */
  drawerMid: (id: string) => `slide__drawer__${encodeId(id)}__mid`,
  material: (id: string) => `mat__${encodeId(id)}`,
  carcass: 'group__carcass',
  fronts: 'group__fronts',
  hardware: 'group__hardware',
};

export const clipName = {
  door: (id: string) => `door__${encodeId(id)}__open`,
  drawer: (id: string) => `drawer__${encodeId(id)}__open`,
  all: 'all__open',
};

/** 6-bo'lim: QR matni `uhub:p/<project_number>/<part_uid>/<snapshot>`. */
export const qrText = (projectNumber: number, uid: string, snapshot: string) =>
  `uhub:p/${projectNumber}/${uid}/${snapshot}`;
