// Kontrakt 1.3 / integratsiya 4: tanlov shaffofligi material NUSXASI bilan — asl material o'zgarmaydi.
import { describe, expect, it } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { Look } from '../src/look.js';

function scene() {
  const shared = new MeshStandardMaterial({ color: 0xffffff }); // bir material ikki detalda
  const glass = new MeshStandardMaterial({ transparent: true, opacity: 0.3 });
  const root = new Group();
  const a = new Group();
  const b = new Group();
  const c = new Group();
  const meshA = new Mesh(new BoxGeometry(), shared);
  const meshB = new Mesh(new BoxGeometry(), shared);
  const meshC = new Mesh(new BoxGeometry(), glass);
  a.add(meshA);
  b.add(meshB);
  c.add(meshC);
  root.add(a, b, c);
  new Group().add(root); // kontur uchun ota
  return { root, a, b, c, meshA, meshB, meshC, shared, glass };
}

describe('Look — tanlov shaffofligi', () => {
  it('tanlangan detal shaffof bo‘lmaydi, garchi tanlanmagan detal bilan bir material ishlatsa ham', () => {
    const s = scene();
    const look = new Look(s.root);
    look.selected = s.a;
    look.ghost = true;
    look.apply();
    expect(s.meshA.material).toBe(s.shared); // asl material, shaffof emas
    expect((s.meshA.material as MeshStandardMaterial).opacity).toBe(1);
    expect(s.meshB.material).not.toBe(s.shared); // nusxa
    expect((s.meshB.material as MeshStandardMaterial).opacity).toBeCloseTo(0.15);
    expect((s.meshB.material as MeshStandardMaterial).transparent).toBe(true);
    // asl material hech qachon o'zgarmagan
    expect(s.shared.opacity).toBe(1);
    expect(s.shared.transparent).toBe(false);
  });

  it('showAll (ghost=false, selected=null) asl materiallarni qaytaradi', () => {
    const s = scene();
    const look = new Look(s.root);
    look.selected = s.a;
    look.ghost = true;
    look.apply();
    look.selected = null;
    look.ghost = false;
    look.apply();
    expect(s.meshA.material).toBe(s.shared);
    expect(s.meshB.material).toBe(s.shared);
    expect(s.meshC.material).toBe(s.glass);
  });

  it('shisha (BLEND, 0.3) nusxasi shaffofroq, asl shisha o‘zgarmaydi', () => {
    const s = scene();
    const look = new Look(s.root);
    look.selected = s.a;
    look.ghost = true;
    look.apply();
    expect((s.meshC.material as MeshStandardMaterial).opacity).toBeCloseTo(0.15);
    expect(s.glass.opacity).toBeCloseTo(0.3);
  });

  it('kontur butun detal tuguniga: bitta BoxHelper, tanlov almashganda ko‘chadi', () => {
    const s = scene();
    const look = new Look(s.root);
    const parent = s.root.parent!;
    const helpers = () => parent.children.filter((o) => o !== s.root);
    look.selected = s.a;
    look.apply();
    expect(helpers()).toHaveLength(1);
    expect(helpers()[0]!.userData.target).toBe(s.a);
    look.selected = s.b;
    look.apply();
    expect(helpers()).toHaveLength(1);
    expect(helpers()[0]!.userData.target).toBe(s.b);
    look.selected = null;
    look.apply();
    expect(helpers()).toHaveLength(0);
  });
});
