// Kontrakt 1.6 (10.4): QR → detal, telefondagi `.uhub` fayllaridan — to'rt holat aynan kontrakt matnlari bilan.
import type { UhubItem } from '@hub-mobile/viewer/uhub';
import { fileLabelTarget } from '../src/files/resolveFile';
import { uz } from '../src/i18n/uz';

const item = (over: Partial<UhubItem>): UhubItem => ({
  item_id: 'shkaf-600',
  name: 'Shkaf 600',
  revision_id: 'rev-14',
  revision_label: 'R14',
  approved: false,
  snapshot: 'joriy',
  size_mm: { width: 600, height: 720, depth: 578 },
  transform: { translation: [0.3, 0, 0.018], rotation: [0, 0, 0, 1] },
  glb: 'viewer/shkaf-600.glb',
  thumb: null,
  parts: [{ uid: 'f522b1a9', number: '8', name: 'Tortma fasadi 2', kind: 'drawer_front' }],
  warnings: [],
  ...over,
});
const FILES = [{ id: 'p64-abc', project_number: 64, items: [item({})] }];

it('1) shu loyiha fayli yo‘q → "Bu loyiha telefonda yo‘q — faylini oching"', () => {
  expect(fileLabelTarget('uhub:p/51/f522b1a9/joriy', FILES)).toEqual({
    ok: false,
    message: 'Bu loyiha telefonda yo‘q — faylini oching',
    noFile: true,
  });
});

it('2) snapshot mos → o‘sha buyum va detal (banner yo‘q)', () => {
  expect(fileLabelTarget('uhub:p/64/f522b1a9/joriy', FILES)).toEqual({
    ok: true,
    params: { fileId: 'p64-abc', item: 'shkaf-600', uid: 'f522b1a9' },
  });
});

it('3) snapshot mos emas, detal faylda bor → sariq banner', () => {
  expect(fileLabelTarget('uhub:p/64/f522b1a9/eski', FILES)).toEqual({
    ok: true,
    params: {
      fileId: 'p64-abc',
      item: 'shkaf-600',
      uid: 'f522b1a9',
      banner: 'Etiketka boshqa reviziyadan. Fayldagi: R14',
    },
  });
});

it('4) detal fayldagi reviziyada yo‘q', () => {
  expect(fileLabelTarget('uhub:p/64/yoq/joriy', FILES)).toEqual({
    ok: false,
    message: 'Bu detal fayldagi reviziyada yo‘q',
    noFile: false,
  });
});

it('buzilgan etiketka → "Etiketka o‘qilmadi"', () => {
  expect(fileLabelTarget('uhub:xyz', FILES)).toEqual({ ok: false, message: uz.errors.badQr, noFile: false });
});
