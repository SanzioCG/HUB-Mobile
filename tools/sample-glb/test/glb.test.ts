// Generator chiqargan GLB'ni qayta o'qib, kontrakt 1.2 (qoralama) 2-bo'limiga qarshi tekshiradi.
import { describe, expect, it } from 'vitest';
import { NodeIO, type Document, type Node } from '@gltf-transform/core';
import { buildM0 } from '../src/build.js';
import {
  NODE_NAME_RE,
  base32Decode,
  base32Encode,
  nodeName,
  type AssetMeta,
  type ItemDimensions,
  type PartExtras,
} from '../src/contract.js';
import {
  DOOR_EXTRAS,
  DOOR_IDS,
  DRAWER_IDS,
  ITEM,
  M0_PARTS,
  PROTOTYPE,
  REVISIONS,
  UNSAFE_UID,
  type Revision,
} from '../src/m0.js';
import { validateGlb } from '../src/validate.js';

const io = new NodeIO();
const PART_KEYS = [
  'kind',
  'uid',
  'number',
  'name',
  'material',
  'size_mm',
  'edges',
  'article',
  'reveal',
  'qr',
];

async function roundTrip(rev: Revision): Promise<{ doc: Document; bytes: Uint8Array }> {
  const bytes = await io.writeBinary(buildM0(rev));
  return { doc: await io.readBinary(bytes), bytes };
}

const uhub = <T>(n: { getExtras(): Record<string, unknown> }) => n.getExtras().uhub as T;
const byName = (doc: Document, name: string) =>
  doc
    .getRoot()
    .listNodes()
    .find((n) => n.getName() === name);
const parentOf = (doc: Document, node: Node) =>
  doc
    .getRoot()
    .listNodes()
    .find((n) => n.listChildren().includes(node));
const partNodes = (doc: Document) =>
  doc
    .getRoot()
    .listNodes()
    .filter((n) => typeof uhub<PartExtras | undefined>(n)?.uid === 'string');
const byPartName = (doc: Document, name: string) =>
  partNodes(doc).find((n) => uhub<PartExtras>(n).name === name)!;

describe('base32 (RFC 4648, kichik harf, = siz)', () => {
  it.each([
    ['', ''],
    ['f', 'my'],
    ['fo', 'mzxq'],
    ['foo', 'mzxw6'],
    ['foob', 'mzxw6yq'],
    ['fooba', 'mzxw6ytb'],
    ['foobar', 'mzxw6ytboi'],
  ])('%j → %j (RFC 4648 test vektorlari)', (text, code) => {
    expect(base32Encode(text)).toBe(code);
    expect(base32Decode(code)).toBe(text);
  });

  it('ruxsat etilmagan belgili uid: kodlash/dekodlash va tugun nomi', () => {
    const code = base32Encode(UNSAFE_UID);
    expect(code).toMatch(/^[a-z2-7]+$/);
    expect(base32Decode(code)).toBe(UNSAFE_UID);
    expect(nodeName.part(UNSAFE_UID)).toBe(`part__x${code}`);
    expect(nodeName.part('m0p06')).toBe('part__m0p06');
    expect(base32Decode(base32Encode('Ўзбек/№12'))).toBe('Ўзбек/№12');
  });
});

describe.each(Object.keys(REVISIONS) as Revision[])('M-0 %s', (rev) => {
  it('gltf-validator: 0 error', async () => {
    const { bytes } = await roundTrip(rev);
    const report = await validateGlb(bytes);
    expect(report.messages.filter((m) => m.severity === 0)).toEqual([]);
  });

  it('asset.extras.uhub (2.4, 1.2): revision_label bor, approved yo‘q', async () => {
    const { doc } = await roundTrip(rev);
    const meta = (doc.getRoot().getAsset().extras as { uhub: AssetMeta & { approved?: unknown } }).uhub;
    expect(meta).toMatchObject({
      contract: '1.2',
      project_number: ITEM.projectNumber,
      item_id: ITEM.itemId,
      revision_id: REVISIONS[rev].revisionId,
      revision_label: REVISIONS[rev].revisionLabel,
      snapshot: REVISIONS[rev].snapshot,
    });
    expect('approved' in meta).toBe(false);
    expect(Number.isNaN(Date.parse(meta.generated_at))).toBe(false);
  });

  it('tugunlar ierarxiyasi va nomlari (2.1)', async () => {
    const { doc } = await roundTrip(rev);
    const scene = doc.getRoot().listScenes()[0]!;
    const [item] = scene.listChildren();
    expect(item!.getName()).toBe(`item__${ITEM.itemId}`);
    expect(item!.listChildren().map((n) => n.getName())).toEqual([
      'group__carcass',
      'group__fronts',
      'group__hardware',
    ]);
    const fronts = byName(doc, 'group__fronts')!;
    expect(fronts.listChildren().map((n) => n.getName())).toEqual([
      ...DOOR_IDS.map((id) => `pivot__door__${id}`),
      ...DRAWER_IDS.map((id) => `slide__drawer__${id}`),
    ]);
    for (const id of DRAWER_IDS) {
      const mid = byName(doc, `slide__drawer__${id}__mid`)!;
      expect(parentOf(doc, mid)!.getName()).toBe(`slide__drawer__${id}`);
    }
    for (const n of doc.getRoot().listNodes()) expect(n.getName()).toMatch(NODE_NAME_RE);
  });

  it('item dimensions (2.3)', async () => {
    const { doc } = await roundTrip(rev);
    const dims = uhub<{ dimensions: ItemDimensions }>(byName(doc, 'item__m0')!).dimensions;
    expect(dims.overall_mm).toEqual({ width: 600, height: 900, depth: 560 });
    expect(dims.lines.length).toBeGreaterThan(0);
  });

  it('har detal tugunida to‘liq extras.uhub; tugun nomi uid’dan (kodlangan bo‘lishi mumkin)', async () => {
    const { doc } = await roundTrip(rev);
    const parts = partNodes(doc);
    const removed = REVISIONS[rev].removedUids;
    expect(parts).toHaveLength(M0_PARTS.length - removed.length);
    for (const node of parts) {
      const x = uhub<PartExtras>(node);
      const keys = Object.keys(x).filter((k) => k !== 'door');
      expect(keys.sort()).toEqual([...PART_KEYS].sort());
      expect(node.getName()).toBe(nodeName.part(x.uid));
      expect(x.qr).toBe(`uhub:p/${ITEM.projectNumber}/${x.uid}/${REVISIONS[rev].snapshot}`);
      expect(node.getMesh()).not.toBeNull();
    }
    const unsafe = parts.find((n) => uhub<PartExtras>(n).uid === UNSAFE_UID)!;
    expect(unsafe.getName()).toBe(`part__x${base32Encode(UNSAFE_UID)}`);
    for (const uid of removed) expect(parts.some((n) => uhub<PartExtras>(n).uid === uid)).toBe(false);
  });

  it('eshik: extras.uhub.door (1.2), boshqa detallarda yo‘q', async () => {
    const { doc } = await roundTrip(rev);
    for (const node of partNodes(doc)) {
      const x = uhub<PartExtras>(node);
      if (x.kind === 'door') expect(x.door).toEqual(DOOR_EXTRAS);
      else expect(x.door).toBeUndefined();
    }
  });

  it('kliplar: mavjud tugunlar, LINEAR, 0.8 s, prototype=true; eshik burchagi door.open_deg dan', async () => {
    const { doc } = await roundTrip(rev);
    const anims = doc.getRoot().listAnimations();
    expect(anims.map((a) => a.getName()).sort()).toEqual(
      [
        ...DOOR_IDS.map((id) => `door__${id}__open`),
        ...DRAWER_IDS.map((id) => `drawer__${id}__open`),
        'all__open',
      ].sort(),
    );
    const nodes = new Set(doc.getRoot().listNodes());
    for (const a of anims) {
      expect(uhub<{ prototype: boolean }>(a).prototype).toBe(true);
      for (const ch of a.listChannels()) {
        expect(nodes.has(ch.getTargetNode()!)).toBe(true);
        expect(ch.getSampler()!.getInterpolation()).toBe('LINEAR');
        expect(ch.getSampler()!.getInput()!.getMax([])[0]).toBeCloseTo(0.8);
      }
    }
    for (const id of DOOR_IDS) {
      const ch = anims.find((a) => a.getName() === `door__${id}__open`)!.listChannels()[0]!;
      expect(ch.getTargetNode()!.getName()).toBe(`pivot__door__${id}`);
      expect(ch.getTargetPath()).toBe('rotation');
      const q = ch.getSampler()!.getOutput()!.getElement(1, []);
      const deg = (2 * Math.acos(Math.min(1, Math.abs(q[3]!))) * 180) / Math.PI;
      expect(deg).toBeCloseTo(DOOR_EXTRAS.open_deg, 3);
    }
  });

  it('tortma klipi: slide to‘liq yurish +Z, __mid dunyoda yurishning yarmi', async () => {
    const { doc } = await roundTrip(rev);
    const anims = doc.getRoot().listAnimations();
    const travel = PROTOTYPE.drawerTravelMm / 1000;
    for (const id of DRAWER_IDS) {
      const chans = anims.find((a) => a.getName() === `drawer__${id}__open`)!.listChannels();
      const endZ = (name: string) => {
        const ch = chans.find((c) => c.getTargetNode()!.getName() === name)!;
        expect(ch.getTargetPath()).toBe('translation');
        return ch.getSampler()!.getOutput()!.getElement(1, [])[2]!;
      };
      const slideZ = endZ(`slide__drawer__${id}`);
      const midLocalZ = endZ(`slide__drawer__${id}__mid`);
      expect(slideZ).toBeCloseTo(travel);
      expect(slideZ + midLocalZ).toBeCloseTo(travel / 2); // mid — slide bolasi
    }
  });

  it('reveal dagi har klip mavjud; polka → eshik, tortma tubi → tortma', async () => {
    const { doc } = await roundTrip(rev);
    const clips = new Set(
      doc
        .getRoot()
        .listAnimations()
        .map((a) => a.getName()),
    );
    for (const node of partNodes(doc))
      for (const c of uhub<PartExtras>(node).reveal) expect(clips.has(c)).toBe(true);
    expect(uhub<PartExtras>(byPartName(doc, 'Polka')).reveal).toEqual(['door__d1__open']);
    for (const [i, id] of DRAWER_IDS.entries()) {
      const bottom = byPartName(doc, `Tortma ${i + 1} tubi`);
      expect(uhub<PartExtras>(bottom).reveal).toEqual([`drawer__${id}__open`]);
      expect(parentOf(doc, bottom)!.getName()).toBe(`slide__drawer__${id}`);
    }
    expect(uhub<PartExtras>(byPartName(doc, 'Eshik')).reveal).toEqual([]);
  });
});

/** Sahna bounding box'i (dunyo koordinatalarida, metr): har mesh POSITION min/max burchaklari × dunyo matritsasi. */
function sceneBounds(doc: Document): { min: number[]; max: number[] } {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const m = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION')!;
      const lo = pos.getMin([]);
      const hi = pos.getMax([]);
      for (const x of [lo[0]!, hi[0]!])
        for (const y of [lo[1]!, hi[1]!])
          for (const z of [lo[2]!, hi[2]!]) {
            const p = [
              m[0] * x + m[4] * y + m[8] * z + m[12],
              m[1] * x + m[5] * y + m[9] * z + m[13],
              m[2] * x + m[6] * y + m[10] * z + m[14],
            ];
            for (let i = 0; i < 3; i++) {
              min[i] = Math.min(min[i]!, p[i]!);
              max[i] = Math.max(max[i]!, p[i]!);
            }
          }
    }
  }
  return { min, max };
}

describe.each(Object.keys(REVISIONS) as Revision[])('M-0 %s — AR varianti (Scene Viewer)', (rev) => {
  const arRoundTrip = async () => {
    const bytes = await io.writeBinary(buildM0(rev, { ar: true }));
    return { doc: await io.readBinary(bytes), bytes };
  };

  it('animatsiyalar soni 0, gltf-validator 0 error', async () => {
    const { doc, bytes } = await arRoundTrip();
    expect(doc.getRoot().listAnimations()).toHaveLength(0);
    const report = await validateGlb(bytes);
    expect(report.messages.filter((m) => m.severity === 0)).toEqual([]);
  });

  it('o‘lchamlar asosiy GLB bilan bir xil (bounding box ±0.1 mm) va 600 × 900 × 560 mm', async () => {
    const ar = sceneBounds((await arRoundTrip()).doc);
    const main = sceneBounds((await roundTrip(rev)).doc);
    for (let i = 0; i < 3; i++) {
      expect(Math.abs(ar.min[i]! - main.min[i]!)).toBeLessThanOrEqual(0.0001);
      expect(Math.abs(ar.max[i]! - main.max[i]!)).toBeLessThanOrEqual(0.0001);
    }
    const size = [0, 1, 2].map((i) => Math.round((ar.max[i]! - ar.min[i]!) * 1000));
    expect(size).toEqual([600, 900, 560]);
    expect(ar.min[1]).toBeCloseTo(0, 6); // pol sathida
    expect(ar.max[2]).toBeCloseTo(0, 6); // old qirra z = 0
  });

  it('o‘sha detallar va materiallar; Scene Viewer tavsiyasi: ≤ 10 material, ≤ 100 000 uchburchak', async () => {
    const { doc } = await arRoundTrip();
    const main = (await roundTrip(rev)).doc;
    expect(partNodes(doc).map((n) => uhub<PartExtras>(n).uid)).toEqual(
      partNodes(main).map((n) => uhub<PartExtras>(n).uid),
    );
    expect(
      doc
        .getRoot()
        .listMaterials()
        .map((m) => m.getName()),
    ).toEqual(
      main
        .getRoot()
        .listMaterials()
        .map((m) => m.getName()),
    );
    expect(doc.getRoot().listMaterials().length).toBeLessThanOrEqual(10);
    const triangles = doc
      .getRoot()
      .listMeshes()
      .flatMap((m) => m.listPrimitives())
      .reduce((s, p) => s + p.getIndices()!.getCount() / 3, 0);
    expect(triangles).toBeLessThanOrEqual(100_000);
  });
});
