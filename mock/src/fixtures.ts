import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { FIXTURES_DIR } from './config.js';
import { HEAVY_REVISION_ID, M0_REVISION_IDS } from './data.js';

export const GLB_DIR = path.join(FIXTURES_DIR, 'glb');
export const QR_DIR = path.join(FIXTURES_DIR, 'qr');

export async function readGlbFixtures(): Promise<Record<string, Uint8Array>> {
  const glbs: Record<string, Uint8Array> = {};
  // Har reviziya: asosiy GLB va AR varianti (`<revision_id>-ar.glb`, M-A3).
  for (const id of M0_REVISION_IDS.flatMap((r) => [r, `${r}-ar`])) {
    try {
      glbs[id] = await readFile(path.join(GLB_DIR, `${id}.glb`));
    } catch {
      throw new Error(`${id}.glb topilmadi: avval "npm run fixtures" ni ishga tushiring`);
    }
  }
  // Og'ir namuna (integratsiya hujjati 5.5) — ixtiyoriy: bo'lmasa buyum ro'yxatda ko'rinmaydi.
  try {
    glbs[HEAVY_REVISION_ID] = await readFile(path.join(GLB_DIR, `${HEAVY_REVISION_ID}.glb`));
  } catch {
    // fixtures eski — og'ir namunasiz ishlaymiz
  }
  return glbs;
}

/** Juftlash QR'i (kontrakt 4.1): `fixtures/qr/pair.png`. */
export const PAIR_QR_FILE = 'pair.png';
