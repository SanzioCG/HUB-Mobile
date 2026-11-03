// Android Scene Viewer (Google ARCore hujjati): intent URL va paketlar tartibi. Sof — native modulga bog'liq emas.

export const SCENE_VIEWER_BASE = 'https://arvr.google.com/scene-viewer/1.0';
export const TITLE_MAX = 60;

export type SceneViewerMode = 'ar_only' | 'ar_preferred';

/**
 * Ishga tushirish tartibi (batch M-A3): avval ARCore (`ar_only`, qaytishni ilova qiladi), bo'lmasa Google app
 * (`ar_preferred`, 3D'ga qaytish bilan).
 */
export const AR_TARGETS: readonly { packageName: string; mode: SceneViewerMode }[] = [
  { packageName: 'com.google.ar.core', mode: 'ar_only' },
  { packageName: 'com.google.android.googlequicksearchbox', mode: 'ar_preferred' },
];

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

export type StartActivity = (
  action: string,
  params: { data: string; packageName: string },
) => Promise<unknown>;

export class ArUnavailableError extends Error {
  constructor() {
    super('Scene Viewer ochilmadi: ARCore ham, Google app ham yo‘q');
    this.name = 'ArUnavailableError';
  }
}

/** Paketlarni tartib bilan sinaydi; ochilganining nomini qaytaradi. Hech biri bo'lmasa — ArUnavailableError. */
export async function launchSceneViewer(
  fileUrl: string,
  title: string,
  start: StartActivity,
): Promise<string> {
  for (const t of AR_TARGETS) {
    try {
      await start('android.intent.action.VIEW', {
        data: sceneViewerUrl(fileUrl, t.mode, title),
        packageName: t.packageName,
      });
      return t.packageName;
    } catch {
      // paket o'rnatilmagan yoki intent qabul qilinmadi — keyingisi
    }
  }
  throw new ArUnavailableError();
}
