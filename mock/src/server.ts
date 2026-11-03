import { mkdir } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import QRCode from 'qrcode';
import { buildApp, pairQrText } from './app.js';
import { config } from './config.js';
import { createStore } from './data.js';
import { PAIR_QR_FILE, QR_DIR, readGlbFixtures } from './fixtures.js';

const lan = Object.values(networkInterfaces())
  .flat()
  .filter((a) => a && a.family === 'IPv4' && !a.internal)
  .map((a) => `http://${a!.address}:${config.port}`);
const server = lan[0] ?? `http://localhost:${config.port}`;

// Kontrakt 4.1: juftlash QR'i (desktop "Telefonni ulash" o'rnida) — LAN manzili bilan.
const pairQr = pairQrText(server, config.pairCode);
await mkdir(QR_DIR, { recursive: true });
await QRCode.toFile(path.join(QR_DIR, PAIR_QR_FILE), pairQr, { width: 480, margin: 2 });

const glbs = await readGlbFixtures();
const app = buildApp({
  store: await createStore(glbs),
  glbs,
  devToken: config.devToken,
  signSecret: config.signSecret,
  publicUrl: config.publicUrl,
  pairCode: config.pairCode,
  qrDir: QR_DIR,
  pairQr,
  logger: true,
});

await app.listen({ host: config.host, port: config.port });

console.log(`\nMock API: ${lan.join(', ') || `http://localhost:${config.port}`}`);
console.log(`Juftlash kodi: ${config.pairCode}   Dev token: Bearer ${config.devToken}`);
console.log(`Juftlash QR: ${pairQr}`);
console.log(`Etiketkalar va juftlash QR: ${server}/dev/qr\n`);
