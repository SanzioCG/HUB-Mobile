// M-A5, 1b: ochilish zonalari — klipdan olinadi, oxirgi va yopiq holatni qamraydi, pozani va masshtabni o'zgartirmaydi.
import { beforeAll, describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { AnimationMixer, Box3, LoopOnce, type Mesh, type Object3D, Vector3 } from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildM0 } from '@hub-mobile/sample-glb/build';
import { openableClipNames } from '../src/model.js';
import { buildZoneMeshes, computeZones, movingNodeName, zoneContains, type Zone } from '../src/zones.js';

let gltf: GLTF;

beforeAll(async () => {
  const doc = buildM0('r5');
  for (const t of doc.getRoot().listTextures()) t.dispose();
  const bytes = await new NodeIO().writeBinary(doc);
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  gltf = await new GLTFLoader().parseAsync(buf, '');
});

/** Tugun ostidagi har mesh geometriyasi bounding box burchaklari (dunyo fazosida, ildiz identik). */
function meshCorners(node: Object3D): Vector3[] {
  node.updateMatrixWorld(true);
  const out: Vector3[] = [];
  node.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.computeBoundingBox();
    const { min: a, max: b } = mesh.geometry.boundingBox!;
    for (const x of [a.x, b.x])
      for (const y of [a.y, b.y])
        for (const z of [a.z, b.z]) out.push(new Vector3(x, y, z).applyMatrix4(mesh.matrixWorld));
  });
  return out;
}

/** Klipni t (0…1) holatiga qo'yib, `fn` ni chaqiradi, keyin yopiq holatga qaytaradi. */
function atClip(clipName: string, t: number, fn: () => void): void {
  const clip = gltf.animations.find((c) => c.name === clipName)!;
  const mixer = new AnimationMixer(gltf.scene);
  const a = mixer.clipAction(clip);
  a.setLoop(LoopOnce, 1);
  a.clampWhenFinished = true;
  a.play();
  a.time = clip.duration * t;
  mixer.update(0);
  gltf.scene.updateMatrixWorld(true);
  fn();
  a.time = 0;
  mixer.update(0);
  mixer.stopAllAction();
  mixer.uncacheRoot(gltf.scene);
  gltf.scene.updateMatrixWorld(true);
}

const poseOf = (root: Object3D) => {
  root.updateMatrixWorld(true);
  const m = new Map<string, number[]>();
  root.traverse((o) => m.set(o.uuid, o.matrixWorld.toArray()));
  return m;
};

describe('ochilish zonalari', () => {
  let zones: Zone[];
  beforeAll(() => {
    zones = computeZones(gltf.scene, gltf.animations);
  });

  it('har ochiladigan klip uchun bitta zona; __mid uchun alohida zona yo‘q', () => {
    expect(zones.map((z) => z.clip).sort()).toEqual(openableClipNames(gltf.animations).sort());
    expect(zones.filter((z) => z.kind === 'door')).toHaveLength(1);
    expect(zones.filter((z) => z.kind === 'drawer')).toHaveLength(3);
    expect(zones.some((z) => z.clip.includes('__mid'))).toBe(false);
  });

  it('zona yopiq holatdagi tugundan boshlanadi va klipning oxirgi holatini to‘liq qamraydi', () => {
    for (const z of zones) {
      const node = gltf.scene.getObjectByName(movingNodeName(z.clip)!)!;
      for (const p of meshCorners(node)) expect(zoneContains(z, p), `${z.clip} yopiq`).toBe(true);
      atClip(z.clip, 1, () => {
        for (const p of meshCorners(node)) expect(zoneContains(z, p), `${z.clip} ochiq`).toBe(true);
      });
    }
  });

  it('tortma relsi (__mid, yarim yurish) tortma zonasi ichida', () => {
    for (const z of zones.filter((x) => x.kind === 'drawer')) {
      const mid = gltf.scene.getObjectByName(`${movingNodeName(z.clip)!}__mid`);
      expect(mid, z.clip).toBeDefined();
      atClip(z.clip, 1, () => {
        for (const p of meshCorners(mid!)) expect(zoneContains(z, p)).toBe(true);
      });
    }
  });

  it('eshik zonasi burchagi klipdan: ochilish burchagiga yaqin (105°), yoy radiusi eshik enidan kam emas', () => {
    const door = zones.find((z) => z.kind === 'door')!;
    if (door.kind !== 'door') throw new Error('eshik zonasi yo‘q');
    const deg = ((door.a1 - door.a0) * 180) / Math.PI;
    expect(deg).toBeGreaterThan(100);
    expect(deg).toBeLessThan(115);
    expect(door.radius).toBeGreaterThan(0.2);
  });

  it('pozani va masshtabni o‘zgartirmaydi; zonalar buyum ildiziga qo‘shilmaydi', () => {
    const before = poseOf(gltf.scene);
    const sizeBefore = new Box3().setFromObject(gltf.scene).getSize(new Vector3());
    const again = computeZones(gltf.scene, gltf.animations);
    const group = buildZoneMeshes(again, 0);
    const after = poseOf(gltf.scene);
    for (const [k, v] of before) for (let i = 0; i < 16; i++) expect(after.get(k)![i]).toBeCloseTo(v[i]!, 9);
    expect(group.parent).toBeNull();
    expect(new Box3().setFromObject(gltf.scene).getSize(new Vector3()).distanceTo(sizeBefore)).toBeLessThan(
      1e-9,
    );
    expect(gltf.scene.scale.toArray()).toEqual([1, 1, 1]);
    expect(group.children.length).toBeGreaterThan(0);
  });
});
