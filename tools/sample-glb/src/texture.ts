// Protsedural dekor teksturalari (JPEG, sof JS — jpeg-js). Kontrakt 1.3, 2.5: U o'qi (rasm gorizontali) — tola yo'nalishi.
import jpeg from 'jpeg-js';

export interface WoodStyle {
  /** Asosiy va tomir ranglari, sRGB 0–255. */
  base: [number, number, number];
  vein: [number, number, number];
  /** Tomirlar zichligi (rasm balandligiga nechta). */
  veins: number;
  /** Tomir kontrasti 0–1. */
  contrast: number;
  /** Shovqin ulushi 0–1 (og'ir namunada katta — JPEG yomon siqiladi). */
  grain: number;
}

export const OAK: WoodStyle = {
  base: [176, 132, 88],
  vein: [120, 82, 48],
  veins: 22,
  contrast: 0.55,
  grain: 0.08,
};
export const WHITE: WoodStyle = {
  base: [236, 234, 228],
  vein: [214, 211, 203],
  veins: 30,
  contrast: 0.25,
  grain: 0.03,
};

/** Deterministik hash → [0, 1). */
function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Silliq qiymat shovqini (bilinear, smoothstep). */
function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi, seed);
  const b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed);
  const d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/**
 * Yog'och tolasi: tomirlar U (gorizontal) bo'ylab cho'zilgan, V bo'ylab takrorlanadi; chok bo'lmasligi uchun
 * shovqin davriy (o'lcham bo'yicha o'raladi).
 */
export function woodJpeg(size: number, style: WoodStyle, seed: number, quality = 85): Uint8Array {
  const data = Buffer.alloc(size * size * 4);
  const period = 8; // shovqin katakchalari soni (davriy)
  const cell = size / period;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // U bo'ylab sekin, V bo'ylab tez o'zgaradigan buralish → tolalar gorizontal
      const nx = ((x / cell) * 0.25) % period;
      const ny = (y / cell) % period;
      const warp = valueNoise(nx, ny, seed) * 2 - 1;
      const t = (y / size) * style.veins + warp * 0.9;
      const ring = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
      const vein = Math.pow(ring, 3) * style.contrast;
      const fine = (hash(x, y, seed + 7) - 0.5) * style.grain;
      for (let c = 0; c < 3; c++) {
        const v = style.base[c]! + (style.vein[c]! - style.base[c]!) * vein + fine * 255;
        data[(y * size + x) * 4 + c] = Math.max(0, Math.min(255, Math.round(v)));
      }
      data[(y * size + x) * 4 + 3] = 255;
    }
  }
  return new Uint8Array(jpeg.encode({ data, width: size, height: size }, quality).data);
}

/** JPEG sarlavhasidan o'lchamni o'qish (test uchun). */
export function jpegSize(bytes: Uint8Array): { width: number; height: number } {
  const img = jpeg.decode(bytes, { useTArray: true });
  return { width: img.width, height: img.height };
}
