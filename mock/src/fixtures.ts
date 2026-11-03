import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { FIXTURES_DIR } from './config.js';
import { M0_REVISION_IDS } from './data.js';

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
  return glbs;
}
