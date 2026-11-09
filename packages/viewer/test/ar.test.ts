// M-A5: AR rejimi — konfiguratsiya, overlay tugmalari, joylashtirish/aylantirish matematikasi, masshtab, beforexrselect.
import { beforeAll, describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { Box3, Group, type Mesh, Vector3 } from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildM0 } from '@hub-mobile/sample-glb/build';
import { clipButtons, faceYaw, guardXrSelect, placeAnchor, twistYaw, wrapAngle } from '../src/ar-math.js';
import { featureLine } from '../src/ar-ui.js';
import { parseIncoming } from '../src/bridge.js';
import { findItemNode, openableClipNames, parseUhubConfig } from '../src/model.js';

let gltf: GLTF;

beforeAll(async () => {
  // Node'da GLTFLoader JPEG teksturalarni ocha olmaydi — teksturalar olib tashlanadi (geometriya va kliplar qoladi).
  const doc = buildM0('r5');
  for (const t of doc.getRoot().listTextures()) t.dispose();
  const bytes = await new NodeIO().writeBinary(doc);
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  gltf = await new GLTFLoader().parseAsync(buf, '');
});

describe('AR rejimi konfiguratsiyadan tanlanadi', () => {
  it('mode "ar" — AR, boshqa yoki yo‘q — share', () => {
    const cfg = (mode?: string) =>
      JSON.stringify({ glb_url: 'https://x/files/ar/m0-r5.glb?sig=1', title: 'M-0', mode });
    expect(parseUhubConfig(cfg('ar'))?.mode).toBe('ar');
    expect(parseUhubConfig(cfg('share'))?.mode).toBe('share');
    expect(parseUhubConfig(cfg('boshqa'))?.mode).toBe('share');
    expect(parseUhubConfig(cfg())?.mode).toBe('share');
  });

  it('setHelpers bridge xabari', () => {
    expect(parseIncoming({ type: 'setHelpers', on: true })).toEqual({
      ok: true,
      msg: { type: 'setHelpers', on: true },
    });
    expect(parseIncoming({ type: 'setHelpers', on: 'ha' }).ok).toBe(false);
  });
});

describe('overlay tugmalari kliplar ro‘yxatidan', () => {
  it('1.10: pantograf o‘z nomi bilan raqamlanadi', () => {
    expect(clipButtons(['door__l__open', 'lift__p__open', 'drawer__t__open'])).toEqual([
      { clip: 'door__l__open', label: 'Eshik 1' },
      { clip: 'lift__p__open', label: 'Pantograf 1' },
      { clip: 'drawer__t__open', label: 'Tortma 1' },
    ]);
  });

  it('eshik va tortmalar alohida raqamlanadi, all__open kirmaydi', () => {
    expect(
      clipButtons(['door__d1__open', 'drawer__d2__open', 'all__open', 'drawer__d3__open', 'door__d9__open']),
    ).toEqual([
      { clip: 'door__d1__open', label: 'Eshik 1' },
      { clip: 'drawer__d2__open', label: 'Tortma 1' },
      { clip: 'drawer__d3__open', label: 'Tortma 2' },
      { clip: 'door__d9__open', label: 'Eshik 2' },
    ]);
  });

  it('M-0: 1 eshik, 3 tortma', () => {
    const labels = clipButtons(openableClipNames(gltf.animations)).map((b) => b.label);
    expect(labels.filter((l) => l.startsWith('Eshik'))).toHaveLength(1);
    expect(labels.filter((l) => l.startsWith('Tortma'))).toHaveLength(3);
  });

  it('XR imkoniyatlari qatori (hisobot uchun)', () => {
    expect(featureLine(['hit-test', 'dom-overlay'])).toContain('hit-test bor');
    expect(featureLine(['hit-test'])).toContain("plane-detection yo'q");
  });
});

describe('joylashtirish va aylantirish matematikasi', () => {
  const rotZ = (yaw: number) => new Vector3(0, 0, 1).applyAxisAngle(new Vector3(0, 1, 0), yaw);

  it('old tomon (+Z) foydalanuvchiga qaraydi', () => {
    for (const viewer of [
      { x: 0, z: 2 },
      { x: 2, z: 0 },
      { x: -1, z: -1 },
      { x: 0.3, z: -2 },
    ]) {
      const item = { x: 0.5, z: 0.25 };
      const front = rotZ(faceYaw(item, viewer));
      const toViewer = new Vector3(viewer.x - item.x, 0, viewer.z - item.z).normalize();
      expect(front.distanceTo(toViewer)).toBeLessThan(1e-9);
    }
    expect(faceYaw({ x: 1, z: 1 }, { x: 1, z: 1 })).toBe(0);
  });

  it('ikki barmoq: chiziq burchagi o‘zgarishi yaw ga teskari ishora bilan qo‘shiladi', () => {
    const p = (x: number, y: number) => ({ x, y });
    // 90° soat yo'nalishida (ekranda y pastga): (0,0)-(1,0) → (0,0)-(0,1).
    expect(twistYaw(0, [p(0, 0), p(1, 0)], [p(0, 0), p(0, 1)])).toBeCloseTo(-Math.PI / 2);
    expect(twistYaw(0.2, [p(0, 0), p(1, 0)], [p(5, 5), p(6, 5)])).toBeCloseTo(0.2);
    expect(Math.abs(twistYaw(3, [p(0, 0), p(1, 0)], [p(0, 0), p(0, -1)]))).toBeLessThanOrEqual(Math.PI);
    expect(wrapAngle(3 * Math.PI)).toBeCloseTo(Math.PI);
  });

  it('masshtab har doim 1: bounding box = overall_mm ±0.1 mm', () => {
    const overall = (
      findItemNode(gltf.scene)!.userData as { uhub: { dimensions: { overall_mm: Record<string, number> } } }
    ).uhub.dimensions.overall_mm;
    const anchor = new Group();
    anchor.add(gltf.scene);
    for (const yaw of [0, 1.234, -2.5]) {
      placeAnchor(anchor, { x: 1.5, y: -0.7, z: -2 }, yaw);
      expect(anchor.scale.toArray()).toEqual([1, 1, 1]);
      expect(gltf.scene.scale.toArray()).toEqual([1, 1, 1]);
    }
    placeAnchor(anchor, { x: 1.5, y: -0.7, z: -2 }, 0);
    anchor.updateMatrixWorld(true);
    // overall_mm — korpus o'lchami; tutqichlar (`hw__*`) old tomondan chiqib turadi (+12 mm), hisobga olinmaydi.
    const box = new Box3();
    gltf.scene.traverse((o) => {
      if ((o as Mesh).isMesh && !/^hw__/.test(o.name) && !/^hw__/.test(o.parent?.name ?? ''))
        box.expandByObject(o, true);
    });
    const size = box.getSize(new Vector3()).multiplyScalar(1000);
    expect(Math.abs(size.x - overall.width!)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(size.y - overall.height!)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(size.z - overall.depth!)).toBeLessThanOrEqual(0.1);
    anchor.remove(gltf.scene);
  });
});

describe('beforexrselect himoyasi', () => {
  it('overlay konteyneri ichidagi tugmadan kelgan hodisa bekor qilinadi', () => {
    const panel = new EventTarget();
    guardXrSelect(panel);
    const e = new Event('beforexrselect', { cancelable: true, bubbles: true });
    panel.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
  });

  it('himoyasiz element — bekor qilinmaydi (polga bosish select beradi)', () => {
    const root = new EventTarget();
    const e = new Event('beforexrselect', { cancelable: true });
    root.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
  });
});
