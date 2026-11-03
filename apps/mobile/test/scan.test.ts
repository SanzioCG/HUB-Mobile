import type { ResolveResponse } from '../src/api/types';
import { createDebouncer, isUhubQr, parseQr, qrKey } from '../src/scan/qr';
import { pushRecent, RECENT_MAX, type RecentScan } from '../src/scan/recent';

jest.mock('@react-native-async-storage/async-storage', () => ({}));

describe('QR matni', () => {
  it('uhub: tekshiruvi', () => {
    expect(isUhubQr('uhub:p/51/m0p06/s5')).toBe(true);
    expect(isUhubQr('https://example.com')).toBe(false);
    expect(isUhubQr('')).toBe(false);
  });

  it('tahlil: oddiy va `/` li uid; kesh kaliti', () => {
    expect(parseQr('uhub:p/51/m0p06/s5')).toEqual({ projectNumber: 51, uid: 'm0p06', snapshot: 's5' });
    const p = parseQr('uhub:p/51/A1/B2.c/s3')!;
    expect(p).toEqual({ projectNumber: 51, uid: 'A1/B2.c', snapshot: 's3' });
    expect(qrKey(p)).toBe('51/A1/B2.c/s3');
    expect(parseQr('uhub:p/51/m0p06')).toBeNull();
    expect(parseQr('uhub:x')).toBeNull();
  });

  it('debounce: bir xil matn 2 s ichida qayta o‘qilmaydi, boshqasi o‘qiladi', () => {
    let t = 0;
    const accept = createDebouncer(2000, () => t);
    expect(accept('a')).toBe(true);
    t = 1500;
    expect(accept('a')).toBe(false);
    expect(accept('b')).toBe(true);
    t = 1600;
    expect(accept('a')).toBe(true); // oxirgi o'qilgan 'b' edi
    t = 3700;
    expect(accept('a')).toBe(true);
  });
});

describe('Oxirgi skanerlar', () => {
  const scan = (qr: string, at: number, part_number?: string): RecentScan => ({
    qr,
    at,
    result: { part_name: qr } as ResolveResponse,
    part_number,
  });

  it('yangisi boshida, takror QR bitta yozuv, ko‘pi bilan 10', () => {
    let list: RecentScan[] = [];
    for (let i = 0; i < 12; i++) list = pushRecent(list, scan(`q${i}`, i));
    expect(list).toHaveLength(RECENT_MAX);
    expect(list[0]!.qr).toBe('q11');
    list = pushRecent(list, scan('q5', 100));
    expect(list[0]!.qr).toBe('q5');
    expect(list.filter((s) => s.qr === 'q5')).toHaveLength(1);
  });

  it('qayta skanerlanganda ma’lum raqam saqlanadi', () => {
    const list = pushRecent([scan('q1', 1, '12')], scan('q1', 2));
    expect(list[0]).toMatchObject({ at: 2, part_number: '12' });
  });
});
