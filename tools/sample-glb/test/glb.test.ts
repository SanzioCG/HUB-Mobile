// Generator chiqargan GLB'ni qayta o'qib, kontrakt 1.3 (2-bo'lim) ga qarshi tekshiradi.
import { describe, expect, it } from 'vitest';
import { NodeIO, type Document, type Material, type Node } from '@gltf-transform/core';
import { buildHeavy, buildM0, HEAVY_SEGMENTS } from '../src/build.js';
import {
  EDGE_KEYS,
  NODE_NAME_RE,
  base32Decode,
  base32Encode,
  encodeId,
  nodeName,
  type AssetMeta,
  type DoorExtras,
  type ItemDimensions,
  type MaterialExtras,
  type PartExtras,
} from '../src/contract.js';
import {
  DOOR_EXTRAS,
  DOOR_IDS,
  DRAWER_IDS,
  ITEM,
  M0_PARTS,
  MATERIALS,
  PROTOTYPE,
  REVISIONS,
  UNSAFE_UID,
  type Revision,
} from '../src/m0.js';
import { jpegSize } from '../src/texture.js';
import { glbJson, validateGlb } from '../src/validate.js';

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

async function roundTrip(
  rev: Revision,
  opts: { ar?: boolean } = {},
): Promise<{ doc: Document; bytes: Uint8Array }> {
  const bytes = await io.writeBinary(buildM0(rev, opts));
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
const matExtras = (m: Material | null) => uhub<MaterialExtras>(m!);
const labelOf = (m: Material) => MATERIALS[matExtras(m).id as keyof typeof MATERIALS].label;

describe('nom kodlash (2.1)', () => {
  it.each([
    ['', ''],
    ['f', 'my'],
    ['fo', 'mzxq'],
    ['foo', 'mzxw6'],
    ['foob', 'mzxw6yq'],
    ['fooba', 'mzxw6ytb'],
    ['foobar', 'mzxw6ytboi'],
  ])('base32 %j → %j (RFC 4648 test vektorlari)', (text, code) => {
    expect(base32Encode(text)).toBe(code);
    expect(base32Decode(code)).toBe(text);
  });

  // TODO(contract): kontrakt 2.1 misoli `A/1` → `part__xifxte`, lekin RFC 4648 bo'yicha base32("A/1") = "IEXTC===":
  // 0x41 0x2F 0x31 → 01000|00100|10111|10011|0001(0) → i e x t c. Normativ qoida (RFC 4648) ustun — architect'ga savol.
  it('kontraktdagi misol A/1: RFC 4648 bo‘yicha part__xiextc (kontraktda xifxte — misol xatosi)', () => {
    expect(nodeName.part('A/1')).toBe('part__xiextc');
    expect(nodeName.part('A/1')).not.toBe('part__xifxte');
  });

  it('qoida: mos va `__` siz — o‘zi; aks holda x+base32; item va eshik/tortma id’ga ham', () => {
    expect(encodeId('m0p06')).toBe('m0p06');
    expect(encodeId('a_b-c')).toBe('a_b-c');
    expect(encodeId('a__b')).toBe(`x${base32Encode('a__b')}`);
    expect(encodeId('M0')).toBe(`x${base32Encode('M0')}`);
    expect(encodeId('_a')).toBe(`x${base32Encode('_a')}`);
    expect(nodeName.item('Kitchen 1')).toBe(`item__x${base32Encode('Kitchen 1')}`);
    expect(nodeName.door('D/1')).toBe(`pivot__door__x${base32Encode('D/1')}`);
    expect(base32Decode(encodeId(UNSAFE_UID).slice(1))).toBe(UNSAFE_UID);
  });
});

describe.each(Object.keys(REVISIONS) as Revision[])('M-0 %s', (rev) => {
  it('gltf-validator 0 error; kengaytmalar yo‘q (faqat glTF core)', async () => {
    const { bytes } = await roundTrip(rev);
    const report = await validateGlb(bytes);
    expect(report.messages.filter((m) => m.severity === 0)).toEqual([]);
    expect(glbJson(bytes).extensionsUsed ?? []).toEqual([]);
  });

  it('asset.extras.uhub (2.4): contract 1.3, revision_label, approved yo‘q', async () => {
    const { doc } = await roundTrip(rev);
    const meta = (doc.getRoot().getAsset().extras as { uhub: AssetMeta & { approved?: unknown } }).uhub;
    expect(meta).toMatchObject({
      contract: '1.3',
      project_number: ITEM.projectNumber,
      item_id: ITEM.itemId,
      revision_id: REVISIONS[rev].revisionId,
      revision_label: REVISIONS[rev].revisionLabel,
      snapshot: REVISIONS[rev].snapshot,
    });
    expect('approved' in meta).toBe(false);
  });

  it('tugunlar ierarxiyasi va nomlari (2.1)', async () => {
    const { doc } = await roundTrip(rev);
    const [item] = doc.getRoot().listScenes()[0]!.listChildren();
    expect(item!.getName()).toBe('item__m0');
    expect(item!.listChildren().map((n) => n.getName())).toEqual([
      'group__carcass',
      'group__fronts',
      'group__hardware',
    ]);
    expect(
      byName(doc, 'group__fronts')!
        .listChildren()
        .map((n) => n.getName()),
    ).toEqual([
      ...DOOR_IDS.map((id) => `pivot__door__${id}`),
      ...DRAWER_IDS.map((id) => `slide__drawer__${id}`),
    ]);
    for (const id of DRAWER_IDS) {
      expect(parentOf(doc, byName(doc, `slide__drawer__${id}__mid`)!)!.getName()).toBe(
        `slide__drawer__${id}`,
      );
    }
    for (const n of doc.getRoot().listNodes()) expect(n.getName()).toMatch(NODE_NAME_RE);
  });

  it('item dimensions (2.3)', async () => {
    const { doc } = await roundTrip(rev);
    const dims = uhub<{ dimensions: ItemDimensions }>(byName(doc, 'item__m0')!).dimensions;
    expect(dims.overall_mm).toEqual({ width: 600, height: 900, depth: 560 });
    expect(dims.lines.length).toBeGreaterThan(0);
  });

  it('detal extras (2.1): kalitlar, [L,W,T], 4 qirra (matn | null), article null, qalinlik materialda', async () => {
    const { doc } = await roundTrip(rev);
    const parts = partNodes(doc);
    expect(parts).toHaveLength(M0_PARTS.length - REVISIONS[rev].removedUids.length);
    for (const node of parts) {
      const x = uhub<PartExtras>(node);
      expect(Object.keys(x).sort()).toEqual([...PART_KEYS].sort());
      expect(node.getName()).toBe(nodeName.part(x.uid));
      const [l, w, t] = x.size_mm;
      expect(l).toBeGreaterThanOrEqual(w);
      expect(w).toBeGreaterThanOrEqual(t);
      expect(Object.keys(x.edges)).toEqual([...EDGE_KEYS]);
      for (const v of Object.values(x.edges)) expect(v === null || typeof v === 'string').toBe(true);
      expect(x.article).toBeNull();
      expect(x.material).toContain(`${t} mm`); // 1.3: qalinlik matni size_mm[2] bilan mos
      expect(x.qr).toBe(`uhub:p/${ITEM.projectNumber}/${x.uid}/${REVISIONS[rev].snapshot}`);
    }
    expect(parts.find((n) => uhub<PartExtras>(n).uid === UNSAFE_UID)!.getName()).toBe(
      `part__x${base32Encode(UNSAFE_UID)}`,
    );
  });

  it('eshik: extras.uhub.door pivot tugunida (detal tugunida emas)', async () => {
    const { doc } = await roundTrip(rev);
    for (const id of DOOR_IDS) {
      expect(uhub<{ door: DoorExtras }>(byName(doc, `pivot__door__${id}`)!).door).toEqual(DOOR_EXTRAS);
    }
    for (const n of partNodes(doc)) expect('door' in uhub<object>(n)).toBe(false);
  });

  it('materiallar (2.5): mat__<id> bir marta, extras, turlar, shisha BLEND, metall, bo‘yalgan MDF', async () => {
    const { doc } = await roundTrip(rev);
    const mats = doc.getRoot().listMaterials();
    const names = mats.map((m) => m.getName());
    expect(new Set(names).size).toBe(names.length);
    for (const m of mats) {
      expect(m.getName()).toBe(nodeName.material(matExtras(m).id));
      expect(Object.keys(matExtras(m)).sort()).toEqual([
        'code',
        'id',
        'kind',
        'name',
        'supplier',
        'thickness_mm',
      ]);
    }
    const kinds = new Set(mats.map((m) => matExtras(m).kind));
    for (const k of ['ldsp', 'mdf_painted', 'abs', 'metal', 'glass'] as const)
      expect(kinds.has(k)).toBe(true);
    const byKind = (k: string) => mats.find((m) => matExtras(m).kind === k)!;
    expect(byKind('glass').getAlphaMode()).toBe('BLEND');
    expect(byKind('glass').getAlpha()).toBeCloseTo(0.3);
    expect(byKind('metal').getMetallicFactor()).toBe(1);
    expect(byKind('metal').getRoughnessFactor()).toBeCloseTo(0.4);
    expect(byKind('mdf_painted').getRoughnessFactor()).toBeCloseTo(0.8);
    expect(byKind('mdf_painted').getBaseColorTexture()).toBeNull();
    expect(byKind('ldsp').getBaseColorTexture()).not.toBeNull();
  });

  it('teksturalar (2.5): JPEG, ≤ 1024 px, har biri bir marta', async () => {
    const { doc } = await roundTrip(rev);
    const texs = doc.getRoot().listTextures();
    expect(texs.length).toBeGreaterThan(0);
    const seen = new Set<string>();
    for (const t of texs) {
      expect(t.getMimeType()).toBe('image/jpeg');
      const { width, height } = jpegSize(t.getImage()!);
      expect(Math.max(width, height)).toBeLessThanOrEqual(1024);
      const key = Buffer.from(t.getImage()!).toString('base64');
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('panel primitive’lari: yuzalar + L1 L2 W1 W2; kromkasiz qirra — plita materiali', async () => {
    const { doc } = await roundTrip(rev);
    for (const node of partNodes(doc)) {
      const x = uhub<PartExtras>(node);
      const prims = node.getMesh()!.listPrimitives();
      expect(prims).toHaveLength(5);
      const plate = prims[0]!.getMaterial()!;
      expect(labelOf(plate)).toBe(x.material);
      EDGE_KEYS.forEach((k, i) => {
        const m = prims[i + 1]!.getMaterial()!;
        if (x.edges[k] === null) expect(m).toBe(plate);
        else expect(labelOf(m)).toBe(x.edges[k]);
      });
    }
  });

  it('tola: U o‘qi uzunlik bo‘ylab; “Qopqoq” da 90° burilgan (kenglik bo‘ylab)', async () => {
    const { doc } = await roundTrip(rev);
    /** Yuza primitive'ida U qaysi o'q bo'ylab o'zgaradi (0=x, 1=y, 2=z). */
    const uAxis = (name: string) => {
      const prim = byPartName(doc, name).getMesh()!.listPrimitives()[0]!;
      const pos = prim.getAttribute('POSITION')!;
      const uv = prim.getAttribute('TEXCOORD_0')!;
      const p0 = pos.getElement(0, []);
      const u0 = uv.getElement(0, [])[0]!;
      const grads = [0, 0, 0];
      for (let i = 1; i < pos.getCount(); i++) {
        const p = pos.getElement(i, []);
        const du = Math.abs(uv.getElement(i, [])[0]! - u0);
        const moved = [0, 1, 2].filter((a) => Math.abs(p[a]! - p0[a]!) > 1e-6);
        if (moved.length === 1) grads[moved[0]!] = Math.max(grads[moved[0]!]!, du);
      }
      return grads.indexOf(Math.max(...grads));
    };
    expect(uAxis('Tub')).toBe(0); // 564 (x) — uzunlik
    expect(uAxis('Qopqoq')).toBe(2); // tola burilgan → 538 (z) — kenglik
    expect(uAxis('Chap yon devor')).toBe(1); // 900 (y) — uzunlik
  });

  it('kliplar: nomlari, LINEAR, 0.8 s; eshik burchagi pivot.door.open_angle_deg dan', async () => {
    const { doc } = await roundTrip(rev);
    const anims = doc.getRoot().listAnimations();
    expect(anims.map((a) => a.getName()).sort()).toEqual(
      ['door__d1__open', 'drawer__d2__open', 'drawer__d3__open', 'drawer__d4__open', 'all__open'].sort(),
    );
    const nodes = new Set(doc.getRoot().listNodes());
    for (const a of anims) {
      for (const ch of a.listChannels()) {
        expect(nodes.has(ch.getTargetNode()!)).toBe(true);
        expect(ch.getSampler()!.getInterpolation()).toBe('LINEAR');
        expect(ch.getSampler()!.getInput()!.getMax([])[0]).toBeCloseTo(0.8);
      }
    }
    const ch = anims.find((a) => a.getName() === 'door__d1__open')!.listChannels()[0]!;
    expect(ch.getTargetNode()!.getName()).toBe('pivot__door__d1');
    const q = ch.getSampler()!.getOutput()!.getElement(1, []);
    expect((2 * Math.acos(Math.min(1, Math.abs(q[3]!))) * 180) / Math.PI).toBeCloseTo(
      DOOR_EXTRAS.open_angle_deg,
      3,
    );
  });

  it('tortma klipi: slide to‘liq yurish +Z, __mid dunyoda yarmi (2.2)', async () => {
    const { doc } = await roundTrip(rev);
    const travel = PROTOTYPE.drawerTravelMm / 1000;
    for (const id of DRAWER_IDS) {
      const chans = doc
        .getRoot()
        .listAnimations()
        .find((a) => a.getName() === `drawer__${id}__open`)!
        .listChannels();
      const endZ = (name: string) =>
        chans
          .find((c) => c.getTargetNode()!.getName() === name)!
          .getSampler()!
          .getOutput()!
          .getElement(1, [])[2]!;
      expect(endZ(`slide__drawer__${id}`)).toBeCloseTo(travel);
      expect(endZ(`slide__drawer__${id}`) + endZ(`slide__drawer__${id}__mid`)).toBeCloseTo(travel / 2);
    }
  });

  it('reveal: polka (shisha) → eshik, tortma tubi → tortma; metall tutqich fasad tuguni ichida', async () => {
    const { doc } = await roundTrip(rev);
    expect(uhub<PartExtras>(byPartName(doc, 'Polka')).reveal).toEqual(['door__d1__open']);
    for (const [i, id] of DRAWER_IDS.entries()) {
      const bottom = byPartName(doc, `Tortma ${i + 1} tubi`);
      expect(uhub<PartExtras>(bottom).reveal).toEqual([`drawer__${id}__open`]);
      expect(parentOf(doc, bottom)!.getName()).toBe(`slide__drawer__${id}`);
    }
    const handle = byPartName(doc, 'Eshik').listChildren()[0]!;
    expect(handle.getName()).toMatch(/^hw__.+__handle$/);
    expect(matExtras(handle.getMesh()!.listPrimitives()[0]!.getMaterial()).kind).toBe('metal');
  });
});

/** Sahna bounding box'i (dunyo koordinatalarida, metr). */
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

describe.each(Object.keys(REVISIONS) as Revision[])('M-0 %s — AR varianti', (rev) => {
  it('animatsiyasiz, validator 0 error, o‘sha materiallar; bounding box asosiy GLB bilan ±0.1 mm', async () => {
    const ar = await roundTrip(rev, { ar: true });
    const main = await roundTrip(rev);
    expect(ar.doc.getRoot().listAnimations()).toHaveLength(0);
    expect((await validateGlb(ar.bytes)).numErrors).toBe(0);
    const matNames = (d: Document) =>
      d
        .getRoot()
        .listMaterials()
        .map((m) => m.getName());
    expect(matNames(ar.doc)).toEqual(matNames(main.doc));
    const a = sceneBounds(ar.doc);
    const b = sceneBounds(main.doc);
    for (let i = 0; i < 3; i++) {
      expect(Math.abs(a.min[i]! - b.min[i]!)).toBeLessThanOrEqual(0.0001);
      expect(Math.abs(a.max[i]! - b.max[i]!)).toBeLessThanOrEqual(0.0001);
    }
  });
});

describe('og‘ir namuna m0-heavy.glb (integratsiya hujjati 5.5)', () => {
  it('chegara yaqinida: 10–15 MB, ≤ 150 000 uchburchak, 1024 px teksturalar, validator 0 error', async () => {
    const bytes = await io.writeBinary(buildHeavy());
    const doc = await io.readBinary(bytes);
    expect(bytes.byteLength).toBeLessThanOrEqual(15 * 1024 * 1024);
    expect(bytes.byteLength).toBeGreaterThanOrEqual(10 * 1024 * 1024);
    let tris = 0;
    for (const m of doc.getRoot().listMeshes())
      for (const p of m.listPrimitives()) tris += p.getIndices()!.getCount() / 3;
    expect(tris).toBeLessThanOrEqual(150_000);
    expect(tris).toBeGreaterThan(100_000);
    for (const t of doc.getRoot().listTextures()) expect(jpegSize(t.getImage()!).width).toBe(1024);
    expect(HEAVY_SEGMENTS).toBeGreaterThan(1);
    expect((await validateGlb(bytes)).numErrors).toBe(0);
    expect(glbJson(bytes).extensionsUsed ?? []).toEqual([]);
  }, 60_000);
});
