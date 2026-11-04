// "M-0 namuna" (kontrakt 7-bo'lim): korpus + 1 eshik (yuqorida) + uning orqasida shisha polka + 3 tortma.
// Buyum 600 × 900 × 560 mm. Geometriya — qutilar; maqsad struktura va materiallar (kontrakt 1.3, 2.5).
//
// Koordinatalar shu faylda millimetrda, buyum ramkasida (kontrakt 2-bo'lim): Y yuqoriga, +Z old,
// boshi pol sathida old-pastki qirra markazida. Buyum z ∈ [-560, 0] da yotadi.

import {
  EDGE_KEYS,
  clipName,
  qrText,
  type DoorExtras,
  type EdgeKey,
  type MaterialExtras,
  type PartExtras,
  type PartKind,
} from './contract.js';
import { OAK, WHITE, type WoodStyle } from './texture.js';

/**
 * Manba yo'q, prototip. Kontrakt 2.2: burchak = petlya katalogi − 5°, yurish = rels katalogidan (V-1).
 * Bu namunada katalog yo'q — prototip qiymatlar.
 */
export const PROTOTYPE = {
  drawerTravelMm: 450,
  clipDurationS: 0.8,
} as const;

/** 2.1: `pivot__door__<id>` tugunidagi `extras.uhub.door`. Burchak — prototip (Blum 110° − 5°). */
export const DOOR_EXTRAS: DoorExtras = { hinge_side: 'left', open_angle_deg: 105, leaf: 1, leaves: 1 };

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
  r3: { revisionId: 'm0-r3', revisionLabel: 'R3', snapshot: 's3', removedUids: [] },
  // R5 da 3-tortmaning orqa devori o'chirilgan — resolve `part_in_latest=false` holati uchun.
  r5: { revisionId: 'm0-r5', revisionLabel: 'R5', snapshot: 's5', removedUids: ['m0p22'] },
};

/** Og'ir namuna (integratsiya hujjati 5.5): chegara yaqinida — telefonda ochilish vaqti, FPS, xotira. */
export const HEAVY = {
  itemId: 'm0-heavy',
  name: "M-0 og'ir namuna",
  revisionId: 'm0-heavy',
  revisionLabel: 'R1',
  snapshot: 'h1',
} as const;

/** Ruxsat etilmagan belgili uid (kontrakt 2.1): tugun nomi `part__x<base32>` bo'ladi. */
export const UNSAFE_UID = 'A1/B2.c';

/** Fixture bo'lgani uchun o'zgarmas — chiqish fayllari har safar bir xil bo'lsin. */
export const GENERATED_AT = '2026-11-03T00:00:00Z';

// ---------- materiallar (kontrakt 2.5) ----------

export type MaterialId =
  | 'oak-h1145-18'
  | 'white-w980-16'
  | 'hdf-white-4'
  | 'mdf-ral9010-18'
  | 'abs-h1145'
  | 'abs-w980'
  | 'glass-clear-6'
  | 'steel-handle'
  // `.uhub` fixture varianti (kontrakt 1.6, 2.5): lmdf, pvc va noma'lum `kind`.
  | 'lmdf-w1000-16'
  | 'pvc-w1000'
  | 'akril-gloss-18';

export interface MaterialSpec {
  extras: MaterialExtras;
  /** Detal kartasidagi `material` matni (2.1) — xuddi shu manbadan. */
  label: string;
  /** sRGB 0–1 (GLB'ga linear qilib yoziladi). */
  color: [number, number, number];
  roughness: number;
  metallic: number;
  /** Dekor teksturasi va plitka o'lchami (1 UV birligi = tile_mm). */
  texture?: { style: WoodStyle; tileMm: number };
  alpha?: number;
}

const mat = (
  id: MaterialId,
  kind: MaterialExtras['kind'],
  code: string,
  supplier: string,
  name: string,
  thickness: number | null,
  label: string,
  rest: Omit<MaterialSpec, 'extras' | 'label'>,
): MaterialSpec => ({ extras: { id, code, supplier, name, kind, thickness_mm: thickness }, label, ...rest });

export const MATERIALS: Record<MaterialId, MaterialSpec> = {
  'oak-h1145-18': mat(
    'oak-h1145-18',
    'ldsp',
    'H1145 ST10',
    'Egger',
    'Bardolino Natural Oak',
    18,
    'Egger H1145 ST10 Bardolino Natural Oak, LDSP 18 mm',
    { color: [1, 1, 1], roughness: 0.7, metallic: 0, texture: { style: OAK, tileMm: 800 } },
  ),
  'white-w980-16': mat(
    'white-w980-16',
    'ldsp',
    'W980 ST2',
    'Egger',
    'Platinum White',
    16,
    'Egger W980 ST2 Platinum White, LDSP 16 mm',
    { color: [1, 1, 1], roughness: 0.7, metallic: 0, texture: { style: WHITE, tileMm: 800 } },
  ),
  'hdf-white-4': mat('hdf-white-4', 'mdf', 'HDF 4', 'Kronospan', 'Oq HDF', 4, 'Kronospan HDF oq, 4 mm', {
    color: [0.9, 0.9, 0.88],
    roughness: 0.8,
    metallic: 0,
  }),
  // Bo'yalgan MDF: RAL 9010 (sRGB 241, 236, 225), mat → roughness 0.8 (kontrakt 2.5).
  'mdf-ral9010-18': mat(
    'mdf-ral9010-18',
    'mdf_painted',
    'RAL 9010',
    'Kronospan',
    "MDF bo'yalgan, mat",
    18,
    "MDF bo'yalgan RAL 9010 mat, 18 mm",
    { color: [241 / 255, 236 / 255, 225 / 255], roughness: 0.8, metallic: 0 },
  ),
  'abs-h1145': mat(
    'abs-h1145',
    'abs',
    'H1145 ST10',
    'Egger',
    'ABS kromka 23×1',
    1,
    'Egger ABS H1145 ST10, 23×1 mm',
    { color: [0.62, 0.47, 0.32], roughness: 0.6, metallic: 0 },
  ),
  'abs-w980': mat(
    'abs-w980',
    'abs',
    'W980 ST2',
    'Egger',
    'ABS kromka 23×1',
    1,
    'Egger ABS W980 ST2, 23×1 mm',
    {
      color: [0.92, 0.92, 0.9],
      roughness: 0.6,
      metallic: 0,
    },
  ),
  'glass-clear-6': mat(
    'glass-clear-6',
    'glass',
    'Float 6',
    'Guardian',
    'Tiniq shisha',
    6,
    'Guardian Float tiniq shisha, 6 mm',
    { color: [0.85, 0.93, 0.95], roughness: 0.05, metallic: 0, alpha: 0.3 },
  ),
  'steel-handle': mat(
    'steel-handle',
    'metal',
    'H128',
    'Hettich',
    'Tutqich 128 mm, po‘lat',
    null,
    'Hettich tutqich H128',
    { color: [0.75, 0.76, 0.78], roughness: 0.4, metallic: 1 },
  ),
  'lmdf-w1000-16': mat(
    'lmdf-w1000-16',
    'lmdf',
    'W1000 ST9',
    'Egger',
    'Premium White',
    16,
    'Egger W1000 ST9 Premium White, LMDF 16 mm',
    { color: [0.95, 0.95, 0.93], roughness: 0.7, metallic: 0 },
  ),
  'pvc-w1000': mat(
    'pvc-w1000',
    'pvc',
    'W1000',
    'Rehau',
    'PVX kromka 22×0.8',
    0.8,
    'Rehau PVX W1000, 22×0.8 mm',
    {
      color: [0.95, 0.95, 0.93],
      roughness: 0.6,
      metallic: 0,
    },
  ),
  // Noma'lum `kind` (kontrakt 1.6, 2.5) — xato emas, ilova oddiy material deb ko'rsatadi.
  'akril-gloss-18': mat(
    'akril-gloss-18',
    'akril' as MaterialExtras['kind'],
    'AG 18',
    'Fundermax',
    'Akril glyanes oq',
    18,
    'Fundermax akril glyanes oq, 18 mm',
    { color: [0.97, 0.97, 0.97], roughness: 0.15, metallic: 0 },
  ),
};

// ---------- detallar ----------

export type Parent = { kind: 'carcass' } | { kind: 'door'; id: string } | { kind: 'drawer'; id: string };

export interface PartSpec {
  uid: string;
  name: string;
  kind: PartKind;
  parent: Parent;
  /** Plita (yuzalar) materiali. */
  material: MaterialId;
  /** Quti o'lchami, mm (x, y, z). */
  box: [number, number, number];
  /** Quti markazi, mm, buyum ramkasida. */
  center: [number, number, number];
  /** Kromka materiallari; ko'rsatilmagan qirra — kromkasiz (null). */
  edges: Partial<Record<EdgeKey, MaterialId>>;
  reveal: string[];
  /** Tola 90° burilgan (UV tekshiruvi, kontrakt 2.5). */
  grainRotated?: boolean;
  /** Fasaddagi metall tutqich (furnitura) — detal tuguni ichida. */
  handle?: boolean;
}

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

/** Tutqich: 128 × 12 × 12 mm, fasad old yuzasida. */
export const HANDLE_BOX_MM: [number, number, number] = [128, 12, 12];

function buildParts(): PartSpec[] {
  let n = 0;
  const uid = () => `m0p${String(++n).padStart(2, '0')}`;
  const carcass: Parent = { kind: 'carcass' };
  const panel = (
    name: string,
    box: PartSpec['box'],
    center: PartSpec['center'],
    extra: Partial<PartSpec> = {},
  ): PartSpec => ({
    uid: uid(),
    name,
    kind: 'panel',
    parent: carcass,
    material: 'oak-h1145-18',
    box,
    center,
    edges: { L1: 'abs-h1145' }, // old qirra kromkali
    reveal: [],
    ...extra,
  });

  const parts: PartSpec[] = [
    panel('Chap yon devor', [T, H, CARCASS_DEPTH], [-(W / 2 - T / 2), H / 2, CZ]),
    panel("O'ng yon devor", [T, H, CARCASS_DEPTH], [W / 2 - T / 2, H / 2, CZ], { uid: UNSAFE_UID }),
    panel('Tub', [INNER_W, T, CARCASS_DEPTH - 4], [0, T / 2, CZ + 2]),
    panel('Qopqoq', [INNER_W, T, CARCASS_DEPTH - 4], [0, H - T / 2, CZ + 2], { grainRotated: true }),
    panel('Orqa devor', [INNER_W, H - 2 * T, 4], [0, H / 2, -(D - 2)], {
      material: 'hdf-white-4',
      edges: {},
    }),
    panel('Polka', [INNER_W, 6, 500], [0, DOOR_CY, -(36 + 250)], {
      material: 'glass-clear-6',
      edges: {},
      reveal: [clipName.door(DOOR_ID)],
    }),
    panel('Eshik', [W - 2 * GAP, 446, T], [0, DOOR_CY, -T / 2], {
      kind: 'door',
      parent: { kind: 'door', id: DOOR_ID },
      material: 'mdf-ral9010-18',
      edges: {}, // bo'yalgan MDF — qirralar ham bo'yalgan, kromkasiz
      handle: true,
    }),
  ];

  const BOX_W = INNER_W - 26; // relslar uchun har tomondan 13 mm
  const BOX_H = 100;
  const BOX_D = 500;
  const S = 16;
  DRAWERS.forEach((d, i) => {
    const no = i + 1;
    const parent: Parent = { kind: 'drawer', id: d.id };
    const box = (extra: Partial<PartSpec> = {}): Partial<PartSpec> => ({
      parent,
      material: 'white-w980-16',
      reveal: [clipName.drawer(d.id)],
      edges: { L1: 'abs-w980' }, // yuqori qirra kromkali
      ...extra,
    });
    const y0 = d.cy - 73 + 20; // tortma qutisining pastki sathi
    const zf = -T; // quti fasad orqasidan boshlanadi
    parts.push(
      panel(`Tortma ${no} fasadi`, [W - 2 * GAP, 146, T], [0, d.cy, -T / 2], {
        kind: 'drawer_front',
        parent,
        material: 'mdf-ral9010-18',
        edges: {},
        handle: true,
      }),
      panel(
        `Tortma ${no} tubi`,
        [BOX_W - 2 * S, S, BOX_D - S],
        [0, y0 + S / 2, zf - (BOX_D - S) / 2],
        box({ edges: {} }),
      ),
      panel(
        `Tortma ${no} chap yon`,
        [S, BOX_H, BOX_D],
        [-(BOX_W / 2 - S / 2), y0 + BOX_H / 2, zf - BOX_D / 2],
        box(),
      ),
      panel(
        `Tortma ${no} o'ng yon`,
        [S, BOX_H, BOX_D],
        [BOX_W / 2 - S / 2, y0 + BOX_H / 2, zf - BOX_D / 2],
        box(),
      ),
      panel(
        `Tortma ${no} orqa devori`,
        [BOX_W - 2 * S, BOX_H, S],
        [0, y0 + BOX_H / 2, zf - BOX_D + S / 2],
        box(),
      ),
    );
  });
  return parts;
}

export const M0_PARTS: readonly PartSpec[] = buildParts();
export const DOOR_IDS: readonly string[] = [DOOR_ID];
export const DRAWER_IDS: readonly string[] = DRAWERS.map((d) => d.id);

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

/**
 * `.uhub` fixture varianti (M-A7, kontrakt 1.6): shisha eshik, LMDF tub PVX kromka bilan, noma'lum `kind` li qopqoq.
 * Geometriya, uid va kliplar o'sha.
 */
export function fileVariantParts(parts: readonly PartSpec[]): PartSpec[] {
  return parts.map((p) => {
    if (p.kind === 'door')
      return { ...p, name: 'Shisha eshik', material: 'glass-clear-6', edges: {}, handle: true };
    if (p.name === 'Tub') return { ...p, material: 'lmdf-w1000-16', edges: { L1: 'pvc-w1000' } };
    if (p.name === 'Qopqoq') return { ...p, material: 'akril-gloss-18', edges: {} };
    return p;
  });
}

export function partsForRevision(rev: Revision): PartSpec[] {
  const removed = new Set(REVISIONS[rev].removedUids);
  return M0_PARTS.filter((p) => !removed.has(p.uid));
}

/** [L, W, T] — kamayish tartibida (uzunlik ≥ kenglik ≥ qalinlik). */
export const sizeLWT = (box: readonly number[]) => [...box].sort((a, b) => b - a) as [number, number, number];

export function partExtras(
  p: PartSpec,
  number: number,
  snapshot: string,
  projectNumber: number = ITEM.projectNumber,
): PartExtras {
  const edges = Object.fromEntries(
    EDGE_KEYS.map((k) => {
      const m = p.edges[k];
      return [k, m ? MATERIALS[m].label : null];
    }),
  ) as PartExtras['edges'];
  return {
    kind: p.kind,
    uid: p.uid,
    number: String(number),
    name: p.name,
    material: MATERIALS[p.material].label,
    size_mm: sizeLWT(p.box),
    edges,
    article: null,
    reveal: p.reveal,
    qr: qrText(projectNumber, p.uid, snapshot),
  };
}
