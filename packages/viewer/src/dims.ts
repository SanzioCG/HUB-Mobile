// O'lcham chiziqlari faqat `extras.uhub.dimensions.lines` dan (kontrakt 2.3) — viewer o'zi hisoblamaydi.
import { BufferGeometry, Group, Line, LineBasicMaterial, Vector3, type Object3D } from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { DimensionLine } from './bridge.js';

const lineMat = new LineBasicMaterial({ color: 0xc8ccd4, depthTest: false, transparent: true });

/** Chiziqlar item tuguniga bola sifatida qo'shiladi — koordinatalar item ramkasida. */
export function buildDims(item: Object3D, lines: readonly DimensionLine[]): Group {
  const g = new Group();
  g.name = 'viewer_dims';
  for (const d of lines) {
    const a = new Vector3(...d.from);
    const b = new Vector3(...d.to);
    const line = new Line(new BufferGeometry().setFromPoints([a, b]), lineMat);
    line.renderOrder = 20;
    line.raycast = () => {};
    g.add(line);
    const el = document.createElement('div');
    el.className = 'dim-label';
    el.textContent = d.label;
    const label = new CSS2DObject(el);
    label.position.copy(a).add(b).multiplyScalar(0.5);
    g.add(label);
  }
  g.visible = false;
  item.add(g);
  return g;
}

export function disposeDims(g: Group): void {
  g.traverse((o) => {
    if (o instanceof Line) o.geometry.dispose();
    if (o instanceof CSS2DObject) o.element.remove();
  });
  g.removeFromParent();
}
