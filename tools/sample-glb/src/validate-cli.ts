// Generatsiya qilingan GLB'larni gltf-validator bilan tekshiradi; xato bo'lsa exit 1.
import { readFile } from 'node:fs/promises';
import { REVISIONS, type Revision } from './m0.js';
import path from 'node:path';
import { arGlbPath, glbPath } from './paths.js';
import { validateGlb } from './validate.js';

let failed = false;
const files = (Object.keys(REVISIONS) as Revision[]).flatMap((rev) => [glbPath(rev), arGlbPath(rev)]);
for (const file of files) {
  const report = await validateGlb(await readFile(file));
  console.log(`${path.basename(file)}: ${report.numErrors} error, ${report.numWarnings} warning`);
  for (const m of report.messages.filter((m) => m.severity <= 1)) {
    console.log(`  [${m.severity === 0 ? 'E' : 'W'}] ${m.code} ${m.pointer ?? ''} ${m.message}`);
  }
  if (report.numErrors > 0) failed = true;
}
process.exit(failed ? 1 : 0);
