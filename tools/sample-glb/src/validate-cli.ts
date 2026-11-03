// Generatsiya qilingan GLB'larni gltf-validator bilan tekshiradi; xato bo'lsa exit 1.
import { readFile } from 'node:fs/promises';
import { REVISIONS, type Revision } from './m0.js';
import { glbPath } from './paths.js';
import { validateGlb } from './validate.js';

let failed = false;
for (const rev of Object.keys(REVISIONS) as Revision[]) {
  const report = await validateGlb(await readFile(glbPath(rev)));
  console.log(`m0-${rev}.glb: ${report.numErrors} error, ${report.numWarnings} warning`);
  for (const m of report.messages.filter((m) => m.severity <= 1)) {
    console.log(`  [${m.severity === 0 ? 'E' : 'W'}] ${m.code} ${m.pointer ?? ''} ${m.message}`);
  }
  if (report.numErrors > 0) failed = true;
}
process.exit(failed ? 1 : 0);
