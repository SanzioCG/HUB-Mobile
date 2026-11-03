import { Document, type Material, type Node, type Texture, type TypedArray } from '@gltf-transform/core';
import {
  CONTRACT_VERSION,
  clipName,
  encodeId,
  nodeName,
  type AssetMeta,
  type EdgeKey,
  type ItemDimensions,
} from './contract.js';
import {
  DOOR_EXTRAS,
  DOOR_IDS,
  DOOR_PIVOT_MM,
  DRAWER_IDS,
  GENERATED_AT,
  HANDLE_BOX_MM,
  HEAVY,
  ITEM,
  M0_PARTS,
  MATERIALS,
  PROTOTYPE,
  REVISIONS,
  drawerRailBoxes,
  partExtras,
  partsForRevision,
  type MaterialId,
  type PartSpec,
  type Revision,
} from './m0.js';
import { OAK, woodJpeg } from './texture.js';

const MM = 0.001;
type Vec3 = [number, number, number];
const toM = (v: readonly number[]): Vec3 => [v[0]! * MM, v[1]! * MM, v[2]! * MM];

/** sRGB → linear (kontrakt 2.5: baseColorFactor linear). */
const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

interface Geo {
  pos: number[];
  nrm: number[];
  uv: number[];
  idx: number[];
}
const emptyGeo = (): Geo => ({ pos: [], nrm: [], uv: [], idx: [] });

/** Panel primitive'lari (kontrakt 2.5): yuzalar (TOP/BOTTOM) va to'rt qirra. */
export type FaceGroup = 'faces' | EdgeKey;
export const FACE_GROUPS: readonly FaceGroup[] = ['faces', 'L1', 'L2', 'W1', 'W2'];

/**
 * Markazi `center`, o'lchami `size` bo'lgan quti — yuza guruhlariga bo'lingan (birliklar bir xil: metr).
 * Qalinlik o'qi = eng kichik o'lcham, uzunlik = eng katta, kenglik = o'rtadagi.
 * L1/L2 — uzunlik bo'ylab qirralar (normal kenglik o'qida, + / −); W1/W2 — kenglik bo'ylab (normal uzunlik o'qida).
 * UV: U o'qi — tola (odatda uzunlik, `grainRotated` da kenglik); 1 UV birligi = `tile` (o'sha birlikda).
 * `segments` — har yuza N × N katakka (og'ir namuna uchun).
 */
export function panelGeometry(
  size: Vec3,
  center: Vec3,
  opts: { grainRotated?: boolean; tile?: number; segments?: number } = {},
): Record<FaceGroup, Geo> {
  const order = [0, 1, 2].sort((a, b) => size[a]! - size[b]!);
  const tAxis = order[0]!;
  const wAxis = order[1]!;
  const lAxis = order[2]!;
  const grain = opts.grainRotated ? wAxis : lAxis;
  const tile = opts.tile ?? 1;
  const n = opts.segments ?? 1;
  const out: Record<FaceGroup, Geo> = {
    faces: emptyGeo(),
    L1: emptyGeo(),
    L2: emptyGeo(),
    W1: emptyGeo(),
    W2: emptyGeo(),
  };
  const half = size.map((s) => s / 2) as Vec3;

  for (const a of [0, 1, 2]) {
    for (const sgn of [1, -1]) {
      const group: FaceGroup =
        a === tAxis ? 'faces' : a === wAxis ? (sgn > 0 ? 'L1' : 'L2') : sgn > 0 ? 'W1' : 'W2';
      const b = (a + 1) % 3;
      const c = (a + 2) % 3;
      // u × v = normal (soat strelkasiga qarshi, tashqariga)
      const [ua, va] = sgn > 0 ? [b, c] : [c, b];
      // tola o'qi yuza tekisligida bo'lsa — U shu o'q bo'ylab
      const [uAxis, vAxis] = grain === b || grain === c ? [grain, grain === b ? c : b] : [b, c];
      const g = out[group];
      const base = g.pos.length / 3;
      for (let j = 0; j <= n; j++) {
        for (let i = 0; i <= n; i++) {
          const local: Vec3 = [0, 0, 0];
          local[a] = sgn * half[a]!;
          local[ua] = -half[ua]! + (2 * half[ua]! * i) / n;
          local[va] = -half[va]! + (2 * half[va]! * j) / n;
          g.pos.push(center[0] + local[0], center[1] + local[1], center[2] + local[2]);
          const nv: Vec3 = [0, 0, 0];
          nv[a] = sgn;
          g.nrm.push(...nv);
          g.uv.push(local[uAxis]! / tile, local[vAxis]! / tile);
        }
      }
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const p = base + j * (n + 1) + i;
          g.idx.push(p, p + 1, p + n + 2, p, p + n + 2, p + n + 1);
        }
      }
    }
  }
  return out;
}

/** Bitta primitive'li quti (rels, tutqich). */
function boxGeometry(size: Vec3, center: Vec3): Geo {
  const parts = panelGeometry(size, center);
  const g = emptyGeo();
  for (const k of FACE_GROUPS) {
    const off = g.pos.length / 3;
    g.pos.push(...parts[k].pos);
    g.nrm.push(...parts[k].nrm);
    g.uv.push(...parts[k].uv);
    g.idx.push(...parts[k].idx.map((i) => i + off));
  }
  return g;
}

function dimensions(): ItemDimensions {
  const { widthMm: w, heightMm: h, depthMm: d } = ITEM;
  const off = 30; // chiziqlar buyumdan 30 mm chetda
  return {
    overall_mm: { width: w, height: h, depth: d },
    lines: [
      { label: String(w), from: toM([-w / 2, 0, off]), to: toM([w / 2, 0, off]) },
      { label: String(h), from: toM([w / 2 + off, 0, 0]), to: toM([w / 2 + off, h, 0]) },
      { label: String(d), from: toM([w / 2 + off, 0, 0]), to: toM([w / 2 + off, 0, -d]) },
    ],
  };
}

/** Y o'qi atrofida burilish kvaternioni [x, y, z, w]. */
function quatY(deg: number): [number, number, number, number] {
  const r = (deg * Math.PI) / 180 / 2;
  return [0, Math.sin(r), 0, Math.cos(r)];
}

export interface BuildOptions {
  /**
   * AR varianti (`<revision_id>-ar.glb`): animatsiyasiz, yopiq holat, o'sha geometriya va materiallar.
   * Scene Viewer bir nechta klipdan faqat birinchisini o'ynatadi va validatori buni xato deb belgilaydi.
   * TODO(contract): AR varianti kontraktda yo'q — taklif (docs/contract/proposals/1.4-proposal.md).
   */
  ar?: boolean;
  /** Og'ir namuna (`m0-heavy.glb`): yuzalar setkaga bo'lingan, 1024 px alohida teksturalar. */
  heavy?: boolean;
}

/** Og'ir namuna: har yuza 23 × 23 katak → ~140 000 uchburchak (≤ 150 000, kontrakt 2). */
export const HEAVY_SEGMENTS = 23;
/** Og'ir namuna: alohida dekor teksturalari soni (1024 px, yuqori sifat) — fayl ~14 MB. */
export const HEAVY_TEXTURES = 9;

export function buildM0(rev: Revision, opts: BuildOptions = {}): Document {
  const doc = new Document();
  const heavy = opts.heavy === true;
  const r = REVISIONS[rev];
  const ids = heavy
    ? {
        itemId: HEAVY.itemId,
        name: HEAVY.name,
        revisionId: HEAVY.revisionId,
        revisionLabel: HEAVY.revisionLabel,
        snapshot: HEAVY.snapshot,
      }
    : {
        itemId: ITEM.itemId,
        name: ITEM.name,
        revisionId: r.revisionId,
        revisionLabel: r.revisionLabel,
        snapshot: r.snapshot,
      };

  // 2.4: `approved` GLB'da yo'q — holat faqat API'dan.
  const meta: AssetMeta = {
    contract: CONTRACT_VERSION,
    project_number: ITEM.projectNumber,
    item_id: ids.itemId,
    revision_id: ids.revisionId,
    revision_label: ids.revisionLabel,
    snapshot: ids.snapshot,
    generated_at: GENERATED_AT,
  };
  const asset = doc.getRoot().getAsset();
  asset.generator = 'hub-mobile/tools/sample-glb';
  asset.extras = { uhub: meta };

  const buffer = doc.createBuffer();
  const accessor = (type: 'VEC3' | 'VEC2' | 'SCALAR', arr: TypedArray) =>
    doc.createAccessor().setType(type).setArray(arr).setBuffer(buffer);

  // ---- materiallar: bir xil material bir marta (`mat__<id>`), tekstura bir marta ----
  const textures = new Map<string, Texture>();
  const texture = (key: string, make: () => Uint8Array): Texture => {
    let t = textures.get(key);
    if (!t) {
      t = doc
        .createTexture(`tex__${encodeId(key)}`)
        .setImage(make())
        .setMimeType('image/jpeg');
      textures.set(key, t);
    }
    return t;
  };
  const materials = new Map<string, Material>();
  const material = (id: MaterialId, variant = 0): Material => {
    const key = variant ? `${id}-v${variant}` : id;
    const existing = materials.get(key);
    if (existing) return existing;
    const spec = MATERIALS[id];
    const [cr, cg, cb] = spec.color.map(srgbToLinear) as Vec3;
    const m = doc
      .createMaterial(nodeName.material(key))
      .setBaseColorFactor([cr, cg, cb, spec.alpha ?? 1])
      .setMetallicFactor(spec.metallic)
      .setRoughnessFactor(spec.roughness)
      .setExtras({ uhub: variant ? { ...spec.extras, id: key } : spec.extras });
    if (spec.alpha !== undefined) m.setAlphaMode('BLEND');
    if (spec.texture) {
      const style = spec.texture.style;
      const tex = heavy
        ? texture(`${key}-1024`, () => woodJpeg(1024, { ...style, grain: 0.5 }, 101 + variant, 95))
        : texture(id, () => woodJpeg(512, style, style === OAK ? 1 : 2, 85));
      m.setBaseColorTexture(tex);
    }
    materials.set(key, m);
    return m;
  };

  const primitive = (g: Geo, mat: Material) => {
    const big = g.pos.length / 3 > 65535;
    return doc
      .createPrimitive()
      .setMaterial(mat)
      .setAttribute('POSITION', accessor('VEC3', new Float32Array(g.pos)))
      .setAttribute('NORMAL', accessor('VEC3', new Float32Array(g.nrm)))
      .setAttribute('TEXCOORD_0', accessor('VEC2', new Float32Array(g.uv)))
      .setIndices(accessor('SCALAR', big ? new Uint32Array(g.idx) : new Uint16Array(g.idx)));
  };

  // ---- tugunlar (2.1) ----
  const item = doc
    .createNode(nodeName.item(ids.itemId))
    .setExtras({ uhub: { name: ids.name, dimensions: dimensions() } });
  const carcass = doc.createNode(nodeName.carcass);
  const fronts = doc.createNode(nodeName.fronts);
  const hardware = doc.createNode(nodeName.hardware);
  item.addChild(carcass).addChild(fronts).addChild(hardware);
  doc.createScene('scene').addChild(item);

  const pivotM = toM(DOOR_PIVOT_MM);
  const doors = new Map<string, Node>();
  for (const id of DOOR_IDS) {
    // 2.1: eshik ma'lumoti `pivot__door__<id>` tugunida.
    const pivot = doc
      .createNode(nodeName.door(id))
      .setTranslation(pivotM)
      .setExtras({ uhub: { door: DOOR_EXTRAS } });
    fronts.addChild(pivot);
    doors.set(id, pivot);
  }
  const steel = () => material('steel-handle');
  const drawers = new Map<string, Node>();
  const mids = new Map<string, Node>();
  for (const id of DRAWER_IDS) {
    const slide = doc.createNode(nodeName.drawer(id));
    fronts.addChild(slide);
    drawers.set(id, slide);
    // 2.2: relsning o'rta elementi — o'sha klipda yurishning yarmi.
    const railMesh = doc.createMesh(`rail__${id}__mid`);
    for (const rb of drawerRailBoxes(id))
      railMesh.addPrimitive(primitive(boxGeometry(toM(rb.box), toM(rb.center)), steel()));
    const mid = doc.createNode(nodeName.drawerMid(id)).setMesh(railMesh);
    slide.addChild(mid);
    mids.set(id, mid);
  }

  const parts: readonly PartSpec[] = heavy ? M0_PARTS : partsForRevision(rev);
  let decor = 0;
  for (const p of parts) {
    const number = M0_PARTS.indexOf(p) + 1; // etiketka raqami reviziyalar orasida barqaror
    let parent: Node;
    let origin: Vec3 = [0, 0, 0];
    if (p.parent.kind === 'door') {
      parent = doors.get(p.parent.id)!;
      origin = pivotM;
    } else if (p.parent.kind === 'drawer') {
      parent = drawers.get(p.parent.id)!;
    } else {
      parent = carcass;
    }
    const spec = MATERIALS[p.material];
    // og'ir namunada teksturali detallar navbat bilan alohida dekorlarga
    const variant = heavy && spec.texture ? (decor++ % HEAVY_TEXTURES) + 1 : 0;
    const plate = material(p.material, variant);
    const c = toM(p.center);
    const local: Vec3 = [c[0] - origin[0], c[1] - origin[1], c[2] - origin[2]];
    const groups = panelGeometry(toM(p.box), local, {
      grainRotated: p.grainRotated,
      tile: (spec.texture?.tileMm ?? 1000) * MM,
      segments: heavy ? HEAVY_SEGMENTS : 1,
    });
    const mesh = doc.createMesh(nodeName.part(p.uid));
    mesh.addPrimitive(primitive(groups.faces, plate));
    for (const k of ['L1', 'L2', 'W1', 'W2'] as const) {
      const band = p.edges[k];
      mesh.addPrimitive(primitive(groups[k], band ? material(band) : plate)); // kromkasiz — plita materiali
    }
    const node = doc
      .createNode(nodeName.part(p.uid))
      .setMesh(mesh)
      .setExtras({ uhub: partExtras(p, number, ids.snapshot) });
    if (p.handle) {
      // Metall tutqich (furnitura) — detal tuguni ichida: bosilganda detal tanlanadi.
      const vertical = p.kind === 'door';
      const hb: Vec3 = vertical ? [HANDLE_BOX_MM[1], HANDLE_BOX_MM[0], HANDLE_BOX_MM[2]] : [...HANDLE_BOX_MM];
      const hc: Vec3 = [
        local[0] + (vertical ? (p.box[0] / 2 - 50) * MM : 0),
        local[1] + (vertical ? 0 : (p.box[1] / 2 - 35) * MM),
        local[2] + (p.box[2] / 2 + HANDLE_BOX_MM[2] / 2) * MM,
      ];
      const handleMesh = doc
        .createMesh(`handle__${encodeId(p.uid)}`)
        .addPrimitive(primitive(boxGeometry(toM(hb), hc), steel()));
      node.addChild(doc.createNode(`hw__${encodeId(p.uid)}__handle`).setMesh(handleMesh));
    }
    parent.addChild(node);
  }

  if (opts.ar) return doc;

  // ---- 2.2: kliplar yopiqdan ochiqqa, LINEAR, 0.8 s ----
  const dur = PROTOTYPE.clipDurationS;
  const times = () => accessor('SCALAR', new Float32Array([0, dur]));
  // Burchak — `pivot__door.extras.uhub.door.open_angle_deg`. Chap petlya: +Z ga ochilishi uchun Y atrofida manfiy.
  const doorSign = DOOR_EXTRAS.hinge_side === 'left' ? -1 : 1;
  const doorChannel = (pivot: Node) => ({
    target: pivot,
    path: 'rotation' as const,
    values: new Float32Array([...quatY(0), ...quatY(doorSign * DOOR_EXTRAS.open_angle_deg)]),
    type: 'VEC4' as const,
  });
  const travel = PROTOTYPE.drawerTravelMm * MM;
  const translate = (target: Node, z: number) => ({
    target,
    path: 'translation' as const,
    values: new Float32Array([0, 0, 0, 0, 0, z]),
    type: 'VEC3' as const,
  });
  // Tortma: slide to'liq yurish; `__mid` slide bolasi — lokal −yarim → dunyoda +yarim yurish (kontrakt 2.2).
  const drawerChannels = (id: string) => [
    translate(drawers.get(id)!, travel),
    translate(mids.get(id)!, -travel / 2),
  ];
  type Channel = ReturnType<typeof doorChannel> | ReturnType<typeof translate>;

  const addClip = (name: string, channels: Channel[]) => {
    const anim = doc.createAnimation(name);
    for (const ch of channels) {
      const sampler = doc
        .createAnimationSampler()
        .setInput(times())
        .setOutput(doc.createAccessor().setType(ch.type).setArray(ch.values).setBuffer(buffer))
        .setInterpolation('LINEAR');
      anim
        .addSampler(sampler)
        .addChannel(
          doc.createAnimationChannel().setTargetNode(ch.target).setTargetPath(ch.path).setSampler(sampler),
        );
    }
  };

  const all: Channel[] = [];
  for (const [id, pivot] of doors) {
    addClip(clipName.door(id), [doorChannel(pivot)]);
    all.push(doorChannel(pivot));
  }
  for (const id of drawers.keys()) {
    addClip(clipName.drawer(id), drawerChannels(id));
    all.push(...drawerChannels(id));
  }
  addClip(clipName.all, all);

  return doc;
}

/** Og'ir namuna (`m0-heavy.glb`). */
export const buildHeavy = () => buildM0('r5', { heavy: true });
