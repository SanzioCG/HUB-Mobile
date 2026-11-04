import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { Revision } from './m0.js';

export const OUT_DIR = fileURLToPath(new URL('../../../mock/fixtures/glb/', import.meta.url));

export const glbPath = (rev: Revision) => path.join(OUT_DIR, `m0-${rev}.glb`);

/** Og'ir namuna (integratsiya hujjati 5.5). */
export const heavyGlbPath = () => path.join(OUT_DIR, 'm0-heavy.glb');

/** Sintetik `.uhub` (M-A7): `mock/fixtures/uhub/namuna.uhub` — git'da (`.gitignore` istisnosi). */
export const UHUB_DIR = fileURLToPath(new URL('../../../mock/fixtures/uhub/', import.meta.url));
export const uhubPath = () => path.join(UHUB_DIR, 'namuna.uhub');

/** AR varianti: `<revision_id>-ar.glb`. */
export const arGlbPath = (rev: Revision) => path.join(OUT_DIR, `m0-${rev}-ar.glb`);
