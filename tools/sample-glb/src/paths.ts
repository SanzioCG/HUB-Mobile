import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { Revision } from './m0.js';

export const OUT_DIR = fileURLToPath(new URL('../../../mock/fixtures/glb/', import.meta.url));

export const glbPath = (rev: Revision) => path.join(OUT_DIR, `m0-${rev}.glb`);
