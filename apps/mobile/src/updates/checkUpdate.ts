// M-A8: OTA (EAS Update). Avtomatik: ilova ochilganda tekshiradi, fonda yuklaydi, keyingi ochilishda qo'llaydi
// (app.config `updates.checkAutomatically: ON_LOAD`, `fallbackToCacheTimeout: 0`). Bu — Sozlamalardagi qo'lda tekshirish.
// Updates API parametr sifatida beriladi — testlar uchun.

export interface UpdatesApi {
  isEnabled: boolean;
  checkForUpdateAsync(): Promise<{ isAvailable: boolean }>;
  fetchUpdateAsync(): Promise<{ isNew: boolean }>;
}

export type UpdateCheck =
  /** Expo Go / dev / updates o'chiq — faqat o'rnatilgan ilovada (APK) ishlaydi. */
  | { kind: 'disabled' }
  | { kind: 'none' }
  /** Yuklandi — qayta ishga tushirilganda qo'llanadi. */
  | { kind: 'ready' }
  | { kind: 'error'; message: string };

export async function checkAndFetch(api: UpdatesApi): Promise<UpdateCheck> {
  if (!api.isEnabled) return { kind: 'disabled' };
  try {
    const res = await api.checkForUpdateAsync();
    if (!res.isAvailable) return { kind: 'none' };
    const fetched = await api.fetchUpdateAsync();
    return fetched.isNew ? { kind: 'ready' } : { kind: 'none' };
  } catch (e) {
    return { kind: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}
