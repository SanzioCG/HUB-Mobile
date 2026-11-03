// API klient: mock server (mock/src/app.ts) javoblari bilan; xatolar ApiError ga; 401 oqimi.
import { createClient } from '../src/api/client';
import { ApiError, errorMessage } from '../src/api/errors';
import { uz } from '../src/i18n/uz';

const BASE = 'http://10.0.0.5:8787';

// mock/src/app.ts javoblari (shakl va qiymatlar mock'dan).
const PROJECTS = [
  {
    id: 101,
    number: 51,
    name: 'Oshxona — Chilonzor',
    status: 'production',
    items_count: 1,
    updated_at: '2026-11-02T14:30:00Z',
    thumb_url: null,
  },
];
const PROJECT = {
  ...PROJECTS[0],
  items: [
    {
      item_id: 'm0',
      name: 'M-0 namuna',
      revision_id: 'm0-r5',
      size_mm: [600, 900, 560],
      glb_url: `${BASE}/files/glb/m0-r5.glb`,
      usdz_url: null,
      thumb_url: null,
      approved: false,
    },
  ],
};

interface Call {
  url: string;
  init: RequestInit;
}

function fakeFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fn = jest.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    return handler(url, init);
  });
  return { fetch: fn as unknown as typeof fetch, calls };
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function caught(p: Promise<unknown>): Promise<ApiError> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(ApiError);
    return e as ApiError;
  }
  throw new Error('xato kutilgan edi');
}

describe('muvaffaqiyatli javoblar', () => {
  it('pair: POST, tanada kod, tokensiz', async () => {
    const f = fakeFetch(() =>
      json(200, {
        device_token: 'abc',
        user: { id: 7, name: 'Dizayner' },
        company: { id: 1, name: 'Namuna' },
      }),
    );
    const res = await createClient({ baseUrl: BASE, token: 'old', fetch: f.fetch }).pair('123456');
    expect(res.device_token).toBe('abc');
    const call = f.calls[0]!;
    expect(call.url).toBe(`${BASE}/mobile/pair`);
    expect(call.init.method).toBe('POST');
    expect(JSON.parse(String(call.init.body))).toEqual({ code: '123456' });
    expect((call.init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('projects: Bearer token, updated_since kodlangan', async () => {
    const f = fakeFetch(() => json(200, PROJECTS));
    const client = createClient({ baseUrl: BASE, token: 'tok', fetch: f.fetch });
    expect(await client.projects()).toEqual(PROJECTS);
    await client.projects('2026-10-30T00:00:00+05:00');
    expect(f.calls[0]!.url).toBe(`${BASE}/mobile/projects`);
    expect(f.calls[1]!.url).toBe(`${BASE}/mobile/projects?updated_since=2026-10-30T00%3A00%3A00%2B05%3A00`);
    expect((f.calls[0]!.init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('project va resolve', async () => {
    const f = fakeFetch((url) =>
      url.includes('/resolve') ? json(200, { part_uid: 'm0p06' }) : json(200, PROJECT),
    );
    const client = createClient({ baseUrl: BASE, token: 't', fetch: f.fetch });
    expect((await client.project(101)).items[0]!.revision_id).toBe('m0-r5');
    await client.resolve('uhub:p/51/m0p06/s5');
    expect(f.calls[1]!.url).toBe(`${BASE}/mobile/resolve?qr=uhub%3Ap%2F51%2Fm0p06%2Fs5`);
  });

  it('DELETE device: 204 → undefined', async () => {
    const f = fakeFetch(() => new Response(null, { status: 204 }));
    await expect(
      createClient({ baseUrl: BASE, token: 't', fetch: f.fetch }).unpairDevice(),
    ).resolves.toBeUndefined();
    expect(f.calls[0]!.init.method).toBe('DELETE');
  });
});

describe('xatolar ApiError ga keltiriladi', () => {
  it('HTTP xato: status, kod va server matni ({error, message}, kontrakt 1.2)', async () => {
    const f = fakeFetch(() => json(404, { error: 'not_found', message: 'Loyiha topilmadi' }));
    const e = await caught(createClient({ baseUrl: BASE, token: 't', fetch: f.fetch }).project(999));
    expect(e).toMatchObject({
      kind: 'http',
      status: 404,
      code: 'not_found',
      serverMessage: 'Loyiha topilmadi',
    });
    expect(errorMessage(e)).toBe(uz.errors.notFound);
  });

  it('boshqa kompaniya etiketkasi — 404 not_found (1.2, 403 emas)', async () => {
    const f = fakeFetch(() => json(404, { error: 'not_found', message: 'Etiketka topilmadi' }));
    const e = await caught(
      createClient({ baseUrl: BASE, token: 't', fetch: f.fetch }).resolve('uhub:p/77/x/s'),
    );
    expect(e).toMatchObject({ kind: 'http', status: 404, code: 'not_found' });
  });

  it('noma’lum HTTP xatoda server matni ko‘rsatiladi', async () => {
    const f = fakeFetch(() => json(409, { error: 'conflict', message: 'Server matni' }));
    const e = await caught(createClient({ baseUrl: BASE, token: 't', fetch: f.fetch }).projects());
    expect(errorMessage(e)).toBe('Server matni');
  });

  it('JSON bo‘lmagan xato tanasi — kod yo‘q', async () => {
    const f = fakeFetch(() => new Response('Bad Gateway', { status: 502 }));
    const e = await caught(createClient({ baseUrl: BASE, token: 't', fetch: f.fetch }).projects());
    expect(e).toMatchObject({ kind: 'http', status: 502, code: undefined });
    expect(errorMessage(e)).toBe(uz.errors.server(502));
  });

  it('tarmoq xatosi → network', async () => {
    const f = fakeFetch(() => {
      throw new TypeError('Network request failed');
    });
    const e = await caught(createClient({ baseUrl: BASE, token: 't', fetch: f.fetch }).projects());
    expect(e.kind).toBe('network');
    expect(errorMessage(e)).toBe(uz.errors.network);
  });

  it('timeout → timeout (so‘rov bekor qilinadi)', async () => {
    const f = fakeFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
        }),
    );
    const e = await caught(
      createClient({ baseUrl: BASE, token: 't', timeoutMs: 20, fetch: f.fetch }).projects(),
    );
    expect(e.kind).toBe('timeout');
    expect(errorMessage(e)).toBe(uz.errors.timeout);
  });

  it('2xx, lekin JSON emas → parse', async () => {
    const f = fakeFetch(() => new Response('<html>', { status: 200 }));
    const e = await caught(createClient({ baseUrl: BASE, token: 't', fetch: f.fetch }).projects());
    expect(e.kind).toBe('parse');
  });

  it('server manzili yo‘q → config, so‘rov yuborilmaydi', async () => {
    const f = fakeFetch(() => json(200, []));
    const e = await caught(createClient({ baseUrl: null, fetch: f.fetch }).projects());
    expect(e.kind).toBe('config');
    expect(f.calls).toHaveLength(0);
  });
});

describe('401', () => {
  it('token talab qiladigan so‘rovda 401 → onUnauthorized', async () => {
    const onUnauthorized = jest.fn();
    const f = fakeFetch(() => json(401, { error: 'unauthorized' }));
    const client = createClient({ baseUrl: BASE, token: 'revoked', fetch: f.fetch, onUnauthorized });
    for (const p of [
      client.projects(),
      client.project(101),
      client.resolve('uhub:x'),
      client.unpairDevice(),
    ]) {
      expect(await caught(p)).toMatchObject({ status: 401 });
    }
    expect(onUnauthorized).toHaveBeenCalledTimes(4);
  });

  it('pair 401 = noto‘g‘ri kod, onUnauthorized chaqirilmaydi', async () => {
    const onUnauthorized = jest.fn();
    const f = fakeFetch(() => json(401, { error: 'invalid_code' }));
    const e = await caught(createClient({ baseUrl: BASE, fetch: f.fetch, onUnauthorized }).pair('000000'));
    expect(e).toMatchObject({ status: 401, code: 'invalid_code' });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
