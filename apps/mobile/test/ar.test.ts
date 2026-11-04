// AR (kontrakt 1.4, 3–4): ar-link {item_id, revision_id} → launch_url → tizim brauzeri; iOS Quick Look yo'li; xatolar.
import type { ApiClient } from '../src/api/client';
import type { ArLinkResponse } from '../src/api/types';
import { ApiError } from '../src/api/errors';
import { arLaunchUrl } from '../src/ar/arPage';
import { openArAndroid, openArIos } from '../src/ar/openAr';
import { uz } from '../src/i18n/uz';

jest.mock('expo-constants', () => ({ expoConfig: {} }));

const LAUNCH = 'https://abc.trycloudflare.com/ar/m0-r5.1793700000.' + 'a'.repeat(64);
const GLB = 'https://abc.trycloudflare.com/files/ar/m0-r5-ar.glb?exp=1793700000&sig=ab12';
const link = (over: Partial<ArLinkResponse> = {}): ArLinkResponse => ({
  launch_url: LAUNCH,
  glb_url: GLB,
  usdz_url: null,
  expires_at: '2026-11-03T10:10:00Z',
  ...over,
});
const client = (arLink: ApiClient['arLink']) => ({ arLink }) as unknown as ApiClient;

describe('arLaunchUrl', () => {
  it('HTTPS launch_url — o‘zi', () => {
    expect(arLaunchUrl(link())).toBe(LAUNCH);
  });
  it('HTTPS emas — null (WebXR talabi)', () => {
    expect(arLaunchUrl(link({ launch_url: 'http://10.0.0.5:8787/ar/x' }))).toBeNull();
  });
});

describe('openArAndroid', () => {
  const req = { itemId: 'm0', revisionId: 'm0-r5', title: 'M-0 namuna' };

  it('so‘rov {item_id, revision_id} (format yo‘q) → launch_url brauzerda ochiladi', async () => {
    const arLink = jest.fn(async () => link());
    const openUrl = jest.fn(async () => true);
    expect(await openArAndroid(req, { client: client(arLink), openUrl, dev: false })).toEqual({ ok: true });
    expect(arLink).toHaveBeenCalledWith('m0', 'm0-r5');
    expect(openUrl).toHaveBeenCalledWith(LAUNCH);
  });

  it('http:// launch_url → ochilmaydi; dev’da aniq sabab', async () => {
    const openUrl = jest.fn();
    const http = client(async () => link({ launch_url: 'http://10.0.0.5:8787/ar/m0-r5.1.a' }));
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
    expect(await openArAndroid(req, { client: client(async () => link()), openUrl, dev: false })).toEqual({
      ok: false,
      message: uz.ar.unavailable,
    });
  });
});

describe('openArIos (Quick Look sahifa orqali, Safari; iOS’da sinalmagan)', () => {
  const req = { itemId: 'm0', revisionId: 'm0-r5', title: 'M-0', usdzUrl: 'https://x/files/usdz/m0-r5.usdz' };
  const USDZ = 'https://abc.trycloudflare.com/files/ar/m0-r5.usdz?exp=1&sig=a';

  it('usdz bor → launch_url Safari’da', async () => {
    const arLink = jest.fn(async () => link({ usdz_url: USDZ }));
    const openUrl = jest.fn(async () => true);
    expect(await openArIos(req, { client: client(arLink), openUrl })).toEqual({ ok: true });
    expect(arLink).toHaveBeenCalledWith('m0', 'm0-r5');
    expect(openUrl).toHaveBeenCalledWith(LAUNCH);
  });

  it('buyumda usdz_url null → so‘rovsiz "AR bu buyum uchun tayyor emas"', async () => {
    const arLink = jest.fn();
    expect(
      await openArIos({ ...req, usdzUrl: null }, { client: client(arLink), openUrl: jest.fn() }),
    ).toEqual({
      ok: false,
      message: uz.ar.notReady,
    });
    expect(arLink).not.toHaveBeenCalled();
  });

  it('ar-link javobida usdz_url null (V-1b gacha) yoki 404 → tayyor emas; oflayn → internet kerak', async () => {
    expect(await openArIos(req, { client: client(async () => link()), openUrl: jest.fn() })).toEqual({
      ok: false,
      message: uz.ar.notReady,
    });
    const notFound = client(async () => {
      throw new ApiError('http', 'x', 404, 'not_found', 'Topilmadi');
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
