// AR rejimi uchun sof funksiyalar (M-A5): joylashtirish burchagi, ikki barmoqli aylantirish, overlay tugmalari.
// Masshtab hech qayerda o'zgartirilmaydi: 1 birlik = 1 m (kontrakt 2.3).
import type { Object3D } from 'three';
import { isOpenableClip } from './model.js';

export interface XZ {
  x: number;
  z: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

/** (-π, π] oralig'iga keltirish. */
export function wrapAngle(a: number): number {
  const r = a % (2 * Math.PI);
  if (r > Math.PI) return r - 2 * Math.PI;
  if (r <= -Math.PI) return r + 2 * Math.PI;
  return r;
}

/**
 * Buyumning old tomoni (+Z) foydalanuvchiga qarashi uchun Y o'qi atrofidagi burchak.
 * Y bo'yicha θ burish +Z ni (sin θ, 0, cos θ) ga o'tkazadi → θ = atan2(dx, dz).
 */
export function faceYaw(item: XZ, viewer: XZ): number {
  const dx = viewer.x - item.x;
  const dz = viewer.z - item.z;
  if (Math.hypot(dx, dz) < 1e-6) return 0;
  return Math.atan2(dx, dz);
}

/**
 * Ikki barmoq bilan aylantirish: barmoqlar orasidagi chiziq burchagining o'zgarishi.
 * Ekranda y pastga — soat yo'nalishidagi burish (yuqoridan qaraganda) yaw'ni kamaytiradi.
 */
export function twistYaw(
  yaw: number,
  prev: [ScreenPoint, ScreenPoint],
  cur: [ScreenPoint, ScreenPoint],
): number {
  const a0 = Math.atan2(prev[1].y - prev[0].y, prev[1].x - prev[0].x);
  const a1 = Math.atan2(cur[1].y - cur[0].y, cur[1].x - cur[0].x);
  return wrapAngle(yaw - wrapAngle(a1 - a0));
}

/** Joylashtirish: faqat joy va Y burchagi. `scale` ga tegilmaydi. */
export function placeAnchor(anchor: Object3D, pos: { x: number; y: number; z: number }, yaw: number): void {
  anchor.position.set(pos.x, pos.y, pos.z);
  anchor.rotation.set(0, yaw, 0);
}

export interface ClipButton {
  clip: string;
  label: string;
}

/** Overlay tugmalari: GLB tartibida, eshiklar va tortmalar alohida raqamlanadi ("Eshik 1", "Tortma 2"). */
export function clipButtons(clips: readonly string[]): ClipButton[] {
  let doors = 0;
  let drawers = 0;
  return clips.filter(isOpenableClip).map((clip) => {
    const door = clip.startsWith('door__');
    return { clip, label: door ? `Eshik ${++doors}` : `Tortma ${++drawers}` };
  });
}

/**
 * Overlay tugmalari bosilganda XR `select` ishlamasin (aks holda buyum qayta joylashadi): `beforexrselect`
 * hodisasi ko'tariladi (bubbles), konteynerda bekor qilinadi.
 */
export function guardXrSelect(el: EventTarget): void {
  el.addEventListener('beforexrselect', (e) => e.preventDefault());
}
