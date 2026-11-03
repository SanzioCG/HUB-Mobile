// AR: Scene Viewer intent URL, ishga tushirish tartibi (ARCore → brauzer sahifasi), ar-link xatolari (batch M-A3).
import type { ApiClient } from '../src/api/client';
import { ApiError } from '../src/api/errors';
import { openArAndroid, openArIos } from '../src/ar/openAr';
import {
  ARCORE_TARGET,
  ArUnavailableError,
  launchSceneViewer,
  launcherPageUrl,
  sceneViewerUrl,
  truncateTitle,
  type StartActivity,
} from '../src/ar/sceneViewer';
import { uz } from '../src/i18n/uz';

jest.mock('expo-constants', () => ({ expoConfig: {} }));

const FILE = 'https://abc.trycloudflare.com/files/ar/m0-r5-ar.glb?exp=1793700000&sig=ab12';

describe('Scene Viewer URL', () => {
  it('file escape qilinadi, resizable=false, mode va title', () => {
    const url = sceneViewerUrl(FILE, 'ar_only', 'M-0 namuna');
    expect(url).toBe(
      'https://arvr.google.com/scene-viewer/1.0?file=' +
        encodeURIComponent(FILE) +
        '&mode=ar_only&resizable=false&title=M-0%20namuna',
    );
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('file')).toBe(FILE); // & va = fayl URL ichida buzilmaydi
    expect(params.get('resizable')).toBe('false');
  });

  it('sarlavha ≤ 60 belgi, o‘zbekcha harflar bo‘linmaydi', () => {
    const long = 'Oʻ'.repeat(40) + ' — Oshxona shkafi, chap blok, yuqori qator';
    expect([...truncateTitle(long)]).toHaveLength(60);
    expect(truncateTitle('  qisqa  ')).toBe('qisqa');
    const title = new URLSearchParams(sceneViewerUrl(FILE, 'ar_preferred', long).split('?')[1]).get('title');
    expect([...title!]).toHaveLength(60);
  });
});

describe('ishga tushirish tartibi', () => {
  type Call = { packageName: string; className: string; mode: string | null };
  const starter =
    (works: boolean, calls: Call[]): StartActivity =>
    async (action, { data, packageName, className }) => {
      expect(action).toBe('android.intent.action.VIEW');
      calls.push({ packageName, className, mode: new URLSearchParams(data.split('?')[1]).get('mode') });
      if (!works) throw new Error('No Activity found to handle Intent');
    };

  it('ARCore: paket VA aniq komponent beriladi (expo-intent-launcher className’siz paketni e’tiborsiz qoldiradi)', async () => {
    const calls: Call[] = [];
    const openUrl = jest.fn();
    await expect(launchSceneViewer(FILE, 'M-0', starter(true, calls), openUrl)).resolves.toBe('arcore');
    expect(calls).toEqual([
      {
        packageName: 'com.google.ar.core',
        className: 'com.google.ar.core.viewer.IntentForwardActivity',
        mode: 'ar_only',
      },
    ]);
    expect(calls[0]!.packageName).toBe(ARCORE_TARGET.packageName);
    expect(openUrl).not.toHaveBeenCalled();
  });

  it('ARCore ishlamasa — brauzerda AR sahifasi (imzolangan havola bilan bir origin)', async () => {
    const openUrl = jest.fn(async () => true);
    await expect(launchSceneViewer(FILE, 'M-0 namuna', starter(false, []), openUrl)).resolves.toBe('browser');
    const page = new URL(String((openUrl.mock.calls[0] as unknown[])[0]));
    expect(page.origin).toBe('https://abc.trycloudflare.com');
    expect(page.pathname).toBe('/ar/launch');
    expect(page.searchParams.get('file')).toBe(FILE);
    expect(page.searchParams.get('title')).toBe('M-0 namuna');
  });

  it('ikkalasi ham ishlamasa — ArUnavailableError', async () => {
    const openUrl = jest.fn(async () => {
      throw new Error('no browser');
    });
    await expect(launchSceneViewer(FILE, 'M-0', starter(false, []), openUrl)).rejects.toBeInstanceOf(
      ArUnavailableError,
    );
  });

  it('AR sahifasi faqat HTTPS havoladan yasaladi', () => {
    expect(launcherPageUrl('http://x/files/ar/a.glb', 'M-0')).toBeNull();
    expect(launcherPageUrl(FILE, 'M-0')).toMatch(/^https:\/\/abc\.trycloudflare\.com\/ar\/launch\?file=/);
  });
});

describe('openArAndroid', () => {
  const req = { itemId: 'm0', revisionId: 'm0-r5', title: 'M-0 namuna' };
  const client = (arLink: ApiClient['arLink']) => ({ arLink }) as unknown as ApiClient;
  const ok = (url: string) => client(async () => ({ url, expires_at: '2026-11-03T10:10:00Z' }));
  const deps = (c: ApiClient, start: StartActivity = jest.fn(async () => undefined), dev = false) => ({
    client: c,
    startActivity: start,
    openUrl: jest.fn(async () => true),
    dev,
  });

  it('HTTPS havola → Scene Viewer ochiladi; so‘rov glb formatida', async () => {
    const arLink = jest.fn(async () => ({ url: FILE, expires_at: '' }));
    const start = jest.fn(async () => undefined);
    await expect(openArAndroid(req, deps(client(arLink), start))).resolves.toEqual({ ok: true });
    expect(arLink).toHaveBeenCalledWith('m0', 'm0-r5', 'glb');
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('http:// havola → ishga tushirilmaydi; dev’da aniq sabab', async () => {
    const start = jest.fn(async () => undefined);
    const http = ok('http://10.0.0.5:8787/files/ar/m0-r5-ar.glb?exp=1&sig=a');
    expect(await openArAndroid(req, deps(http, start, true))).toEqual({
      ok: false,
      message: uz.ar.insecureDev,
    });
    expect(await openArAndroid(req, deps(http, start, false))).toEqual({
      ok: false,
      message: uz.ar.insecure,
    });
    expect(start).not.toHaveBeenCalled();
  });

  it('oflayn → "AR uchun internet kerak"; HTTP xato → server matni', async () => {
    const offline = client(async () => {
      throw new ApiError('network', 'x');
    });
    expect(await openArAndroid(req, deps(offline))).toEqual({ ok: false, message: uz.ar.offline });
    const missing = client(async () => {
      throw new ApiError('http', 'x', 409, 'conflict', 'AR varianti topilmadi');
    });
    expect(await openArAndroid(req, deps(missing))).toEqual({ ok: false, message: 'AR varianti topilmadi' });
  });

  it('ARCore ham, brauzer ham ishlamasa → "Bu qurilmada AR mavjud emas"', async () => {
    const start: StartActivity = async () => {
      throw new Error('no activity');
    };
    const d = { ...deps(ok(FILE), start), openUrl: jest.fn(async () => Promise.reject(new Error('x'))) };
    expect(await openArAndroid(req, d)).toEqual({ ok: false, message: uz.ar.unavailable });
  });
});

describe('openArIos (Quick Look, Safari orqali; iOS’da sinalmagan)', () => {
  const req = { itemId: 'm0', revisionId: 'm0-r5', title: 'M-0', usdzUrl: 'https://x/files/usdz/m0-r5.usdz' };
  const USDZ = 'https://abc.trycloudflare.com/files/ar/m0-r5.usdz?exp=1&sig=a';

  it('usdz havola → Linking.openURL; so‘rov usdz formatida', async () => {
    const arLink = jest.fn(async () => ({ url: USDZ, expires_at: '' }));
    const openUrl = jest.fn(async () => true);
    expect(await openArIos(req, { client: { arLink } as unknown as ApiClient, openUrl })).toEqual({
      ok: true,
    });
    expect(arLink).toHaveBeenCalledWith('m0', 'm0-r5', 'usdz');
    expect(openUrl).toHaveBeenCalledWith(USDZ);
  });

  it('usdz_url null → so‘rovsiz "AR bu buyum uchun tayyor emas"', async () => {
    const arLink = jest.fn();
    expect(
      await openArIos(
        { ...req, usdzUrl: null },
        { client: { arLink } as unknown as ApiClient, openUrl: jest.fn() },
      ),
    ).toEqual({ ok: false, message: uz.ar.notReady });
    expect(arLink).not.toHaveBeenCalled();
  });

  it('mock: usdz → 404 not_found → "AR bu buyum uchun tayyor emas"; oflayn → internet kerak', async () => {
    const notFound = {
      arLink: async () => {
        throw new ApiError('http', 'x', 404, 'not_found', 'USDZ mock’da yo‘q (V-1b)');
      },
    } as unknown as ApiClient;
    expect(await openArIos(req, { client: notFound, openUrl: jest.fn() })).toEqual({
      ok: false,
      message: uz.ar.notReady,
    });
    const offline = {
      arLink: async () => {
        throw new ApiError('timeout', 'x');
      },
    } as unknown as ApiClient;
    expect(await openArIos(req, { client: offline, openUrl: jest.fn() })).toEqual({
      ok: false,
      message: uz.ar.offline,
    });
  });
});
