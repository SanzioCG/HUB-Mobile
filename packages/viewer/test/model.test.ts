import { beforeAll, describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { AnimationClip, Group, Mesh, Object3D, Vector3 } from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildM0 } from '@hub-mobile/sample-glb/build';
import type { PartExtras } from '../src/bridge.js';
import { ClipPlayer } from '../src/clips.js';
import {
  findClip,
  findItemNode,
  findPartAncestor,
  indexParts,
  isOpenableClip,
  openableClipNames,
  ownClipName,
  partExtras,
  revealPlan,
} from '../src/model.js';

let gltf: GLTF;

beforeAll(async () => {
  const bytes = await new NodeIO().writeBinary(buildM0('r3'));
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  gltf = await new GLTFLoader().parseAsync(buf, '');
});

const extras = (reveal: string[]): PartExtras => ({
  kind: 'panel',
  uid: 'x',
  number: '1',
  name: 'x',
  material: '',
  size_mm: [1, 1, 1],
  edges: {},
  article: null,
  reveal,
  qr: '',
});

describe('klip nomini topish', () => {
  it('M-0 kliplari nomi bo‘yicha topiladi', () => {
    for (const name of [
      'door__d1__open',
      'drawer__d2__open',
      'drawer__d3__open',
      'drawer__d4__open',
      'all__open',
    ]) {
      expect(findClip(gltf.animations, name)?.name).toBe(name);
    }
    expect(findClip(gltf.animations, 'door__d9__open')).toBeUndefined();
  });

  it('ochiladigan kliplar: door__/drawer__, all__open kirmaydi; tartib GLB indeksiga bog‘liq emas', () => {
    expect(openableClipNames(gltf.animations).sort()).toEqual([
      'door__d1__open',
      'drawer__d2__open',
      'drawer__d3__open',
      'drawer__d4__open',
    ]);
    const reversed = [...gltf.animations].reverse();
    expect(openableClipNames(reversed).sort()).toEqual(openableClipNames(gltf.animations).sort());
    expect(isOpenableClip('all__open')).toBe(false);
    expect(isOpenableClip('slide__door__a__open')).toBe(false);
  });
});

describe('detal tugunini uid bo‘yicha topish (kontrakt 1.2)', () => {
  it('M-0: har detal mesh’i o‘z detaliga olib boradi; rels (__mid) detal emas', () => {
    const parts = indexParts(gltf.scene);
    expect(parts.size).toBe(22);
    const seen = new Set<string>();
    gltf.scene.traverse((o) => {
      if (!(o as Mesh).isMesh) return;
      const part = findPartAncestor(o);
      const inRail = /__mid$/.test(o.parent?.name ?? '') || /__mid$/.test(o.name);
      if (inRail) {
        expect(part).toBeNull();
        return;
      }
      expect(parts.get(partExtras(part!)!.uid)).toBe(part);
      seen.add(partExtras(part!)!.uid);
    });
    expect(seen.size).toBe(22);
    expect(findItemNode(gltf.scene)?.name).toBe('item__m0');
  });

  it('ruxsat etilmagan belgili uid (A1/B2.c) uid bo‘yicha topiladi, tugun nomi kodlangan', () => {
    const node = indexParts(gltf.scene).get('A1/B2.c')!;
    expect(node).toBeDefined();
    expect(node.name).toMatch(/^part__x[a-z2-7]+$/);
    expect(findPartAncestor(node)).toBe(node);
  });

  it('nomi part__ bo‘lmagan, lekin extras.uhub.uid bor tugun ham detal', () => {
    const root = new Group();
    const p = new Group();
    p.name = 'anything';
    p.userData = { uhub: { ...extras([]), uid: 'q1' } };
    const child = new Object3D();
    p.add(child);
    root.add(p);
    expect(indexParts(root).get('q1')).toBe(p);
    expect(findPartAncestor(child)).toBe(p);
  });

  it('chuqur bola (furnitura, kontur chizig‘i) → eng yaqin part__', () => {
    const part = new Group();
    part.name = 'part__abc';
    part.userData = { uhub: extras([]) };
    const hinge = new Object3D();
    const screw = new Object3D();
    part.add(hinge);
    hinge.add(screw);
    expect(findPartAncestor(screw)).toBe(part);
  });

  it('part__ bo‘lmasa yoki extras yo‘q bo‘lsa → null', () => {
    const pivot = new Group();
    pivot.name = 'pivot__door__d1';
    const fake = new Group();
    fake.name = 'part__noextras';
    pivot.add(fake);
    expect(findPartAncestor(fake)).toBeNull();
    expect(findPartAncestor(null)).toBeNull();
  });

  it('uid extras’dan olinadi, tugun nomidan emas', () => {
    const root = new Group();
    const p = new Group();
    p.name = 'part__encoded_uid';
    p.userData = { uhub: { ...extras([]), uid: 'A/1' } };
    root.add(p);
    expect(indexParts(root).get('A/1')).toBe(p);
  });
});

describe('reveal tartibi', () => {
  const available = new Set(['door__d1__open', 'drawer__d2__open', 'drawer__d3__open']);

  it('ro‘yxat tartibi saqlanadi', () => {
    expect(revealPlan(extras(['drawer__d3__open', 'door__d1__open', 'drawer__d2__open']), available)).toEqual(
      {
        clips: ['drawer__d3__open', 'door__d1__open', 'drawer__d2__open'],
        missing: [],
      },
    );
  });

  it('takrorlar olib tashlanadi, GLB’da yo‘q klip alohida', () => {
    expect(revealPlan(extras(['door__d1__open', 'door__d9__open', 'door__d1__open']), available)).toEqual({
      clips: ['door__d1__open'],
      missing: ['door__d9__open'],
    });
  });

  it('bo‘sh reveal — tashqi detal', () => {
    expect(revealPlan(extras([]), available)).toEqual({ clips: [], missing: [] });
  });

  it('M-0: polka → eshik, tortma tubi → tortma', () => {
    const parts = [...indexParts(gltf.scene).values()].map((o) => partExtras(o)!);
    const names = new Set(openableClipNames(gltf.animations));
    expect(
      revealPlan(
        parts.find((p) => p.name === 'Polka')!,
        names,
      ).clips,
    ).toEqual(['door__d1__open']);
    expect(
      revealPlan(
        parts.find((p) => p.name === 'Tortma 1 tubi')!,
        names,
      ).clips,
    ).toEqual(['drawer__d2__open']);
  });
});

describe('eshik/tortma klipi (ownClipName)', () => {
  it('M-0: eshik → door__d1__open, tortma qismlari → drawer__dN__open, korpus → null', () => {
    const parts = [...indexParts(gltf.scene).values()];
    const byName = (n: string) => parts.find((p) => partExtras(p)!.name === n)!;
    expect(ownClipName(byName('Eshik'))).toBe('door__d1__open');
    expect(ownClipName(byName('Tortma 1 fasadi'))).toBe('drawer__d2__open');
    expect(ownClipName(byName('Tortma 3 tubi'))).toBe('drawer__d4__open');
    expect(ownClipName(byName('Polka'))).toBeNull();
    expect(ownClipName(null)).toBeNull();
    const mid = gltf.scene.getObjectByName('slide__drawer__d3__mid')!;
    expect(ownClipName(mid)).toBe('drawer__d3__open');
  });
});

describe('ClipPlayer (M-0)', () => {
  const step = (p: ClipPlayer, seconds: number) => {
    for (let t = 0; t < seconds; t += 1 / 60) p.update(1 / 60);
  };
  const node = (name: string) => gltf.scene.getObjectByName(name)!;
  const doorYaw = () => node('pivot__door__d1').quaternion.y;
  const drawerZ = () => node('slide__drawer__d2').position.z;

  it('ochish oldinga, yopish teskari; eshik Y atrofida, tortma +Z', async () => {
    const p = new ClipPlayer(gltf.scene, gltf.animations);
    step(p, 0.05);
    expect(doorYaw()).toBeCloseTo(0);
    const opened = p.play('door__d1__open', 1);
    step(p, 1);
    await opened;
    expect(node('pivot__door__d1').quaternion.angleTo(new Object3D().quaternion)).toBeCloseTo(
      (105 * Math.PI) / 180,
      2,
    );
    const closed = p.play('door__d1__open', -1);
    step(p, 1);
    await closed;
    expect(doorYaw()).toBeCloseTo(0);

    void p.play('drawer__d2__open', 1);
    step(p, 1);
    expect(drawerZ()).toBeCloseTo(0.45);
    expect(new Vector3(0, 0, 1).dot(node('slide__drawer__d2').position)).toBeGreaterThan(0);
    p.dispose();
  });

  it('bitta eshik ochiq turganda "hammasini ochish" sakrashsiz', () => {
    const p = new ClipPlayer(gltf.scene, gltf.animations);
    void p.play('door__d1__open', 1);
    step(p, 1);
    const before = node('pivot__door__d1').quaternion.clone();
    void p.playAll(1);
    p.update(1 / 60);
    const after = node('pivot__door__d1').quaternion;
    for (const k of ['x', 'y', 'z', 'w'] as const) expect(after[k]).toBeCloseTo(before[k], 5);
    expect(drawerZ()).toBeGreaterThan(0);
    expect(drawerZ()).toBeLessThan(0.45);
    step(p, 1);
    expect(p.names.every((n) => p.isOpen(n))).toBe(true);
    p.dispose();
  });

  it('reveal ketma-ket: keyingi klip oldingisi tugagach boshlanadi', async () => {
    const p = new ClipPlayer(gltf.scene, gltf.animations);
    const seq = p.openSequence(['door__d1__open', 'drawer__d2__open']);
    step(p, 0.4); // eshik yarmida, tortma hali joyida
    expect(drawerZ()).toBeCloseTo(0);
    step(p, 0.5); // eshik tugadi → tortma boshlanadi
    await Promise.resolve();
    step(p, 1);
    await expect(seq).resolves.toBe(true);
    expect(p.isOpen('door__d1__open') && p.isOpen('drawer__d2__open')).toBe(true);
    expect(drawerZ()).toBeCloseTo(0.45);
    p.dispose();
  });

  it('reveal ketma-ketligi bekor qilinsa keyingi klip boshlanmaydi', async () => {
    const p = new ClipPlayer(gltf.scene, gltf.animations);
    void p.playAll(-1);
    step(p, 1);
    let cancel = false;
    const seq = p.openSequence(['door__d1__open', 'drawer__d3__open'], () => cancel);
    cancel = true;
    step(p, 1);
    await expect(seq).resolves.toBe(false);
    expect(p.isOpen('drawer__d3__open')).toBe(false);
    p.dispose();
  });

  it('tortma ochilganda __mid dunyoda yurishning yarmida', () => {
    const p = new ClipPlayer(gltf.scene, gltf.animations);
    void p.play('drawer__d2__open', 1);
    step(p, 1);
    gltf.scene.updateMatrixWorld(true);
    const mid = node('slide__drawer__d2__mid').getWorldPosition(new Vector3());
    const slide = node('slide__drawer__d2').getWorldPosition(new Vector3());
    expect(slide.z).toBeCloseTo(0.45);
    expect(mid.z).toBeCloseTo(0.225);
    p.dispose();
  });

  it('all__open ishlatilmaydi', () => {
    const p = new ClipPlayer(gltf.scene, gltf.animations);
    expect(p.has('all__open')).toBe(false);
    expect(p.names.sort()).toEqual(openableClipNames(gltf.animations).sort());
    p.dispose();
  });

  it('o‘rtada yo‘nalish almashsa sakramaydi', () => {
    const p = new ClipPlayer(gltf.scene, gltf.animations);
    void p.play('drawer__d2__open', 1);
    step(p, 0.4);
    const mid = drawerZ();
    void p.play('drawer__d2__open', -1);
    p.update(1 / 60);
    expect(Math.abs(drawerZ() - mid)).toBeLessThan(0.02);
    p.dispose();
  });

  it('noma’lum klip — xatosiz e’tiborsiz', async () => {
    const p = new ClipPlayer(gltf.scene, [new AnimationClip('door__zz__open', 1, [])]);
    await expect(p.play('drawer__nope__open', 1)).resolves.toBeUndefined();
    p.dispose();
  });
});
