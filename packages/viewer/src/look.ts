// Materiallar: rejim (Solid / Qirralar / X-ray), QR tanlovidagi shaffoflik va tanlangan detal konturi.
// Kontrakt 1.3 / integratsiya 4: shaffoflik uchun material NUSXASI olinadi — asl material hech qachon o'zgarmaydi
// (bir material ko'p detalda ishlatiladi). Kontur butun detal tuguniga (primitive'larga emas).
import {
  BoxHelper,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  type Material,
  type Mesh,
  type Object3D,
} from 'three';
import type { ViewMode } from './bridge.js';
import { ACCENT, GHOST_OPACITY } from './theme.js';

const XRAY_OPACITY = 0.25;

interface MeshState {
  orig: Material | Material[];
  edges?: LineSegments;
}

const edgeMat = new LineBasicMaterial({ color: 0x1b1d21 });
const edgeMatXray = new LineBasicMaterial({ color: 0x9aa3b2, transparent: true, opacity: 0.6 });

/** Asl material → shaffof nusxa (opacity bo'yicha keshlanadi). Asl material o'zgartirilmaydi. */
const fadeCache = new WeakMap<Material, Map<number, Material>>();
export function faded(m: Material, opacity: number): Material {
  let byOpacity = fadeCache.get(m);
  if (!byOpacity) fadeCache.set(m, (byOpacity = new Map()));
  let f = byOpacity.get(opacity);
  if (!f) {
    f = m.clone();
    f.transparent = true;
    f.opacity = Math.min(opacity, m.opacity); // shisha (BLEND, 0.3) bundan ham shaffofroq bo'lmaydi
    f.depthWrite = false;
    byOpacity.set(opacity, f);
  }
  return f;
}

export class Look {
  private readonly meshes = new Map<Mesh, MeshState>();
  private outline: BoxHelper | null = null;
  mode: ViewMode = 'solid';
  /** Tanlangan detal (tugun va uning ichidagi meshlar). */
  selected: Object3D | null = null;
  /** Tanlov bilan birga ajratiladigan tugunlar (bukilgan yon devorning yoylari). */
  also: readonly Object3D[] = [];
  /** QR oqimi: qolgan detallar shaffof. */
  ghost = false;

  constructor(private readonly root: Object3D) {
    root.traverse((o) => {
      const mesh = o as Mesh;
      if (mesh.isMesh) this.meshes.set(mesh, { orig: mesh.material });
    });
  }

  get meshList(): Mesh[] {
    return [...this.meshes.keys()];
  }

  /** Mesh'ning asl materiali(lar)i (testlar va diagnostika uchun). */
  originalOf(mesh: Mesh): Material | Material[] | undefined {
    return this.meshes.get(mesh)?.orig;
  }

  isGhosted(mesh: Mesh): boolean {
    return this.ghost && !this.inSelected(mesh);
  }

  private inSelected(o: Object3D): boolean {
    if (!this.selected) return false;
    for (let p: Object3D | null = o; p; p = p.parent)
      if (p === this.selected || this.also.includes(p)) return true;
    return false;
  }

  apply(): void {
    for (const [mesh, st] of this.meshes) {
      const selected = this.selected !== null && this.inSelected(mesh);
      const opacity = this.ghost && !selected ? GHOST_OPACITY : this.mode === 'xray' ? XRAY_OPACITY : 1;
      const pick = (m: Material) => (opacity < 1 ? faded(m, opacity) : m);
      mesh.material = Array.isArray(st.orig) ? st.orig.map(pick) : pick(st.orig);

      const showEdges = this.mode !== 'solid';
      if (showEdges && !st.edges) st.edges = this.lines(mesh);
      if (st.edges) {
        st.edges.visible = showEdges;
        st.edges.material = this.mode === 'xray' ? edgeMatXray : edgeMat;
      }
    }
    this.applyOutline();
  }

  /** Tanlangan detal butun tuguni atrofida accent kontur. */
  private applyOutline(): void {
    if (this.outline && this.outline.userData.target !== this.selected) {
      this.outline.removeFromParent();
      this.outline.geometry.dispose();
      this.outline = null;
    }
    if (this.selected && !this.outline) {
      const box = new BoxHelper(this.selected, ACCENT);
      const mat = box.material as LineBasicMaterial;
      mat.depthTest = false;
      mat.transparent = true;
      box.renderOrder = 10;
      box.raycast = () => {}; // tanlashga xalaqit bermasin
      box.userData.target = this.selected;
      (this.root.parent ?? this.root).add(box);
      this.outline = box;
    }
  }

  /** Har kadrda: kontur harakatlanayotgan detalga (tortma, eshik) ergashadi. */
  update(): void {
    this.outline?.update();
  }

  private lines(mesh: Mesh): LineSegments {
    const l = new LineSegments(new EdgesGeometry(mesh.geometry, 20), edgeMat);
    l.renderOrder = 1;
    l.raycast = () => {};
    mesh.add(l);
    return l;
  }

  dispose(): void {
    for (const [mesh, st] of this.meshes) {
      mesh.material = st.orig;
      st.edges?.geometry.dispose();
    }
    this.outline?.removeFromParent();
    this.outline?.geometry.dispose();
    this.outline = null;
  }
}
