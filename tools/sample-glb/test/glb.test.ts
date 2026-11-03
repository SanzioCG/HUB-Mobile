// Generator chiqargan GLB'ni qayta o'qib, kontrakt 2-bo'limiga qarshi tekshiradi.
import { describe, expect, it } from 'vitest';
import { NodeIO, type Document, type Node } from '@gltf-transform/core';
import { buildM0 } from '../src/build.js';
import { NODE_NAME_RE, type AssetMeta, type ItemDimensions, type PartExtras } from '../src/contract.js';
import { DOOR_IDS, DRAWER_IDS, ITEM, M0_PARTS, REVISIONS, type Revision } from '../src/m0.js';
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

describe.each(Object.keys(REVISIONS) as Revision[])('M-0 %s', (rev) => {
  it('gltf-validator: 0 error', async () => {
    const { bytes } = await roundTrip(rev);
    const report = await validateGlb(bytes);
    expect(report.messages.filter((m) => m.severity === 0)).toEqual([]);
  });

  it('asset.extras.uhub (2.4)', async () => {
    const { doc } = await roundTrip(rev);
    const meta = (doc.getRoot().getAsset().extras as { uhub: AssetMeta }).uhub;
    expect(meta).toMatchObject({
      contract: '1.1',
      project_number: ITEM.projectNumber,
      item_id: ITEM.itemId,
      revision_id: REVISIONS[rev].revisionId,
      snapshot: REVISIONS[rev].snapshot,
      approved: false,
    });
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
    for (const n of doc.getRoot().listNodes()) expect(n.getName()).toMatch(NODE_NAME_RE);
  });

  it('item dimensions (2.3)', async () => {
    const { doc } = await roundTrip(rev);
    const dims = uhub<{ dimensions: ItemDimensions }>(byName(doc, 'item__m0')!).dimensions;
    expect(dims.overall_mm).toEqual({ width: 600, height: 900, depth: 560 });
    expect(dims.lines.length).toBeGreaterThan(0);
  });

  it("har part__ tugunida to'liq extras.uhub", async () => {
    const { doc } = await roundTrip(rev);
    const parts = doc
      .getRoot()
      .listNodes()
      .filter((n) => n.getName().startsWith('part__'));
    const removed = REVISIONS[rev].removedUids;
    expect(parts).toHaveLength(M0_PARTS.length - removed.length);
    for (const node of parts) {
      const x = uhub<PartExtras>(node);
      expect(Object.keys(x).sort()).toEqual([...PART_KEYS].sort());
      expect(node.getName()).toBe(`part__${x.uid}`);
      expect(x.qr).toBe(`uhub:p/${ITEM.projectNumber}/${x.uid}/${REVISIONS[rev].snapshot}`);
      expect(x.size_mm).toHaveLength(3);
      expect(node.getMesh()).not.toBeNull();
    }
    for (const uid of removed) expect(byName(doc, `part__${uid}`)).toBeUndefined();
  });

  it('kliplar mavjud va mavjud tugunlarni nishonga oladi (2.2)', async () => {
    const { doc } = await roundTrip(rev);
    const anims = doc.getRoot().listAnimations();
    const names = anims.map((a) => a.getName());
    expect(names.sort()).toEqual(
      [
        ...DOOR_IDS.map((id) => `door__${id}__open`),
        ...DRAWER_IDS.map((id) => `drawer__${id}__open`),
        'all__open',
      ].sort(),
    );
    const nodes = new Set(doc.getRoot().listNodes());
    for (const a of anims) {
      for (const ch of a.listChannels()) {
        const target = ch.getTargetNode();
        expect(target && nodes.has(target)).toBe(true);
        expect(ch.getSampler()!.getInterpolation()).toBe('LINEAR');
        const input = ch.getSampler()!.getInput()!;
        expect(input.getMax([])[0]).toBeCloseTo(0.8);
      }
    }
    for (const id of DOOR_IDS) {
      const ch = anims.find((a) => a.getName() === `door__${id}__open`)!.listChannels()[0]!;
      expect(ch.getTargetNode()!.getName()).toBe(`pivot__door__${id}`);
      expect(ch.getTargetPath()).toBe('rotation');
    }
    for (const id of DRAWER_IDS) {
      const ch = anims.find((a) => a.getName() === `drawer__${id}__open`)!.listChannels()[0]!;
      expect(ch.getTargetNode()!.getName()).toBe(`slide__drawer__${id}`);
      expect(ch.getTargetPath()).toBe('translation');
      const out = ch.getSampler()!.getOutput()!;
      expect(out.getElement(1, [])[2]).toBeGreaterThan(0); // +Z
    }
  });

  it("reveal dagi har klip mavjud va detal o'sha klip tuguni ichida yoki uning orqasida", async () => {
    const { doc } = await roundTrip(rev);
    const clips = new Set(
      doc
        .getRoot()
        .listAnimations()
        .map((a) => a.getName()),
    );
    for (const node of doc
      .getRoot()
      .listNodes()
      .filter((n) => n.getName().startsWith('part__'))) {
      const x = uhub<PartExtras>(node);
      for (const c of x.reveal) expect(clips.has(c)).toBe(true);
    }
    const shelf = doc
      .getRoot()
      .listNodes()
      .find((n) => uhub<PartExtras>(n)?.name === 'Polka')!;
    expect(uhub<PartExtras>(shelf).reveal).toEqual(['door__d1__open']);
    for (const [i, id] of DRAWER_IDS.entries()) {
      const bottom = doc
        .getRoot()
        .listNodes()
        .find((n) => uhub<PartExtras>(n)?.name === `Tortma ${i + 1} tubi`)!;
      expect(uhub<PartExtras>(bottom).reveal).toEqual([`drawer__${id}__open`]);
      expect(parentOf(doc, bottom)!.getName()).toBe(`slide__drawer__${id}`);
    }
    const door = doc
      .getRoot()
      .listNodes()
      .find((n) => uhub<PartExtras>(n)?.kind === 'door')!;
    expect(uhub<PartExtras>(door).reveal).toEqual([]);
  });
});
