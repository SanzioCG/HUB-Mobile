// AR tugmasi (kontrakt 1.4, 3–4): `POST /mobile/ar-link {item_id, revision_id}` → `launch_url` → tizim brauzeri.
// Android: Chrome (Custom Tabs yoki to'liq, `config.AR_OPEN`), M-A5 — interaktiv WebXR. iOS: Safari, Quick Look (statik).
// Tashqi funksiyalar (openUrl) parametr sifatida beriladi — testlar uchun.
import type { ApiClient } from '../api/client';
import { ApiError, errorMessage, isOfflineError } from '../api/errors';
import { uz } from '../i18n/uz';
import { arLaunchUrl, type OpenUrl } from './arPage';

export interface ArRequest {
  itemId: string;
  revisionId: string;
  title: string;
}

export interface ArDeps {
  client: ApiClient;
  /** AR sahifasini brauzerda ochish — Custom Tabs yoki to'liq Chrome (`config.AR_OPEN`). */
  openUrl: OpenUrl;
  /** Dev rejimda sabab aniqroq ko'rsatiladi. */
  dev: boolean;
}

export type ArResult = { ok: true } | { ok: false; message: string };

export async function openArAndroid(req: ArRequest, deps: ArDeps): Promise<ArResult> {
  let link: { launch_url: string };
  try {
    link = await deps.client.arLink(req.itemId, req.revisionId);
  } catch (e) {
    return { ok: false, message: isOfflineError(e) ? uz.ar.offline : errorMessage(e) };
  }
  // WebXR faqat HTTPS sahifada ishlaydi.
  const page = arLaunchUrl(link);
  if (!page) return { ok: false, message: deps.dev ? uz.ar.insecureDev : uz.ar.insecure };
  try {
    await deps.openUrl(page);
    return { ok: true };
  } catch (e) {
    // Dev'da asl sabab ham ko'rsatiladi (qurilmadagi diagnostika uchun).
    const detail = deps.dev ? ` (${e instanceof Error ? e.message : String(e)})` : '';
    return { ok: false, message: `${uz.ar.unavailable}${detail}` };
  }
}

export interface IosArRequest extends ArRequest {
  /** Kontrakt 4: `usdz_url`. null — USDZ hali yo'q (V-1b), AR tugmasi o'chiq. */
  usdzUrl: string | null;
}

/**
 * iOS: `launch_url` → Safari (sahifa `ios-src` = USDZ bilan Quick Look'ni ochadi, kontrakt 3).
 * Expo Go'da ilova ichidan Quick Look chaqirib bo'lmaydi. iOS qurilmasida sinalmagan.
 */
export async function openArIos(
  req: IosArRequest,
  deps: { client: ApiClient; openUrl: (url: string) => Promise<unknown> },
): Promise<ArResult> {
  if (!req.usdzUrl) return { ok: false, message: uz.ar.notReady };
  let link: { launch_url: string; usdz_url: string | null };
  try {
    link = await deps.client.arLink(req.itemId, req.revisionId);
  } catch (e) {
    if (isOfflineError(e)) return { ok: false, message: uz.ar.offline };
    if (e instanceof ApiError && e.status === 404) return { ok: false, message: uz.ar.notReady };
    return { ok: false, message: errorMessage(e) };
  }
  if (!link.usdz_url) return { ok: false, message: uz.ar.notReady };
  try {
    await deps.openUrl(link.launch_url);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
}
