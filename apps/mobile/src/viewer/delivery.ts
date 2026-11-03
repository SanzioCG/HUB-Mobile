// GLB'ni viewer'ga yetkazish — ikki yo'l (ADR-M002). Fayl RN → WebView orqali base64 bilan uzatilmaydi.
//   A (online):  viewer HTML `source.html` + `baseUrl` = server; viewer GLB'ni o'zi fetch qiladi (token header'da).
//   B (offline): GLB `documentDirectory/cache/<revision_id>.glb` ga yuklanadi, viewer.html shu katalogga yoziladi,
//                WebView `file://` dan ochiladi, viewer GLB'ni nisbiy yo'l bilan oladi.
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import type { Delivery } from '../config';
import { cacheDir, ensureCached, isCached } from '../offline/glbCache';
import { glbFileName } from '../offline/policy';

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

export async function prepareOffline(glbUrl: string, revisionId: string, token: string): Promise<Prepared> {
  const dir = cacheDir();
  if (!dir.exists) dir.create({ intermediates: true });

  // Viewer HTML har safar yangilanadi (lokal nusxa, arzon) — bundle yangilansa eski qolmasin.
  const viewer = new File(dir, 'viewer.html');
  if (viewer.exists) viewer.delete();
  await (await viewerFile()).copy(viewer);

  // GLB — oflayn kesh orqali (LRU indeksi bilan); URL reviziya bo'yicha o'zgarmas → bor bo'lsa qayta yuklanmaydi.
  const cacheHit = await isCached(revisionId);
  const t0 = Date.now();
  await ensureCached(revisionId, glbUrl, token);

  return {
    delivery: 'offline',
    source: { uri: viewer.uri },
    glbUrl: glbFileName(revisionId), // nisbiy: viewer.html bilan bir katalogda
    token: '',
    fileAccess: true,
    readAccessUrl: dir.uri,
    downloadMs: cacheHit ? null : Date.now() - t0,
    cacheHit,
  };
}

export function prepare(delivery: Delivery, glbUrl: string, revisionId: string, token: string) {
  return delivery === 'offline' ? prepareOffline(glbUrl, revisionId, token) : prepareOnline(glbUrl, token);
}
