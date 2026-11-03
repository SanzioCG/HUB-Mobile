// Materiallar: rejim (Solid / Qirralar / X-ray), QR tanlovidagi shaffoflik va tanlangan detal konturi.
import {
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
  outline?: LineSegments;
}

const edgeMat = new LineBasicMaterial({ color: 0x1b1d21 });
const edgeMatXray = new LineBasicMaterial({ color: 0x9aa3b2, transparent: true, opacity: 0.6 });
const outlineMat = new LineBasicMaterial({ color: ACCENT, depthTest: false, transparent: true });

const fadeCache = new WeakMap<Material, Map<number, Material>>();
function faded(m: Material, opacity: number): Material {
  let byOpacity = fadeCache.get(m);
  if (!byOpacity) fadeCache.set(m, (byOpacity = new Map()));
  let f = byOpacity.get(opacity);
  if (!f) {
    f = m.clone();
    f.transparent = true;
    f.opacity = opacity;
    f.depthWrite = false;
    byOpacity.set(opacity, f);
  }
  return f;
}

export class Look {
  private readonly meshes = new Map<Mesh, MeshState>();
  mode: ViewMode = 'solid';
  /** Tanlangan detal (tugun va uning ichidagi meshlar). */
  selected: Object3D | null = null;
  /** QR oqimi: qolgan detallar shaffof. */
  ghost = false;

  constructor(root: Object3D) {
    root.traverse((o) => {
      const mesh = o as Mesh;
      if (mesh.isMesh) this.meshes.set(mesh, { orig: mesh.material });
    });
  }

  get meshList(): Mesh[] {
    return [...this.meshes.keys()];
  }

  isGhosted(mesh: Mesh): boolean {
    return this.ghost && !this.inSelected(mesh);
  }

  private inSelected(o: Object3D): boolean {
    for (let p: Object3D | null = o; p; p = p.parent) if (p === this.selected) return true;
    return false;
  }

  apply(): void {
    for (const [mesh, st] of this.meshes) {
      const selected = this.selected !== null && this.inSelected(mesh);
      const opacity = this.ghost && !selected ? GHOST_OPACITY : this.mode === 'xray' ? XRAY_OPACITY : 1;
      const pick = (m: Material) => (opacity < 1 ? faded(m, opacity) : m);
      mesh.material = Array.isArray(st.orig) ? st.orig.map(pick) : pick(st.orig);

      const showEdges = this.mode !== 'solid';
      if (showEdges && !st.edges) st.edges = this.lines(mesh, edgeMat, 1);
      if (st.edges) {
        st.edges.visible = showEdges;
        st.edges.material = this.mode === 'xray' ? edgeMatXray : edgeMat;
      }
      if (selected && !st.outline) st.outline = this.lines(mesh, outlineMat, 10);
      if (st.outline) st.outline.visible = selected;
    }
  }

  private lines(mesh: Mesh, mat: LineBasicMaterial, renderOrder: number): LineSegments {
    const l = new LineSegments(new EdgesGeometry(mesh.geometry, 20), mat);
    l.renderOrder = renderOrder;
    l.raycast = () => {}; // tanlashga xalaqit bermasin
    mesh.add(l);
    return l;
  }

  dispose(): void {
    for (const [mesh, st] of this.meshes) {
      mesh.material = st.orig;
      st.edges?.geometry.dispose();
      st.outline?.geometry.dispose();
    }
  }
}
