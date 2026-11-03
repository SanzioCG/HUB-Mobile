// AR: ar-link → AR sahifasi Chrome'da (WebXR, M-A3 tuzatishi); iOS Quick Look yo'li; xato holatlari.
import type { ApiClient } from '../src/api/client';
import { ApiError } from '../src/api/errors';
import { arPageUrl, truncateTitle } from '../src/ar/arPage';
import { openArAndroid, openArIos } from '../src/ar/openAr';
import { uz } from '../src/i18n/uz';

jest.mock('expo-constants', () => ({ expoConfig: {} }));

const FILE = 'https://abc.trycloudflare.com/files/ar/m0-r5-ar.glb?exp=1793700000&sig=ab12';
const client = (arLink: ApiClient['arLink']) => ({ arLink }) as unknown as ApiClient;

describe('AR sahifasi havolasi', () => {
  it('imzolangan havola bilan bir origin, file va title escape qilinadi', () => {
    const page = new URL(arPageUrl(FILE, 'M-0 namuna')!);
    expect(page.origin).toBe('https://abc.trycloudflare.com');
    expect(page.pathname).toBe('/ar/launch');
    expect(page.searchParams.get('file')).toBe(FILE); // & va = havola ichida buzilmaydi
    expect(page.searchParams.get('title')).toBe('M-0 namuna');
  });

  it('faqat HTTPS (WebXR talabi)', () => {
    expect(arPageUrl('http://10.0.0.5:8787/files/ar/a.glb', 'M-0')).toBeNull();
  });

  it('sarlavha ≤ 60 belgi, o‘zbekcha harflar bo‘linmaydi', () => {
    const long = 'Oʻ'.repeat(40) + ' — Oshxona shkafi, chap blok, yuqori qator';
    expect([...truncateTitle(long)]).toHaveLength(60);
    expect(truncateTitle('  qisqa  ')).toBe('qisqa');
    expect([...new URL(arPageUrl(FILE, long)!).searchParams.get('title')!]).toHaveLength(60);
  });
});

describe('openArAndroid', () => {
  const req = { itemId: 'm0', revisionId: 'm0-r5', title: 'M-0 namuna' };
  const ok = (url: string) => client(async () => ({ url, expires_at: '2026-11-03T10:10:00Z' }));

  it('HTTPS havola → AR sahifasi brauzerda ochiladi; so‘rov glb formatida', async () => {
    const arLink = jest.fn(async () => ({ url: FILE, expires_at: '' }));
    const openUrl = jest.fn(async () => true);
    expect(await openArAndroid(req, { client: client(arLink), openUrl, dev: false })).toEqual({ ok: true });
    expect(arLink).toHaveBeenCalledWith('m0', 'm0-r5', 'glb');
    expect(openUrl).toHaveBeenCalledWith(arPageUrl(FILE, 'M-0 namuna'));
  });

  it('http:// havola → ochilmaydi; dev’da aniq sabab', async () => {
    const openUrl = jest.fn();
    const http = ok('http://10.0.0.5:8787/files/ar/m0-r5-ar.glb?exp=1&sig=a');
    expect(await openArAndroid(req, { client: http, openUrl, dev: true })).toEqual({
      ok: false,
      message: uz.ar.insecureDev,
    });
    expect(await openArAndroid(req, { client: http, openUrl, dev: false })).toEqual({
      ok: false,
      message: uz.ar.insecure,
    });
    expect(openUrl).not.toHaveBeenCalled();
  });

  it('oflayn → "AR uchun internet kerak"; HTTP xato → server matni', async () => {
    const offline = client(async () => {
      throw new ApiError('network', 'x');
    });
    expect(await openArAndroid(req, { client: offline, openUrl: jest.fn(), dev: false })).toEqual({
      ok: false,
      message: uz.ar.offline,
    });
    const missing = client(async () => {
      throw new ApiError('http', 'x', 409, 'conflict', 'AR varianti topilmadi');
    });
    expect(await openArAndroid(req, { client: missing, openUrl: jest.fn(), dev: false })).toEqual({
      ok: false,
      message: 'AR varianti topilmadi',
    });
  });

  it('brauzer ochilmasa → "Bu qurilmada AR mavjud emas"', async () => {
    const openUrl = jest.fn(async () => {
      throw new Error('no browser');
    });
    expect(await openArAndroid(req, { client: ok(FILE), openUrl, dev: false })).toEqual({
      ok: false,
      message: uz.ar.unavailable,
    });
  });
});

describe('openArIos (Quick Look, Safari orqali; iOS’da sinalmagan)', () => {
  const req = { itemId: 'm0', revisionId: 'm0-r5', title: 'M-0', usdzUrl: 'https://x/files/usdz/m0-r5.usdz' };
  const USDZ = 'https://abc.trycloudflare.com/files/ar/m0-r5.usdz?exp=1&sig=a';

  it('usdz havola → Linking.openURL; so‘rov usdz formatida', async () => {
    const arLink = jest.fn(async () => ({ url: USDZ, expires_at: '' }));
    const openUrl = jest.fn(async () => true);
    expect(await openArIos(req, { client: client(arLink), openUrl })).toEqual({ ok: true });
    expect(arLink).toHaveBeenCalledWith('m0', 'm0-r5', 'usdz');
    expect(openUrl).toHaveBeenCalledWith(USDZ);
  });

  it('usdz_url null → so‘rovsiz "AR bu buyum uchun tayyor emas"', async () => {
    const arLink = jest.fn();
    expect(
      await openArIos({ ...req, usdzUrl: null }, { client: client(arLink), openUrl: jest.fn() }),
    ).toEqual({
      ok: false,
      message: uz.ar.notReady,
    });
    expect(arLink).not.toHaveBeenCalled();
  });

  it('mock: usdz → 404 → "AR bu buyum uchun tayyor emas"; oflayn → internet kerak', async () => {
    const notFound = client(async () => {
      throw new ApiError('http', 'x', 404, 'not_found', 'USDZ mock’da yo‘q (V-1b)');
    });
    expect(await openArIos(req, { client: notFound, openUrl: jest.fn() })).toEqual({
      ok: false,
      message: uz.ar.notReady,
    });
    const offline = client(async () => {
      throw new ApiError('timeout', 'x');
    });
    expect(await openArIos(req, { client: offline, openUrl: jest.fn() })).toEqual({
      ok: false,
      message: uz.ar.offline,
    });
  });
});
