// Kontrakt 1.3, 8-bo'lim (1.4 taklifi): viewer reliz artefakti.
// `npm run release:viewer` → build → releases/viewer/<VIEWER_VERSION>/index.html + manifest.json {viewer_version, contract, sha256}.
// U-HUB pin qilingan versiyani nusxalaydi va sha256 ni tekshiradi.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rootDir = resolve(pkgDir, '../..');

const versionSrc = readFileSync(join(pkgDir, 'src/version.ts'), 'utf8');
const constant = (name) => {
  const m = new RegExp(`export const ${name} = '([^']+)'`).exec(versionSrc);
  if (!m) throw new Error(`${name} topilmadi: src/version.ts`);
  return m[1];
};
const viewerVersion = constant('VIEWER_VERSION');
const contract = constant('VIEWER_CONTRACT');

const outDir = join(rootDir, 'releases/viewer', viewerVersion);
if (existsSync(join(outDir, 'manifest.json')) && !process.argv.includes('--force')) {
  console.error(
    `releases/viewer/${viewerVersion} allaqachon bor — VIEWER_VERSION ni oshiring (yoki --force).`,
  );
  process.exit(1);
}

execSync('npm run build', { cwd: pkgDir, stdio: 'inherit' });
const html = readFileSync(join(pkgDir, 'dist/index.html'));
const sha256 = createHash('sha256').update(html).digest('hex');

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'index.html'), html);
writeFileSync(
  join(outDir, 'manifest.json'),
  JSON.stringify({ viewer_version: viewerVersion, contract, sha256 }, null, 2) + '\n',
);
console.log(`releases/viewer/${viewerVersion}: ${(html.length / 1024).toFixed(0)} KB, sha256 ${sha256}`);
