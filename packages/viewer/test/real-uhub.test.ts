// M-A7, 5-qism: haqiqiy U-HUB V-1a eksporti (repoga kirmaydi). UHUB_REAL_FILE berilmasa — skip (gate'da ko'rinadi).
// UHUB_REAL_CARDS — U-HUB detal kartalari (cards.json): raqam, nom, size_mm GLB bilan solishtiriladi.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { type Object3D, PropertyBinding } from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { DoorInfo, PartExtras } from '../src/bridge.js';
import { ClipPlayer } from '../src/clips.js';
import { doorInfo, indexParts, openableClipNames, ownClipName, partExtras } from '../src/model.js';
import { RevealIndex } from '../src/sequence.js';
import { openUhub, type UhubFile, type UhubItem } from '../src/uhub.js';

const FILE = process.env.UHUB_REAL_FILE;
const CARDS = process.env.UHUB_REAL_CARDS;

interface Loaded {
  item: UhubItem;
  gltf: GLTF;
  parts: Map<string, Object3D>;
}

let file: UhubFile;
let loaded: Loaded[];

/** Node'da GLTFLoader JPEG ocha olmaydi — teksturalar olib tashlanadi (geometriya, extras, kliplar qoladi). */
async function parse(glb: Uint8Array): Promise<GLTF> {
  const io = new NodeIO();
  const doc = await io.readBinary(glb);
  for (const t of doc.getRoot().listTextures()) t.dispose();
  const bytes = await io.writeBinary(doc);
  return new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    '',
  );
}

const byName = (name: string) => loaded.find((l) => l.item.name === name)!;
const extrasByName = (l: Loaded, name: string) =>
  [...l.parts.values()].map(partExtras).find((x) => x?.name === name)!;
const ownClip = (l: Loaded, uid: string) => ownClipName(l.parts.get(uid)!);

describe.skipIf(!FILE)('haqiqiy V-1a fayli (UHUB_REAL_FILE)', () => {
  beforeAll(async () => {
    file = openUhub(new Uint8Array(readFileSync(FILE!)));
    loaded = [];
    for (const item of file.index.items) {
      const gltf = await parse(file.files.get(item.glb)!);
      loaded.push({ item, gltf, parts: indexParts(gltf.scene) });
    }
  });

  it('ochiladi: 2 buyum, uid’lar index bilan mos, kontrakt 1.x', () => {
    expect(file.index.items.map((i) => i.name).sort()).toEqual(['Shkaf 1200', 'Shkaf 600']);
    expect(file.index.contract.split('.')[0]).toBe('1');
    for (const l of loaded) expect([...l.parts.keys()].sort()).toEqual(l.item.parts.map((p) => p.uid).sort());
  });

  it('kliplar nomi bo‘yicha topiladi, har klip mavjud tugunni nishonga oladi', () => {
    for (const l of loaded) {
      expect(openableClipNames(l.gltf.animations).length).toBeGreaterThan(0);
      for (const clip of l.gltf.animations)
        for (const track of clip.tracks) {
          const { nodeName } = PropertyBinding.parseTrackName(track.name);
          expect(l.gltf.scene.getObjectByName(nodeName!), `${clip.name}: ${track.name}`).toBeDefined();
        }
    }
  });

  it('"Shkaf 600": 1 eshik, 2 tortma; ichki tortma reveal = [eshik, tortma], tashqisi eshikka tegmaydi', () => {
    const s = byName('Shkaf 600');
    const clips = openableClipNames(s.gltf.animations);
    const doors = clips.filter((c) => c.startsWith('door__'));
    const drawers = clips.filter((c) => c.startsWith('drawer__'));
    expect(doors).toHaveLength(1);
    expect(drawers).toHaveLength(2);
    const inner = extrasByName(s, 'Tortma fasadi 2');
    const outer = extrasByName(s, 'Tortma fasadi 1');
    const innerClip = ownClip(s, inner.uid)!;
    expect(inner.reveal).toEqual([doors[0], innerClip]);
    expect(outer.reveal).not.toContain(doors[0]);
  });

  it('ichki tortma tartibi (2.2): ochish — eshik, keyin tortma; yopish — teskari; eshikni yopish — avval tortma', () => {
    const s = byName('Shkaf 600');
    const clips = new ClipPlayer(s.gltf.scene, s.gltf.animations);
    const idx = new RevealIndex(
      [...s.parts.values()].map((n) => {
        const x = partExtras(n)!;
        return { clip: ownClipName(n), kind: x.kind, reveal: x.reveal ?? [] };
      }),
      clips.names,
    );
    const door = clips.names.find((c) => c.startsWith('door__'))!;
    const inner = ownClip(s, extrasByName(s, 'Tortma fasadi 2').uid)!;
    const outer = ownClip(s, extrasByName(s, 'Tortma fasadi 1').uid)!;
    const flat = (p: ReturnType<RevealIndex['planOpen']>) =>
      p.map((st) => st.map((m) => `${m.dir > 0 ? '+' : '-'}${m.clip}`));
    const none = () => false;
    expect(flat(idx.planOpen(inner, none))).toEqual([[`+${door}`], [`+${inner}`]]);
    expect(flat(idx.planClose(inner, (c) => c === door || c === inner))).toEqual([
      [`-${inner}`],
      [`-${door}`],
    ]);
    expect(flat(idx.planClose(door, (c) => c === door || c === inner))).toEqual([
      [`-${inner}`],
      [`-${door}`],
    ]);
    expect(flat(idx.planOpen(outer, none))).toEqual([[`+${outer}`]]);
    clips.dispose();
  });

  it('ichki tortma: ijroda tortma eshik tugaguncha qimirlamaydi', async () => {
    const s = byName('Shkaf 600');
    const clips = new ClipPlayer(s.gltf.scene, s.gltf.animations);
    const door = clips.names.find((c) => c.startsWith('door__'))!;
    const inner = ownClip(s, extrasByName(s, 'Tortma fasadi 2').uid)!;
    const slide = s.gltf.scene.getObjectByName(`slide__${inner.replace(/__open$/, '')}`)!;
    const z0 = slide.position.z;
    const done = clips.run([[{ clip: door, dir: 1 }], [{ clip: inner, dir: 1 }]]);
    clips.update(0.4); // eshik yarmida
    await Promise.resolve();
    clips.update(0);
    expect(slide.position.z).toBeCloseTo(z0, 6);
    for (let i = 0; i < 20; i++) {
      clips.update(0.1);
      await new Promise((r) => setTimeout(r, 0));
    }
    expect(await done).toBe(true);
    expect(slide.position.z).toBeGreaterThan(z0 + 0.1);
    clips.dispose();
  });

  it('"Shkaf 1200": 2 eshik, hinge_side left/right, leaf 1/2', () => {
    const s = byName('Shkaf 1200');
    const doors = openableClipNames(s.gltf.animations).filter((c) => c.startsWith('door__'));
    expect(doors).toHaveLength(2);
    const infos: DoorInfo[] = [];
    s.gltf.scene.traverse((o) => {
      if (o.name.startsWith('pivot__door__')) infos.push(doorInfo(o)!);
    });
    expect(infos.map((d) => d.hinge_side).sort()).toEqual(['left', 'right']);
    expect(infos.map((d) => d.leaf).sort()).toEqual([1, 2]);
    expect(infos.every((d) => d.leaves === 2)).toBe(true);
  });

  it.skipIf(!CARDS)('detal raqami, nomi va size_mm — cards.json (U-HUB kartalari) bilan bir xil', () => {
    const cards = JSON.parse(readFileSync(CARDS!, 'utf8')) as {
      item: string;
      uid: string;
      number: string;
      name: string;
      size_mm: number[];
    }[];
    const glb = new Map<string, PartExtras>();
    for (const l of loaded) for (const [uid, node] of l.parts) glb.set(uid, partExtras(node)!);
    const diffs: string[] = [];
    for (const c of cards) {
      const x = glb.get(c.uid);
      if (!x) {
        diffs.push(`${c.number} ${c.name}: GLB'da yo'q`);
        continue;
      }
      if (x.number !== c.number) diffs.push(`${c.uid}: raqam ${x.number} ≠ ${c.number}`);
      if (x.name !== c.name) diffs.push(`${c.uid}: nom "${x.name}" ≠ "${c.name}"`);
      if (JSON.stringify(x.size_mm) !== JSON.stringify(c.size_mm))
        diffs.push(`${c.uid}: size_mm ${JSON.stringify(x.size_mm)} ≠ ${JSON.stringify(c.size_mm)}`);
    }
    const missing = [...glb.keys()].filter((uid) => !cards.some((c) => c.uid === uid));
    for (const uid of missing) diffs.push(`${uid}: cards.json da yo'q`);
    expect(diffs).toEqual([]);
    expect(cards.length).toBe(glb.size);
  });
});
