// Generatsiya qilingan GLB'larni tekshiradi: gltf-validator 0 error va kengaytmalar yo'q (kontrakt 1.3, 2.5).
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { REVISIONS, type Revision } from './m0.js';
import { arGlbPath, glbPath, heavyGlbPath } from './paths.js';
import { glbJson, validateGlb } from './validate.js';

const files = [
  ...(Object.keys(REVISIONS) as Revision[]).flatMap((rev) => [glbPath(rev), arGlbPath(rev)]),
  heavyGlbPath(),
];
let failed = false;
for (const file of files) {
  const bytes = await readFile(file);
  const report = await validateGlb(bytes);
  const ext = (glbJson(bytes).extensionsUsed as string[] | undefined) ?? [];
  const mb = (bytes.byteLength / 1024 / 1024).toFixed(2);
  console.log(
    `${path.basename(file)}: ${report.numErrors} error, ${report.numWarnings} warning, ${mb} MB, extensionsUsed=[${ext.join(',')}]`,
  );
  for (const m of report.messages.filter((m) => m.severity <= 1)) {
    console.log(`  [${m.severity === 0 ? 'E' : 'W'}] ${m.code} ${m.pointer ?? ''} ${m.message}`);
  }
  if (report.numErrors > 0 || ext.length > 0) failed = true;
}
process.exit(failed ? 1 : 0);
