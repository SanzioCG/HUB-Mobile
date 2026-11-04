// Kontrakt 1.6 (10.3): tizim "Ochish" orqali kelgan `.uhub` → "Fayldan ochilganlar"; boshqa havolalar o'zgarmaydi.
import { redirectSystemPath } from '../src/app/+native-intent';
import { incomingFileRoute } from '../src/files/incoming';

it('content:// va file:// → /files?incoming=…', () => {
  const uri = 'content://org.telegram.messenger.provider/media/v-1a-namuna.uhub';
  expect(incomingFileRoute(uri)).toBe(`/files?incoming=${encodeURIComponent(uri)}`);
  expect(incomingFileRoute('file:///sdcard/Download/v.uhub')).toMatch(/^\/files\?incoming=file%3A/);
});

it('oddiy havolalar va ichki yo‘llar o‘zgarmaydi', () => {
  expect(incomingFileRoute('uhub://projects')).toBeNull();
  expect(redirectSystemPath({ path: '/projects/101', initial: true })).toBe('/projects/101');
  expect(redirectSystemPath({ path: 'content://x/y.uhub', initial: false })).toBe(
    `/files?incoming=${encodeURIComponent('content://x/y.uhub')}`,
  );
});
