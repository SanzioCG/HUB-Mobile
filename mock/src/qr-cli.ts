// Namunaviy etiketkalar: har detal uchun QR + matn PNG.
//   fixtures/qr/<fayl>.png               — detal mavjud eng yangi reviziya etiketkasi
//   fixtures/qr/<revision_id>/<fayl>.png — har reviziya etiketkasi (eski etiketka → is_latest=false)
// <fayl> = tugun nomidagi uid qismi: oddiy uid o'zi, ruxsat etilmagan belgili uid — x<base32> (kontrakt 1.2, 2.1).
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import QRCode from 'qrcode';
import { nodeName } from '@hub-mobile/sample-glb/contract';
import { M0_REVISION_IDS, readRevision, type PartInfo } from './data.js';
import { QR_DIR, readGlbFixtures } from './fixtures.js';

const fileName = (uid: string) => nodeName.part(uid).slice('part__'.length);

const W = 640;
const H = 260;
const PAD = 20;

function label(part: PartInfo, revisionId: string): Buffer {
  const canvas = createCanvas(W, H);
  const g = canvas.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, W, H);

  const qr = QRCode.create(part.qr, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const quiet = 4;
  const cell = Math.floor((H - 2 * PAD) / (n + 2 * quiet));
  const x0 = PAD + quiet * cell;
  const y0 = (H - n * cell) / 2;
  g.fillStyle = '#000000';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++)
      if (qr.modules.get(r, c)) g.fillRect(x0 + c * cell, y0 + r * cell, cell, cell);
  }

  const tx = x0 + n * cell + quiet * cell;
  g.fillStyle = '#000000';
  g.font = 'bold 56px sans-serif';
  g.fillText(`№ ${part.number}`, tx, PAD + 56);
  g.font = '26px sans-serif';
  g.fillText(part.name, tx, PAD + 100, W - tx - PAD);
  g.font = '20px monospace';
  g.fillText(`uid ${part.uid}`, tx, PAD + 150);
  g.fillText(revisionId, tx, PAD + 180);
  g.font = '14px monospace';
  g.fillText(part.qr, tx, H - PAD, W - tx - PAD);
  return canvas.toBuffer('image/png');
}

const glbs = await readGlbFixtures();
await rm(QR_DIR, { recursive: true, force: true }); // eski etiketkalar qolmasin
const newest = new Map<string, Buffer>();
let count = 0;
for (const id of M0_REVISION_IDS) {
  const rev = await readRevision(glbs[id]!);
  const dir = path.join(QR_DIR, rev.revision_id);
  await mkdir(dir, { recursive: true });
  for (const part of rev.parts.values()) {
    const png = label(part, rev.revision_id);
    await writeFile(path.join(dir, `${fileName(part.uid)}.png`), png);
    newest.set(part.uid, png); // keyingi reviziya ustidan yozadi
    count++;
  }
}
for (const [uid, png] of newest) await writeFile(path.join(QR_DIR, `${fileName(uid)}.png`), png);
console.log(`${QR_DIR}: ${newest.size} etiketka (+${count} reviziya bo'yicha)`);
