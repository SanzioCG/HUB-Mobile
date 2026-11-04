// M-A6: `npm run check:assets` — assets/ nazorati (docs/design/ASSETS.md).
// - O'lcham va format (masalan icon.png 1024×1024, shaffofliksiz) — XATO (gate yiqiladi).
// - Vaqtinchalik (TMP) fayllar — OGOHLANTIRISH: PNG — ochilgan piksel ma'lumoti (IDAT, zlib) SHA-256 si
//   assets/.placeholders.json ro'yxatida; SVG — `TMP placeholder` izohi. `--strict` (production build, keyin) — TMP ham xato.
// - `--list-tmp` — faqat TMP fayllar ro'yxati (gate xulosasi uchun).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'assets');
const strict = process.argv.includes('--strict');
const listTmp = process.argv.includes('--list-tmp');

/** ASSETS.md jadvali. `alpha`: true — shaffof bo'lishi shart, false — shaffofliksiz. */
const PNG_SPEC = {
  'brand/icon.png': { w: 1024, h: 1024, alpha: false },
  'brand/adaptive-foreground.png': { w: 1024, h: 1024, alpha: true },
  'brand/adaptive-monochrome.png': { w: 1024, h: 1024, alpha: true },
  'brand/splash-icon.png': { w: 1024, h: 1024, alpha: true },
  'brand/loading-bg.png': { w: 1290, h: 2796 },
  'brand/favicon-48.png': { w: 48, h: 48 },
};
const SVG_REQUIRED = [
  'brand/logo-full.svg',
  'brand/logo-mark.svg',
  'brand/favicon.svg',
  ...[
    'door-open',
    'door-close',
    'drawer-open',
    'drawer-close',
    'open-all',
    'swing-zone',
    'hotspot',
    'cabinet',
  ].map((n) => `icons/${n}.svg`),
  ...['pair-scan', 'ar-coach', 'empty-projects', 'empty-offline', 'camera-denied', 'ar-unsupported'].map(
    (n) => `illustrations/${n}.svg`,
  ),
];

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** PNG: o'lcham, rang turi, tRNS va ochilgan IDAT hash'i. */
export function readPng(buf) {
  if (!buf.subarray(0, 8).equals(PNG_SIG)) throw new Error('PNG emas');
  let off = 8;
  let ihdr = null;
  let trns = false;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('latin1', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') ihdr = { w: data.readUInt32BE(0), h: data.readUInt32BE(4), colorType: data[9] };
    else if (type === 'tRNS') trns = true;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (!ihdr) throw new Error('IHDR yo‘q');
  const pixels = inflateSync(Buffer.concat(idat));
  // 4 — kulrang + alfa, 6 — RGBA; palitra/kulrang/RGB + tRNS ham shaffof.
  const hasAlpha = ihdr.colorType === 4 || ihdr.colorType === 6 || trns;
  return { ...ihdr, hasAlpha, pixelHash: createHash('sha256').update(pixels).digest('hex') };
}

const placeholdersFile = path.join(ASSETS, '.placeholders.json');
const placeholders = existsSync(placeholdersFile)
  ? (JSON.parse(readFileSync(placeholdersFile, 'utf8')).png ?? {})
  : {};

const errors = [];
const tmp = [];

for (const [rel, spec] of Object.entries(PNG_SPEC)) {
  const file = path.join(ASSETS, rel);
  if (!existsSync(file)) {
    errors.push(`${rel}: fayl yo'q`);
    continue;
  }
  let png;
  try {
    png = readPng(readFileSync(file));
  } catch (e) {
    errors.push(`${rel}: ${e.message}`);
    continue;
  }
  if (png.w !== spec.w || png.h !== spec.h)
    errors.push(`${rel}: ${png.w}×${png.h}, kerak ${spec.w}×${spec.h}`);
  if (spec.alpha === false && png.hasAlpha)
    errors.push(`${rel}: shaffoflik kanali bor — shaffofliksiz (RGB) bo'lishi kerak`);
  if (spec.alpha === true && !png.hasAlpha) errors.push(`${rel}: shaffof (alfa kanali bilan) bo'lishi kerak`);
  if (placeholders[rel] === png.pixelHash) tmp.push(rel);
}

for (const rel of SVG_REQUIRED) {
  const file = path.join(ASSETS, rel);
  if (!existsSync(file)) {
    errors.push(`${rel}: fayl yo'q`);
    continue;
  }
  const svg = readFileSync(file, 'utf8');
  const vb = /viewBox="([^"]+)"/.exec(svg)?.[1];
  if (!/<svg[\s>]/.test(svg) || !vb) errors.push(`${rel}: SVG emas yoki viewBox yo'q`);
  if (rel.startsWith('icons/')) {
    if (
      vb &&
      vb
        .trim()
        .split(/[\s,]+/)
        .join(' ') !== '0 0 24 24'
    )
      errors.push(`${rel}: viewBox "${vb}", kerak "0 0 24 24"`);
    if (!svg.includes('currentColor'))
      errors.push(`${rel}: rang currentColor bo'lishi kerak (rangni kod beradi)`);
  }
  if (/TMP placeholder/.test(svg)) tmp.push(rel);
}

// Qo'shimcha SVG'lar ham TMP belgisi uchun ko'riladi.
for (const dir of ['brand', 'icons', 'illustrations']) {
  for (const f of readdirSync(path.join(ASSETS, dir))) {
    const rel = `${dir}/${f}`;
    if (
      f.endsWith('.svg') &&
      !SVG_REQUIRED.includes(rel) &&
      /TMP placeholder/.test(readFileSync(path.join(ASSETS, rel), 'utf8'))
    )
      tmp.push(rel);
  }
}

if (listTmp) {
  for (const t of tmp) console.log(t);
  process.exit(0);
}
for (const e of errors) console.error(`XATO  ${e}`);
for (const t of tmp) console.warn(`TMP   ${t}`);
console.log(`assets: ${errors.length} xato, ${tmp.length} TMP fayl`);
if (errors.length || (strict && tmp.length)) process.exit(1);
