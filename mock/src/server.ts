import { networkInterfaces } from 'node:os';
import { buildApp } from './app.js';
import { config } from './config.js';
import { createStore } from './data.js';
import { QR_DIR, readGlbFixtures } from './fixtures.js';

const glbs = await readGlbFixtures();
const app = buildApp({
  store: await createStore(glbs),
  glbs,
  devToken: config.devToken,
  pairCode: config.pairCode,
  qrDir: QR_DIR,
  logger: true,
});

await app.listen({ host: config.host, port: config.port });

const lan = Object.values(networkInterfaces())
  .flat()
  .filter((a) => a && a.family === 'IPv4' && !a.internal)
  .map((a) => `http://${a!.address}:${config.port}`);
console.log(`\nMock API: ${lan.join(', ') || `http://localhost:${config.port}`}`);
console.log(`Juftlash kodi: ${config.pairCode}   Dev token: Bearer ${config.devToken}`);
console.log(`Etiketkalar: /dev/qr\n`);
