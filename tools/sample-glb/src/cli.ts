// GLB fixtures generatori: mock/fixtures/glb/m0-r3.glb va m0-r5.glb.
import { mkdir, writeFile } from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import { buildM0 } from './build.js';
import { REVISIONS, type Revision } from './m0.js';
import { OUT_DIR, glbPath } from './paths.js';

const io = new NodeIO();
await mkdir(OUT_DIR, { recursive: true });
for (const rev of Object.keys(REVISIONS) as Revision[]) {
  const bytes = await io.writeBinary(buildM0(rev));
  await writeFile(glbPath(rev), bytes);
  console.log(`${glbPath(rev)}  ${(bytes.byteLength / 1024).toFixed(1)} KB`);
}
