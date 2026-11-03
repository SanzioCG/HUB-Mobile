// AR tugmasi: ar-link (kontrakt 1.2, 3–4) → Android Scene Viewer. Native funksiyalar tashqaridan beriladi (testlar uchun).
import type { ApiClient } from '../api/client';
import { errorMessage, isOfflineError } from '../api/errors';
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
