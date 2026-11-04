// "Butun loyiha" ko'rinishi (kontrakt 1.6, 10.2 / 10.4): har buyum `transform` bo'yicha bitta sahnada.
// GLB o'zgarmaydi (o'z boshida); buyum ildizi `holder` guruhiga qo'yiladi, `holder` loyiha ramkasida joylashadi.
import type { Object3D } from 'three';

export interface ItemTransform {
  /** Metr. */
  translation: [number, number, number];
  /** Kvaternion `[x, y, z, w]`. */
  rotation: [number, number, number, number];
}

export const IDENTITY: ItemTransform = { translation: [0, 0, 0], rotation: [0, 0, 0, 1] };

/** Faqat joy va burilish; masshtab o'zgarmaydi (1 birlik = 1 m). */
export function applyTransform(holder: Object3D, t: ItemTransform): void {
  holder.position.set(...t.translation);
  holder.quaternion.set(...t.rotation).normalize();
}

/** Loyiha rejimida klip nomlari buyum kaliti bilan: `<item_key>::door__d1__open` (bir xil nomlar to'qnashmasin). */
export const qualify = (key: string, clip: string) => (key ? `${key}::${clip}` : clip);
export const unqualify = (name: string) => {
  const i = name.indexOf('::');
  return i < 0 ? name : name.slice(i + 2);
};
