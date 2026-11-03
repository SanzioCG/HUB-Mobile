// GLB'ni viewer'ga yetkazish — ikki yo'l (ADR-M002). Fayl RN → WebView orqali base64 bilan uzatilmaydi.
//   A (online):  viewer HTML `source.html` + `baseUrl` = server; viewer GLB'ni o'zi fetch qiladi (token header'da).
//   B (offline): GLB `documentDirectory/cache/<revision_id>.glb` ga yuklanadi, viewer.html shu katalogga yoziladi,
//                WebView `file://` dan ochiladi, viewer GLB'ni nisbiy yo'l bilan oladi.
import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import type { Delivery } from '../config';

// Metro asset (metro.config.js: assetExts += html). Fayl `npm run copy-viewer` bilan yaratiladi.
const VIEWER_HTML = require('../../assets/viewer/viewer.html') as number;

export type ViewerSource = { html: string; baseUrl: string } | { uri: string };

export interface Prepared {
  delivery: Delivery;
  source: ViewerSource;
  /** Viewer'ga `load` bilan yuboriladigan manzil va token. */
  glbUrl: string;
  token: string;
  /** B: WebView'ga fayl o'qish ruxsatlari. */
  fileAccess: boolean;
  readAccessUrl?: string;
  /** B: yuklab olish vaqti (ms); keshdan bo'lsa null. */
  downloadMs: number | null;
  cacheHit: boolean;
}

const originOf = (url: string) => /^(https?:\/\/[^/]+)/i.exec(url)?.[1] ?? null;

/** Viewer bundle'ining lokal fayli (Expo Go'da Metro'dan yuklab, keshga yoziladi). */
async function viewerFile(): Promise<File> {
  const asset = Asset.fromModule(VIEWER_HTML);
  await asset.downloadAsync();
  if (!asset.localUri) throw new Error('viewer.html: localUri yo‘q');
  return new File(asset.localUri);
}

export async function prepareOnline(glbUrl: string, token: string): Promise<Prepared> {
  const origin = originOf(glbUrl);
  if (!origin) throw new Error(`glb_url http(s) emas: ${glbUrl}`);
  const html = await (await viewerFile()).text();
  // baseUrl = server: sahifa server origin'ida, fetch bir xil origin'ga (CORS va file:// cheklovlarisiz).
  return {
    delivery: 'online',
    source: { html, baseUrl: `${origin}/` },
    glbUrl,
    token,
    fileAccess: false,
    downloadMs: null,
    cacheHit: false,
  };
}

export function cacheDir(): Directory {
  return new Directory(Paths.document, 'cache');
}

const safeName = (revisionId: string) => revisionId.replace(/[^A-Za-z0-9._-]/g, '_');

export async function prepareOffline(glbUrl: string, revisionId: string, token: string): Promise<Prepared> {
  const dir = cacheDir();
  if (!dir.exists) dir.create({ intermediates: true });

  // Viewer HTML har safar yangilanadi (lokal nusxa, arzon) — bundle yangilansa eski qolmasin.
  const viewer = new File(dir, 'viewer.html');
  if (viewer.exists) viewer.delete();
  await (await viewerFile()).copy(viewer);

  // GLB URL reviziya bo'yicha o'zgarmas (kontrakt 4) → fayl bor bo'lsa qayta yuklanmaydi.
  const name = `${safeName(revisionId)}.glb`;
  const glb = new File(dir, name);
  const cacheHit = glb.exists;
  let downloadMs: number | null = null;
  if (!cacheHit) {
    const part = new File(dir, `${name}.part`);
    if (part.exists) part.delete();
    const t0 = Date.now();
    await File.downloadFileAsync(glbUrl, part, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      idempotent: true,
    });
    if (!isGlb(part)) {
      part.delete();
      throw new Error('yuklangan fayl GLB emas (server xatosi?)');
    }
    await part.move(glb);
    downloadMs = Date.now() - t0;
  }

  return {
    delivery: 'offline',
    source: { uri: viewer.uri },
    glbUrl: name, // nisbiy: viewer.html bilan bir katalogda
    token: '',
    fileAccess: true,
    readAccessUrl: dir.uri,
    downloadMs,
    cacheHit,
  };
}

/** glTF binary sarlavhasi: "glTF". */
function isGlb(file: File): boolean {
  const h = file.open();
  try {
    const magic = h.readBytesSync(4);
    return String.fromCharCode(...magic) === 'glTF';
  } finally {
    h.close();
  }
}

export function clearCache(): void {
  const dir = cacheDir();
  if (dir.exists) dir.delete();
}

export function prepare(delivery: Delivery, glbUrl: string, revisionId: string, token: string) {
  return delivery === 'offline' ? prepareOffline(glbUrl, revisionId, token) : prepareOnline(glbUrl, token);
}
