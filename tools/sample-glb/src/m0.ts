// "M-0 namuna" (kontrakt 7-bo'lim): korpus + 1 eshik (yuqorida) + uning orqasida polka + 3 tortma.
// Buyum 600 × 900 × 560 mm. Geometriya — oddiy qutilar; maqsad struktura.
//
// Koordinatalar shu faylda millimetrda, buyum ramkasida (kontrakt 2-bo'lim): Y yuqoriga, +Z old,
// boshi pol sathida old-pastki qirra markazida. Buyum z ∈ [-560, 0] da yotadi.

import { clipName, qrText, type DoorExtras, type PartExtras, type PartKind } from './contract.js';

/**
 * Manba yo'q, prototip. Kontrakt 1.2 (2.2): burchak va yurish katalogdan; tasdiqlanmagan bo'lsa —
 * prototip qiymat va klipda `extras.uhub.prototype = true`. Eshik burchagi — DOOR_EXTRAS.open_deg.
 */
export const PROTOTYPE = {
  drawerTravelMm: 450,
  clipDurationS: 0.8,
} as const;

/** TODO(contract-1.2): `extras.uhub.door` [TASDIQ]; qiymatlar qoralama namunasidan, prototip. */
export const DOOR_EXTRAS: DoorExtras = {
  hinge_side: 'left',
  hinge: 'Blum CLIP top 110° 71T3590',
  hinge_count: 2,
  open_deg: 105,
};

export const ITEM = {
  projectNumber: 51,
  itemId: 'm0',
  name: 'M-0 namuna',
  widthMm: 600,
  heightMm: 900,
  depthMm: 560,
} as const;

export type Revision = 'r3' | 'r5';

export const REVISIONS: Record<
  Revision,
  { revisionId: string; revisionLabel: string; snapshot: string; removedUids: string[] }
> = {
  // TODO(contract): snapshot va revision_id formati kontraktda yo'q (1.2 da ham [OCHIQ]); fixture qiymatlar.
  // TODO(contract-1.2): revision_label ("R3") qoralamadan.
  r3: { revisionId: 'm0-r3', revisionLabel: 'R3', snapshot: 's3', removedUids: [] },
  // R5 da 3-tortmaning orqa devori o'chirilgan — resolve `part_in_latest=false` holati uchun.
  r5: { revisionId: 'm0-r5', revisionLabel: 'R5', snapshot: 's5', removedUids: ['m0p22'] },
};

/** Ruxsat etilmagan belgili uid (kontrakt 1.2, 2.1): tugun nomi `part__x<base32>` bo'ladi. */
export const UNSAFE_UID = 'A1/B2.c';

/** Fixture bo'lgani uchun o'zgarmas — chiqish fayllari har safar bir xil bo'lsin. */
export const GENERATED_AT = '2026-11-03T00:00:00Z';

export type Parent = { kind: 'carcass' } | { kind: 'door'; id: string } | { kind: 'drawer'; id: string };

export type MaterialKey = 'carcass' | 'back' | 'front' | 'drawerBox' | 'rail';

export interface PartSpec {
  uid: string;
  name: string;
  kind: PartKind;
  parent: Parent;
  material: MaterialKey;
  /** Quti o'lchami, mm (x, y, z). */
  box: [number, number, number];
  /** Quti markazi, mm, buyum ramkasida. */
  center: [number, number, number];
  edges: Record<string, string>;
  reveal: string[];
}

export const MATERIALS: Record<MaterialKey, { label: string; color: [number, number, number] }> = {
  carcass: { label: 'Egger W980 ST2 Platinum White, LDSP 18 mm', color: [0.9, 0.9, 0.88] },
  back: { label: 'HDF 4 mm, oq', color: [0.82, 0.82, 0.8] },
  front: { label: 'Egger H1145 ST10 Bardolino Natural Oak, LDSP 18 mm', color: [0.62, 0.47, 0.32] },
  drawerBox: { label: 'Egger W980 ST2 Platinum White, LDSP 16 mm', color: [0.86, 0.86, 0.84] },
  rail: { label: 'Rels (prototip)', color: [0.55, 0.57, 0.6] },
};

const EDGE_WHITE = 'Egger ABS W980 ST2, 23 mm';
const EDGE_OAK = 'Egger ABS H1145 ST10, 23 mm';
const EDGE_ALL_OAK = { L1: EDGE_OAK, L2: EDGE_OAK, W1: EDGE_OAK, W2: EDGE_OAK };

const T = 18; // korpus va fasad qalinligi
const W = ITEM.widthMm;
const H = ITEM.heightMm;
const D = ITEM.depthMm;
const CARCASS_DEPTH = D - T; // fasadlar korpus oldida
const CZ = -(T + CARCASS_DEPTH / 2);
const INNER_W = W - 2 * T;
const GAP = 2;

const DOOR_ID = 'd1';
const DOOR_CY = 675;

/** Eshik petlya o'qi: chap qirra (DOOR_EXTRAS.hinge_side), old tekislik. */
export const DOOR_PIVOT_MM: [number, number, number] = [-(W / 2 - GAP), DOOR_CY, 0];

const DRAWERS = [
  { id: 'd2', cy: 375 },
  { id: 'd3', cy: 225 },
  { id: 'd4', cy: 75 },
] as const;

function buildParts(): PartSpec[] {
  let n = 0;
  const uid = () => `m0p${String(++n).padStart(2, '0')}`;
  const carcass: Parent = { kind: 'carcass' };
  const panel = (
    name: string,
    box: PartSpec['box'],
    center: PartSpec['center'],
    extra: Partial<PartSpec> = {},
  ) =>
    ({
      uid: uid(),
      name,
      kind: 'panel',
      parent: carcass,
      material: 'carcass',
      box,
      center,
      edges: { L1: EDGE_WHITE },
      reveal: [],
      ...extra,
    }) satisfies PartSpec;

  const parts: PartSpec[] = [
    panel('Chap yon devor', [T, H, CARCASS_DEPTH], [-(W / 2 - T / 2), H / 2, CZ]),
    panel("O'ng yon devor", [T, H, CARCASS_DEPTH], [W / 2 - T / 2, H / 2, CZ], { uid: UNSAFE_UID }),
    panel('Tub', [INNER_W, T, CARCASS_DEPTH - 4], [0, T / 2, CZ + 2]),
    panel('Qopqoq', [INNER_W, T, CARCASS_DEPTH - 4], [0, H - T / 2, CZ + 2]),
    panel('Orqa devor', [INNER_W, H - 2 * T, 4], [0, H / 2, -(D - 2)], { material: 'back', edges: {} }),
    panel('Polka', [INNER_W, T, 500], [0, DOOR_CY, -(36 + 250)], { reveal: [clipName.door(DOOR_ID)] }),
    panel('Eshik', [W - 2 * GAP, 446, T], [0, DOOR_CY, -T / 2], {
      kind: 'door',
      parent: { kind: 'door', id: DOOR_ID },
      material: 'front',
      edges: EDGE_ALL_OAK,
    }),
  ];

  const BOX_W = INNER_W - 26; // relslar uchun har tomondan 13 mm
  const BOX_H = 100;
  const BOX_D = 500;
  const S = 16;
  DRAWERS.forEach((d, i) => {
    const no = i + 1;
    const inner = {
      parent: { kind: 'drawer', id: d.id },
      material: 'drawerBox',
      reveal: [clipName.drawer(d.id)],
    } as const;
    const y0 = d.cy - 73 + 20; // tortma qutisining pastki sathi
    const zf = -T; // quti fasad orqasidan boshlanadi
    parts.push(
      panel(`Tortma ${no} fasadi`, [W - 2 * GAP, 146, T], [0, d.cy, -T / 2], {
        kind: 'drawer_front',
        parent: inner.parent,
        material: 'front',
        edges: EDGE_ALL_OAK,
      }),
      panel(`Tortma ${no} tubi`, [BOX_W - 2 * S, S, BOX_D - S], [0, y0 + S / 2, zf - (BOX_D - S) / 2], {
        ...inner,
        reveal: [...inner.reveal],
        edges: {},
      }),
      panel(
        `Tortma ${no} chap yon`,
        [S, BOX_H, BOX_D],
        [-(BOX_W / 2 - S / 2), y0 + BOX_H / 2, zf - BOX_D / 2],
        {
          ...inner,
          reveal: [...inner.reveal],
        },
      ),
      panel(`Tortma ${no} o'ng yon`, [S, BOX_H, BOX_D], [BOX_W / 2 - S / 2, y0 + BOX_H / 2, zf - BOX_D / 2], {
        ...inner,
        reveal: [...inner.reveal],
      }),
      panel(`Tortma ${no} orqa devori`, [BOX_W - 2 * S, BOX_H, S], [0, y0 + BOX_H / 2, zf - BOX_D + S / 2], {
        ...inner,
        reveal: [...inner.reveal],
      }),
    );
  });
  return parts;
}

export const M0_PARTS: readonly PartSpec[] = buildParts();

/**
 * Teleskopik relsning o'rta elementi (`slide__drawer__<id>__mid`): har tortmada ikki tomonda bittadan
 * ingichka quti, tortma qutisi va korpus yon devori orasidagi 13 mm oraliqda. Detal emas (etiketkasi yo'q).
 */
export function drawerRailBoxes(
  id: string,
): { box: [number, number, number]; center: [number, number, number] }[] {
  const d = DRAWERS.find((x) => x.id === id);
  if (!d) throw new Error(`tortma yo'q: ${id}`);
  const x = INNER_W / 2 - 6.5;
  const y = d.cy - 73 + 20 + 20;
  const len = PROTOTYPE.drawerTravelMm;
  return [-x, x].map((cx) => ({ box: [10, 35, len], center: [cx, y, -T - len / 2] }));
}
export const DOOR_IDS: readonly string[] = [DOOR_ID];
export const DRAWER_IDS: readonly string[] = DRAWERS.map((d) => d.id);

export function partsForRevision(rev: Revision): PartSpec[] {
  const removed = new Set(REVISIONS[rev].removedUids);
  return M0_PARTS.filter((p) => !removed.has(p.uid));
}

export function partExtras(p: PartSpec, number: number, snapshot: string): PartExtras {
  return {
    kind: p.kind,
    uid: p.uid,
    number: String(number),
    name: p.name,
    material: MATERIALS[p.material].label,
    size_mm: [...p.box].sort((a, b) => b - a) as [number, number, number],
    edges: p.edges,
    article: null,
    reveal: p.reveal,
    qr: qrText(ITEM.projectNumber, p.uid, snapshot),
    ...(p.kind === 'door' && { door: DOOR_EXTRAS }),
  };
}
