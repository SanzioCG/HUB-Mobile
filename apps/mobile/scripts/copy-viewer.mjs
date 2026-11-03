// packages/viewer/dist/index.html → apps/mobile/assets/viewer/viewer.html (Metro asset, ADR-M002).
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('../../../packages/viewer/dist/index.html', import.meta.url));
const dir = fileURLToPath(new URL('../assets/viewer/', import.meta.url));
const dst = `${dir}viewer.html`;

if (!existsSync(src)) {
  console.error(`viewer build topilmadi: ${src}\n  avval: npm run build -w @hub-mobile/viewer`);
  process.exit(1);
}
mkdirSync(dir, { recursive: true });
copyFileSync(src, dst);
console.log(`viewer.html → ${dst} (${(statSync(dst).size / 1024).toFixed(1)} KB)`);
