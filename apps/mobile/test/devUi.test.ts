// M-A8, 3-qism: release'da dev elementlari ko'rinmaydi. Tekshiruv ro'yxati (SHOW_DEV_UI ga bog'langan):
// Sozlamalar → "Dasturchi" (Spike), 3D ekran statistikasi (ms · fps · △ · MB), dev/spike marshruti (Stack.Protected),
// juftlashda server manzilini qo'lda o'zgartirish, fayl xatosining texnik tafsiloti, AR xatosining dev sababi.
import { appVariantOf, showDevUi } from '../src/config';

jest.mock('expo-constants', () => ({ expoConfig: { extra: { appVariant: 'internal' } } }));

it('variant: faqat ma’lum qiymatlar, aks holda development', () => {
  expect(appVariantOf('internal')).toBe('internal');
  expect(appVariantOf('production')).toBe('production');
  expect(appVariantOf(undefined)).toBe('development');
  expect(appVariantOf('boshqa')).toBe('development');
});

it('dev elementlari: Expo Go/Metro (__DEV__) yoki development build — ha; internal/production release — yo‘q', () => {
  expect(showDevUi('development', false)).toBe(true);
  expect(showDevUi('internal', true)).toBe(true);
  expect(showDevUi('internal', false)).toBe(false);
  expect(showDevUi('production', false)).toBe(false);
});
