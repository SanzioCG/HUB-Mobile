// Oxirgi JS xatosi saqlanadi (release'da ilova yopilsa ham sababi Sozlamalar'da ko'rinadi).
jest.mock('../src/ui/Icon', () => ({ Icon: () => null }));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  clearLastError,
  describeError,
  installGlobalErrorCapture,
  loadLastError,
  saveLastError,
} from '../src/diag/lastError';
import { labelsFromParts } from '../src/offline/labels';
import { locationOf } from '../src/components/PartSheet';
import { parseQr } from '../src/scan/qr';

describe('oxirgi xato', () => {
  beforeEach(() => clearLastError());

  it('saqlanadi va o‘qiladi; tozalanadi', async () => {
    await saveLastError('screen', new TypeError('x is undefined'), () => new Date('2026-11-09T10:00:00Z'));
    const e = await loadLastError();
    expect(e).toMatchObject({ at: '2026-11-09T10:00:00.000Z', where: 'screen' });
    expect(e!.message).toMatch(/^TypeError: x is undefined/);
    await clearLastError();
    expect(await loadLastError()).toBeNull();
  });

  it('matn uzunligi cheklangan; Error bo‘lmagan qiymat ham', () => {
    expect(describeError('a'.repeat(5000))).toHaveLength(2000);
    expect(describeError(42)).toBe('42');
  });

  it('global ishlovchi: avval saqlaydi, keyin odatdagi ishlovchini chaqiradi', async () => {
    const prev = jest.fn();
    let handler: (e: unknown, fatal?: boolean) => void = () => undefined;
    installGlobalErrorCapture({ getGlobalHandler: () => prev, setGlobalHandler: (fn) => (handler = fn) });
    const err = new Error('yiqildi');
    handler(err, true);
    await new Promise((r) => setTimeout(r, 0));
    expect(prev).toHaveBeenCalledWith(err, true);
    expect((await loadLastError())?.where).toBe('fatal');
  });

  it('ErrorUtils yo‘q bo‘lsa — hech narsa qilmaydi', () => {
    expect(() => installGlobalErrorCapture(undefined)).not.toThrow();
  });
});

describe('U-HUB id’lari (kontrakt 4: shaffof satr)', () => {
  it('etiketka yozuvida project_id UUID bo‘lib qoladi (NaN emas)', () => {
    const id = '05f7cbb9-d045-491a-b747-eb176c0874db';
    const labels = labelsFromParts([{ uid: 'p1', name: 'Chap yon devor', qr: 'uhub:p/47/p1/joriy' }], {
      project_id: id,
      item_id: 'f4c2',
      item_name: 'Shkaf 1',
      revision_id: 'r275',
      revision_label: 'R275',
      glb_url: 'http://10.84.42.246:8000/mobile/files/glb/r275.glb',
    });
    expect(Object.values(labels)[0]?.project_id).toBe(id);
    expect(JSON.parse(JSON.stringify(labels))).toEqual(labels);
  });
});

// U-HUB V-1 haqiqiy GLB'i (loyiha №47): furniturada `qr: null`, `number: null`, `reveal`/`edges` yo'q. Mock'da bular
// doim bor edi — `loaded` dagi `parseQr(null).trim()` release'da ilovani yopardi.
describe('furnitura detallari (kontrakt 2.6)', () => {
  const hw = {
    kind: 'hardware',
    uid: 'lift_7b2e_arm_left',
    number: null,
    name: 'Pantograf — arm_left',
    qr: null,
    supplier: 'Higold',
    size_mm: [600, 40, 20],
  };

  it('parseQr: satr bo‘lmasa null, yiqilmaydi', () => {
    expect(parseQr(null)).toBeNull();
    expect(parseQr(undefined)).toBeNull();
    expect(parseQr('uhub:p/47/a/joriy')).toEqual({ projectNumber: 47, uid: 'a', snapshot: 'joriy' });
  });

  it('labelsFromParts: qr null detallar o‘tkaziladi', () => {
    const labels = labelsFromParts([hw, { uid: 'p1', name: 'Yon devor', qr: 'uhub:p/47/p1/joriy' }], {
      project_id: 'x',
      item_id: 'i',
      item_name: 'Shkaf 1',
      revision_id: 'r',
      revision_label: 'R275',
      glb_url: 'http://h/g.glb',
    });
    expect(Object.keys(labels)).toEqual(['47/p1/joriy']);
  });

  it('locationOf: reveal yo‘q — null', () => {
    expect(locationOf(hw)).toBeNull();
  });
});
