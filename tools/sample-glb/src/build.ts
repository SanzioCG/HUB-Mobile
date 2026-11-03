import { Document, type Material, type Node } from '@gltf-transform/core';
import { CONTRACT_VERSION, clipName, nodeName, type AssetMeta, type ItemDimensions } from './contract.js';
import {
  DOOR_IDS,
  DOOR_PIVOT_MM,
  DRAWER_IDS,
  GENERATED_AT,
  ITEM,
  M0_PARTS,
  MATERIALS,
  PROTOTYPE,
  REVISIONS,
  partExtras,
  partsForRevision,
  type MaterialKey,
  type Revision,
} from './m0.js';

const MM = 0.001;
type Vec3 = [number, number, number];
const toM = (v: readonly number[]): Vec3 => [v[0]! * MM, v[1]! * MM, v[2]! * MM];

/** Markazi (cx, cy, cz) bo'lgan quti: 24 uch (har yuzga alohida normal), 36 indeks. */
function boxGeometry(size: Vec3, center: Vec3) {
  const [hx, hy, hz] = size.map((s) => s / 2) as Vec3;
  const [cx, cy, cz] = center;
  // yuz: normal, u o'qi, v o'qi
  const faces: [Vec3, Vec3, Vec3][] = [
    [
      [1, 0, 0],
      [0, 0, -1],
      [0, 1, 0],
    ],
    [
      [-1, 0, 0],
      [0, 0, 1],
      [0, 1, 0],
    ],
    [
      [0, 1, 0],
      [1, 0, 0],
      [0, 0, -1],
    ],
    [
      [0, -1, 0],
      [1, 0, 0],
      [0, 0, 1],
    ],
    [
      [0, 0, 1],
      [1, 0, 0],
      [0, 1, 0],
    ],
    [
      [0, 0, -1],
      [-1, 0, 0],
      [0, 1, 0],
    ],
  ];
  const pos: number[] = [];
  const nrm: number[] = [];
  const idx: number[] = [];
  faces.forEach(([n, u, v], f) => {
    for (const [su, sv] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const) {
      pos.push(
        cx + (n[0] + u[0] * su + v[0] * sv) * hx,
        cy + (n[1] + u[1] * su + v[1] * sv) * hy,
        cz + (n[2] + u[2] * su + v[2] * sv) * hz,
      );
      nrm.push(...n);
    }
    const b = f * 4;
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  });
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), idx: new Uint16Array(idx) };
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

export function buildM0(rev: Revision): Document {
  const doc = new Document();
  const { revisionId, snapshot } = REVISIONS[rev];
  const meta: AssetMeta = {
    contract: CONTRACT_VERSION,
    project_number: ITEM.projectNumber,
    item_id: ITEM.itemId,
    revision_id: revisionId,
    snapshot,
    approved: false,
    generated_at: GENERATED_AT,
  };
  const asset = doc.getRoot().getAsset();
  asset.generator = 'hub-mobile/tools/sample-glb';
  asset.extras = { uhub: meta };

  const buffer = doc.createBuffer();
  const materials = {} as Record<MaterialKey, Material>;
  for (const [key, m] of Object.entries(MATERIALS) as [MaterialKey, (typeof MATERIALS)[MaterialKey]][]) {
    materials[key] = doc
      .createMaterial(key)
      .setBaseColorFactor([...m.color, 1])
      .setMetallicFactor(0)
      .setRoughnessFactor(0.7);
  }

  const item = doc
    .createNode(nodeName.item(ITEM.itemId))
    .setExtras({ uhub: { name: ITEM.name, dimensions: dimensions() } });
  const carcass = doc.createNode(nodeName.carcass);
  const fronts = doc.createNode(nodeName.fronts);
  const hardware = doc.createNode(nodeName.hardware);
  item.addChild(carcass).addChild(fronts).addChild(hardware);
  doc.createScene('scene').addChild(item);

  const pivotM = toM(DOOR_PIVOT_MM);
  const doors = new Map<string, Node>();
  for (const id of DOOR_IDS) {
    const pivot = doc.createNode(nodeName.door(id)).setTranslation(pivotM);
    fronts.addChild(pivot);
    doors.set(id, pivot);
  }
  const drawers = new Map<string, Node>();
  for (const id of DRAWER_IDS) {
    const slide = doc.createNode(nodeName.drawer(id));
    fronts.addChild(slide);
    drawers.set(id, slide);
  }

  for (const p of partsForRevision(rev)) {
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
    const c = toM(p.center);
    const g = boxGeometry(toM(p.box), [c[0] - origin[0], c[1] - origin[1], c[2] - origin[2]]);
    const prim = doc
      .createPrimitive()
      .setMaterial(materials[p.material])
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(g.pos).setBuffer(buffer))
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(g.nrm).setBuffer(buffer))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(g.idx).setBuffer(buffer));
    const mesh = doc.createMesh(nodeName.part(p.uid)).addPrimitive(prim);
    const node = doc
      .createNode(nodeName.part(p.uid))
      .setMesh(mesh)
      .setExtras({ uhub: partExtras(p, number, snapshot) });
    parent.addChild(node);
  }

  // 2.2: kliplar yopiqdan ochiqqa, LINEAR.
  const dur = PROTOTYPE.clipDurationS;
  const times = () =>
    doc
      .createAccessor()
      .setType('SCALAR')
      .setArray(new Float32Array([0, dur]))
      .setBuffer(buffer);
  // Chap petlya: eshik old tomonga (+Z) ochilishi uchun Y atrofida manfiy burchak.
  const doorChannel = (pivot: Node) => ({
    target: pivot,
    path: 'rotation' as const,
    values: new Float32Array([...quatY(0), ...quatY(-PROTOTYPE.doorOpenDeg)]),
    type: 'VEC4' as const,
  });
  const drawerChannel = (slide: Node) => ({
    target: slide,
    path: 'translation' as const,
    values: new Float32Array([0, 0, 0, 0, 0, PROTOTYPE.drawerTravelMm * MM]),
    type: 'VEC3' as const,
  });
  type Channel = ReturnType<typeof doorChannel> | ReturnType<typeof drawerChannel>;

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
  for (const [id, slide] of drawers) {
    addClip(clipName.drawer(id), [drawerChannel(slide)]);
    all.push(drawerChannel(slide));
  }
  addClip(clipName.all, all);

  return doc;
}
