// AR tugmasi: ar-link (kontrakt 1.2, 3–4) → Android Scene Viewer yoki iOS Quick Look (Safari orqali).
// Native funksiyalar tashqaridan beriladi (testlar uchun).
import type { ApiClient } from '../api/client';
import { ApiError, errorMessage, isOfflineError } from '../api/errors';
import { uz } from '../i18n/uz';
import { ArUnavailableError, launchSceneViewer, type StartActivity } from './sceneViewer';

export interface ArRequest {
  itemId: string;
  revisionId: string;
  title: string;
}

export interface ArDeps {
  client: ApiClient;
  startActivity: StartActivity;
  /** Dev rejimda sabab aniqroq ko'rsatiladi. */
  dev: boolean;
}

export type ArResult = { ok: true } | { ok: false; message: string };

export async function openArAndroid(req: ArRequest, deps: ArDeps): Promise<ArResult> {
  let url: string;
  try {
    ({ url } = await deps.client.arLink(req.itemId, req.revisionId, 'glb'));
  } catch (e) {
    return { ok: false, message: isOfflineError(e) ? uz.ar.offline : errorMessage(e) };
  }
  // Scene Viewer fayl URL'ini faqat HTTPS orqali qabul qiladi.
  if (!url.startsWith('https://'))
    return { ok: false, message: deps.dev ? uz.ar.insecureDev : uz.ar.insecure };
  try {
    await launchSceneViewer(url, req.title, deps.startActivity);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof ArUnavailableError ? uz.ar.unavailable : errorMessage(e) };
  }
}

export interface IosArRequest extends ArRequest {
  /** Kontrakt 4: `usdz_url`. null — USDZ hali yo'q (V-1b), AR tugmasi o'chiq. */
  usdzUrl: string | null;
}

/**
 * iOS: `format: "usdz"` → imzolangan havola → `Linking.openURL` (Safari AR Quick Look'ni ochadi).
 * Expo Go'da ilova ichidan Quick Look (QLPreviewController) chaqirib bo'lmaydi. iOS qurilmasida sinalmagan.
 */
export async function openArIos(
  req: IosArRequest,
  deps: { client: ApiClient; openUrl: (url: string) => Promise<unknown> },
): Promise<ArResult> {
  if (!req.usdzUrl) return { ok: false, message: uz.ar.notReady };
  let url: string;
  try {
    ({ url } = await deps.client.arLink(req.itemId, req.revisionId, 'usdz'));
  } catch (e) {
    if (isOfflineError(e)) return { ok: false, message: uz.ar.offline };
    if (e instanceof ApiError && e.status === 404) return { ok: false, message: uz.ar.notReady };
    return { ok: false, message: errorMessage(e) };
  }
  try {
    await deps.openUrl(url);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
}
