// Kontrakt uhub-mobile/1.2 (QORALAMA: docs/contract/uhub-mobile-1.2-draft.md), 2-bo'lim:
// GLB ichidagi extras.uhub tiplari va nomlash qoidalari.

// TODO(contract-1.2): qoralama — architect tasdiqlamagan.
export const CONTRACT_VERSION = '1.2';

export type PartKind = 'panel' | 'door' | 'drawer_front' | 'hardware';

/** 2.1 (1.2): eshik tugunidagi `extras.uhub.door`. TODO(contract-1.2): [TASDIQ]. */
export interface DoorExtras {
  hinge_side: 'left' | 'right';
  hinge: string;
  hinge_count: number;
  open_deg: number;
}

/** 2.1: har `part__…` tugunidagi `extras.uhub`. */
export interface PartExtras {
  kind: PartKind;
  uid: string;
  number: string;
  name: string;
  material: string;
  /** TODO(contract): tartib aniq emas (1.2 da ham [OCHIQ]); namunadagidek kamayish tartibida. */
  size_mm: [number, number, number];
  /** TODO(contract): kalitlar ro'yxati va ma'nosi (1.2 da ham [OCHIQ]). */
  edges: Record<string, string>;
  /** TODO(contract): artikuli yo'q detalda null ruxsatmi (1.2 da ham [OCHIQ]). */
  article: string | null;
  reveal: string[];
  qr: string;
  /** Faqat `kind: "door"`. */
  door?: DoorExtras;
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

/** 2.4 (1.2): `asset.extras.uhub`. `approved` GLB'da yo'q — holat faqat API'dan. */
export interface AssetMeta {
  contract: string;
  project_number: number;
  item_id: string;
  revision_id: string;
  /** TODO(contract-1.2): qoralamadan. */
  revision_label: string;
  snapshot: string;
  generated_at: string;
}

/** 2.1: tugun nomlarida faqat a–z 0–9 _ - ; ajratuvchi `__`. */
export const NODE_NAME_RE = /^[a-z0-9_-]+$/;

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
  item: (itemId: string) => `item__${itemId}`,
  /** TODO(contract-1.2): ruxsat etilmagan belgili uid → `part__x<base32>` (qoralama 2.1). */
  part: (uid: string) => (NODE_NAME_RE.test(uid) ? `part__${uid}` : `part__x${base32Encode(uid)}`),
  door: (id: string) => `pivot__door__${id}`,
  drawer: (id: string) => `slide__drawer__${id}`,
  /** TODO(contract-1.2): teleskopik relsning o'rta elementi (qoralama 2.1). */
  drawerMid: (id: string) => `slide__drawer__${id}__mid`,
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
