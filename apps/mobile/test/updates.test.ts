// M-A8, 4-qism: OTA — qo'lda tekshirish (Sozlamalar). Avtomatik tekshirish — expo-updates (ON_LOAD, fon).
import { checkAndFetch, type UpdatesApi } from '../src/updates/checkUpdate';

const api = (over: Partial<UpdatesApi>): UpdatesApi => ({
  isEnabled: true,
  checkForUpdateAsync: jest.fn(async () => ({ isAvailable: false })),
  fetchUpdateAsync: jest.fn(async () => ({ isNew: true })),
  ...over,
});

it('Expo Go / dev (updates o‘chiq) — so‘rovsiz "faqat APK da"', async () => {
  const a = api({ isEnabled: false });
  expect(await checkAndFetch(a)).toEqual({ kind: 'disabled' });
  expect(a.checkForUpdateAsync).not.toHaveBeenCalled();
});

it('yangilanish yo‘q / bor → yuklanadi (qayta ishga tushirishda qo‘llanadi)', async () => {
  expect(await checkAndFetch(api({}))).toEqual({ kind: 'none' });
  const a = api({ checkForUpdateAsync: jest.fn(async () => ({ isAvailable: true })) });
  expect(await checkAndFetch(a)).toEqual({ kind: 'ready' });
  expect(a.fetchUpdateAsync).toHaveBeenCalled();
});

it('tarmoq xatosi — yiqilmaydi, xabar', async () => {
  const a = api({ checkForUpdateAsync: jest.fn(async () => Promise.reject(new Error('offline'))) });
  expect(await checkAndFetch(a)).toEqual({ kind: 'error', message: 'offline' });
});
