// Ochilish zonalari (M-A5, 1b): eshik/tortma ochilganda egallaydigan joy — AR va 3D rejimda ko'z bilan tekshirish uchun.
// Burchak va yurish hisoblanmaydi: klip (nomi bo'yicha) t = 0…1 da N qadamda baholanadi, harakatlanuvchi tugun
// (`pivot__door__*` / `slide__drawer__*`) holatlari yig'iladi (kontrakt 2.2 tamoyili).
import {
  AnimationMixer,
  Box3,
  BoxGeometry,
  BufferGeometry,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  LoopOnce,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  type AnimationClip,
  type Object3D,
  Vector3,
} from 'three';
import { isOpenableClip } from './model.js';
import { wrapAngle } from './ar-math.js';
import { ACCENT } from './theme.js';

/** Klip shuncha qadamda baholanadi (t = 0, 1/N, …, 1). */
export const ZONE_STEPS = 12;
export const ZONE_OPACITY = 0.2;

/**
 * Eshik zonasi — petlya o'qi (vertikal, pivot tugunida) atrofidagi sektor: markaz, radius, burchaklar oralig'i
 * (XZ tekisligida `atan2(dz, dx)`), balandlik. Tortma zonasi — barcha holatlarni qamraydigan quti.
 * Koordinatalar buyum ildizi (`gltf.scene`) fazosida.
 */
export type Zone =
  | {
      kind: 'door';
      clip: string;
      center: { x: number; z: number };
      radius: number;
      /** Petlya yonidagi kichik doira (eshik qalinligi) — burchak oralig'idan tashqari, lekin zona ichida. */
      hub: number;
      a0: number;
      a1: number;
      y0: number;
      y1: number;
    }
  | { kind: 'drawer'; clip: string; box: Box3 };

/** `door__<id>__open` → `pivot__door__<id>`, `drawer__<id>__open` → `slide__drawer__<id>` (kontrakt 2.1/2.2). */
export function movingNodeName(clip: string): string | null {
  const m = /^(door|drawer)__(.+)__open$/.exec(clip);
  if (!m) return null;
  return m[1] === 'door' ? `pivot__door__${m[2]}` : `slide__drawer__${m[2]}`;
}

/** Tugun ostidagi har mesh bounding box burchaklari — `node` fazosida (tugun burilishiga bog'liq emas). */
function localCorners(node: Object3D): Vector3[] {
  node.updateMatrixWorld(true);
  const toNode = new Matrix4().copy(node.matrixWorld).invert();
  const m = new Matrix4();
  const out: Vector3[] = [];
  node.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.computeBoundingBox();
    const { min: p, max: q } = mesh.geometry.boundingBox!;
    m.multiplyMatrices(toNode, mesh.matrixWorld);
    for (const x of [p.x, q.x])
      for (const y of [p.y, q.y]) for (const z of [p.z, q.z]) out.push(new Vector3(x, y, z).applyMatrix4(m));
  });
  return out;
}

/**
 * Har ochiladigan klip uchun zona. Pozani o'zgartirmaydi: oxirida har klip t = 0 ga qaytariladi.
 * `__mid` (tortma relsi) — `slide__drawer__*` ning bolasi, tortma zonasiga kiradi, alohida zona yo'q.
 */
export function computeZones(root: Object3D, clips: readonly AnimationClip[], steps = ZONE_STEPS): Zone[] {
  root.updateMatrixWorld(true);
  const toRoot = new Matrix4().copy(root.matrixWorld).invert();
  const mixer = new AnimationMixer(root);
  const zones: Zone[] = [];
  for (const clip of clips) {
    if (!isOpenableClip(clip.name)) continue;
    const name = movingNodeName(clip.name);
    const node = name ? root.getObjectByName(name) : undefined;
    if (!node) continue;
    const corners = clip.name.startsWith('door__') ? localCorners(node) : [];
    const action = mixer.clipAction(clip);
    action.setLoop(LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    const samples: Vector3[][] = [];
    const boxes: Box3[] = [];
    let pivot = new Vector3();
    for (let i = 0; i <= steps; i++) {
      action.time = (clip.duration * i) / steps;
      mixer.update(0);
      root.updateMatrixWorld(true);
      if (i === 0) pivot = node.getWorldPosition(new Vector3()).applyMatrix4(toRoot);
      if (corners.length) {
        const toRootFromNode = new Matrix4().multiplyMatrices(toRoot, node.matrixWorld);
        samples.push(corners.map((c) => c.clone().applyMatrix4(toRootFromNode)));
      } else {
        boxes.push(new Box3().setFromObject(node).applyMatrix4(toRoot));
      }
    }
    // Yopiq holatga qaytarish.
    action.time = 0;
    mixer.update(0);
    action.stop();

    if (corners.length) zones.push(doorZone(clip.name, pivot, samples));
    else if (boxes.length)
      zones.push({ kind: 'drawer', clip: clip.name, box: boxes.reduce((a, b) => a.union(b)) });
  }
  mixer.stopAllAction();
  mixer.uncacheRoot(root);
  root.updateMatrixWorld(true);
  return zones;
}

function doorZone(clip: string, pivot: Vector3, samples: Vector3[][]): Zone {
  const cx = pivot.x;
  const cz = pivot.z;
  const polar = (p: Vector3) => ({ r: Math.hypot(p.x - cx, p.z - cz), a: Math.atan2(p.z - cz, p.x - cx) });
  // Tayanch burchak — yopiq holatdagi eng uzoq burchak (eshik chekkasi).
  const far = samples[0]!.reduce((best, p) => (polar(p).r > polar(best).r ? p : best));
  const ref = polar(far).a;
  const all = samples.flat();
  const radius = Math.max(...all.map((p) => polar(p).r));
  // Burchak oralig'i — eshik chekkasi tomonidagi burchaklardan (o'qqa yaqinlari har tomonga qarab, oraliqni buzadi).
  let lo = 0;
  let hi = 0;
  let hub = 0;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of all) {
    const { r, a } = polar(p);
    y0 = Math.min(y0, p.y);
    y1 = Math.max(y1, p.y);
    if (r < radius / 2) {
      hub = Math.max(hub, r);
      continue;
    }
    const d = wrapAngle(a - ref);
    lo = Math.min(lo, d);
    hi = Math.max(hi, d);
  }
  return { kind: 'door', clip, center: { x: cx, z: cz }, radius, hub, a0: ref + lo, a1: ref + hi, y0, y1 };
}

/** Nuqta zona ichidami (testlar uchun; `eps` — metr). */
export function zoneContains(zone: Zone, p: Vector3, eps = 1e-4): boolean {
  if (zone.kind === 'drawer') return zone.box.clone().expandByScalar(eps).containsPoint(p);
  if (p.y < zone.y0 - eps || p.y > zone.y1 + eps) return false;
  const r = Math.hypot(p.x - zone.center.x, p.z - zone.center.z);
  if (r > zone.radius + eps) return false;
  if (r <= zone.hub + eps) return true;
  const mid = (zone.a0 + zone.a1) / 2;
  const d = Math.abs(wrapAngle(Math.atan2(p.z - zone.center.z, p.x - zone.center.x) - mid));
  // Burchak chegarasi radiusga nisbatan eps bilan.
  return d <= (zone.a1 - zone.a0) / 2 + eps / Math.max(r, 1e-3) + 1e-9;
}

const fillMat = new MeshBasicMaterial({
  color: ACCENT,
  transparent: true,
  opacity: ZONE_OPACITY,
  depthWrite: false,
  side: DoubleSide,
});
const floorMat = new MeshBasicMaterial({
  color: ACCENT,
  transparent: true,
  opacity: ZONE_OPACITY * 1.5,
  depthWrite: false,
  side: DoubleSide,
});
const lineMat = new LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.85 });

/** Sektor hajmi: yuqori/pastki yelpig'ich, tashqi yoy devori, ikki yon devor. */
function sectorGeometry(z: Extract<Zone, { kind: 'door' }>, y0: number, y1: number): BufferGeometry {
  const n = Math.max(6, Math.ceil((z.a1 - z.a0) / (Math.PI / 24)));
  const pt = (i: number, y: number): [number, number, number] => {
    const a = z.a0 + ((z.a1 - z.a0) * i) / n;
    return [z.center.x + z.radius * Math.cos(a), y, z.center.z + z.radius * Math.sin(a)];
  };
  const c0: [number, number, number] = [z.center.x, y0, z.center.z];
  const c1: [number, number, number] = [z.center.x, y1, z.center.z];
  const v: number[] = [];
  const tri = (...ps: [number, number, number][]) => ps.forEach((p) => v.push(...p));
  for (let i = 0; i < n; i++) {
    tri(c0, pt(i, y0), pt(i + 1, y0));
    if (y1 > y0) {
      tri(c1, pt(i + 1, y1), pt(i, y1));
      tri(pt(i, y0), pt(i, y1), pt(i + 1, y1));
      tri(pt(i, y0), pt(i + 1, y1), pt(i + 1, y0));
    }
  }
  if (y1 > y0) {
    tri(c0, c1, pt(0, y1), c0, pt(0, y1), pt(0, y0));
    tri(c0, pt(n, y0), pt(n, y1), c0, pt(n, y1), c1);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(v, 3));
  return g;
}

const noRaycast = () => {};

/**
 * Zonalar sahna obyekti: hajm (opacity ≈ 0.2) + chegara chizig'i + polga proyeksiya (`floorY` da).
 * Buyum ildiziga qo'shilmaydi (o'lcham va tanlovga ta'sir qilmasin) — ildiz bilan bir xil ota tugunga qo'yiladi.
 */
export function buildZoneMeshes(zones: readonly Zone[], floorY: number): Group {
  const group = new Group();
  group.name = 'helpers__zones';
  const add = (geo: BufferGeometry, mat: MeshBasicMaterial, edges: boolean) => {
    const mesh = new Mesh(geo, mat);
    mesh.raycast = noRaycast;
    mesh.renderOrder = 10;
    group.add(mesh);
    if (edges) {
      const line = new LineSegments(new EdgesGeometry(geo, 20), lineMat);
      line.raycast = noRaycast;
      group.add(line);
    }
  };
  const lift = floorY + 0.002;
  for (const z of zones) {
    if (z.kind === 'door') {
      add(sectorGeometry(z, z.y0, z.y1), fillMat, true);
      add(sectorGeometry(z, lift, lift), floorMat, false);
    } else {
      const size = z.box.getSize(new Vector3());
      const center = z.box.getCenter(new Vector3());
      const box = new BoxGeometry(size.x, size.y, size.z).translate(center.x, center.y, center.z);
      add(box, fillMat, true);
      const plate = new BoxGeometry(size.x, 0, size.z).translate(center.x, lift, center.z);
      add(plate, floorMat, false);
    }
  }
  return group;
}

export function disposeZones(group: Group): void {
  group.removeFromParent();
  group.traverse((o) => {
    const g = (o as Mesh).geometry;
    if (g) g.dispose();
  });
}
