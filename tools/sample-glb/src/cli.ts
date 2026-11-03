// GLB fixtures generatori: mock/fixtures/glb/m0-r3.glb, m0-r5.glb, AR variantlari (*-ar.glb) va m0-heavy.glb.
import { mkdir, writeFile } from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import { buildHeavy, buildM0 } from './build.js';
import { REVISIONS, type Revision } from './m0.js';
import { OUT_DIR, arGlbPath, glbPath, heavyGlbPath } from './paths.js';

const io = new NodeIO();
await mkdir(OUT_DIR, { recursive: true });
for (const rev of Object.keys(REVISIONS) as Revision[]) {
  for (const [file, ar] of [
    [glbPath(rev), false],
    [arGlbPath(rev), true],
  ] as const) {
    const bytes = await io.writeBinary(buildM0(rev, { ar }));
    await writeFile(file, bytes);
    console.log(`${file}  ${(bytes.byteLength / 1024).toFixed(1)} KB`);
  }
}

const heavy = await io.writeBinary(buildHeavy());
await writeFile(heavyGlbPath(), heavy);
console.log(`${heavyGlbPath()}  ${(heavy.byteLength / 1024 / 1024).toFixed(2)} MB`);
