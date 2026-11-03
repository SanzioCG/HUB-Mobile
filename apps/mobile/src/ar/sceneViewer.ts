// Android Scene Viewer (Google ARCore hujjati): intent URL va ishga tushirish tartibi. Sof — native modulga bog'liq emas.
//
// expo-intent-launcher (SDK 58) `packageName` ni faqat `className` bilan birga ishlatadi (setComponent); `setPackage`
// yo'q. Faqat `packageName` berilsa intent paketsiz ketadi va brauzerda ochiladi — Scene Viewer ishga tushmaydi
// (M-A3 da telefonda shunday bo'lgan). Shuning uchun:
//   1) ilova ichidan — ARCore'ning yo'naltiruvchi activity'si aniq komponent sifatida;
//   2) zaxira — Chrome'da sahifa, undan Google hujjatidagi `intent://…;package=…;end` havolasi (rasmiy web yo'li).

export const SCENE_VIEWER_BASE = 'https://arvr.google.com/scene-viewer/1.0';
export const TITLE_MAX = 60;

export type SceneViewerMode = 'ar_only' | 'ar_preferred';

/**
 * ARCore'ning Scene Viewer yo'naltiruvchisi. Hujjatlashtirilmagan komponent (model-viewer muhokamasi #1868,
 * Flutter plaginlari ishlatadi) — mavjud bo'lmasa ishga tushirish xato beradi va zaxira yo'lga o'tiladi.
 * `ar_only` — Google hujjati: `com.google.ar.core` ga aniq intent bilan.
 */
export const ARCORE_TARGET = {
  packageName: 'com.google.ar.core',
  className: 'com.google.ar.core.viewer.IntentForwardActivity',
  mode: 'ar_only',
} as const;

/** Chrome orqali (zaxira): Google app, `ar_preferred` — Google hujjatidagi web yo'li. */
export const GOOGLE_APP_PACKAGE = 'com.google.android.googlequicksearchbox';

/** Sarlavha ≤ 60 belgi (kod nuqtalari bo'yicha — o'zbekcha harflar bo'linmasin). */
export const truncateTitle = (title: string) => [...title.trim()].slice(0, TITLE_MAX).join('');

/** `resizable=false` — AR'da masshtablash o'chiq: real o'lcham uchun majburiy (kontrakt 7: ±1 %). */
export function sceneViewerUrl(fileUrl: string, mode: SceneViewerMode, title: string): string {
  const params = [
    `file=${encodeURIComponent(fileUrl)}`,
    `mode=${mode}`,
    'resizable=false',
    `title=${encodeURIComponent(truncateTitle(title))}`,
  ];
  return `${SCENE_VIEWER_BASE}?${params.join('&')}`;
}

/**
 * Zaxira: AR ishga tushiruvchi sahifa (mock `GET /ar/launch`, imzolangan havola bilan bir origin'da).
 * TODO(contract): bunday sahifa kontraktda yo'q — faqat mock; haqiqiy backend uchun taklif (M-A3 hisoboti).
 */
export function launcherPageUrl(fileUrl: string, title: string): string | null {
  const origin = /^(https:\/\/[^/]+)/i.exec(fileUrl)?.[1];
  if (!origin) return null;
  return `${origin}/ar/launch?file=${encodeURIComponent(fileUrl)}&title=${encodeURIComponent(truncateTitle(title))}`;
}

export type StartActivity = (
  action: string,
  params: { data: string; packageName: string; className: string },
) => Promise<unknown>;

export type OpenUrl = (url: string) => Promise<unknown>;

export class ArUnavailableError extends Error {
  constructor() {
    super('Scene Viewer ochilmadi: ARCore yo‘naltiruvchisi ham, brauzer sahifasi ham ishlamadi');
    this.name = 'ArUnavailableError';
  }
}

export type LaunchRoute = 'arcore' | 'browser';

/** Avval ilova ichidan (ARCore), bo'lmasa brauzer sahifasi orqali. Qaysi yo'l ishlaganini qaytaradi. */
export async function launchSceneViewer(
  fileUrl: string,
  title: string,
  start: StartActivity,
  openUrl: OpenUrl,
): Promise<LaunchRoute> {
  try {
    await start('android.intent.action.VIEW', {
      data: sceneViewerUrl(fileUrl, ARCORE_TARGET.mode, title),
      packageName: ARCORE_TARGET.packageName,
      className: ARCORE_TARGET.className,
    });
    return 'arcore';
  } catch {
    // ARCore o'rnatilmagan yoki komponent topilmadi — brauzer yo'li
  }
  const page = launcherPageUrl(fileUrl, title);
  if (page) {
    try {
      await openUrl(page);
      return 'browser';
    } catch {
      // brauzer ham ochilmadi
    }
  }
  throw new ArUnavailableError();
}
