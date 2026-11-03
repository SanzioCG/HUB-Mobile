// Har endpoint va har `resolve` holati (kontrakt 1.3, 4-bo'lim). GLB'lar xotirada yasaladi.
import { beforeAll, describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { buildM0 } from '@hub-mobile/sample-glb/build';
import { REVISIONS, UNSAFE_UID } from '@hub-mobile/sample-glb/m0';
import { AR_LINK_TTL_MS, MODEL_VIEWER_SRC, PAIR_RATE, buildApp, pairQrText } from '../src/app.js';
import { createStore } from '../src/data.js';

const TOKEN = 'test-token';
const auth = { authorization: `Bearer ${TOKEN}` };
const REMOVED_UID = REVISIONS.r5.removedUids[0]!;
const SHELF_UID = 'm0p06';
const BASE = 'http://localhost:80';
const T0 = Date.parse('2026-11-03T10:00:00Z');

let app: ReturnType<typeof buildApp>;
let glbs: Record<string, Uint8Array>;
let clock = T0;

beforeAll(async () => {
  const io = new NodeIO();
  glbs = {
    'm0-r3': await io.writeBinary(buildM0('r3')),
    'm0-r5': await io.writeBinary(buildM0('r5')),
    'm0-r3-ar': await io.writeBinary(buildM0('r3', { ar: true })),
    'm0-r5-ar': await io.writeBinary(buildM0('r5', { ar: true })),
  };
  app = buildApp({
    store: await createStore(glbs),
    glbs,
    devToken: TOKEN,
    pairCode: '123456',
    signSecret: 'test-secret',
    now: () => clock,
  });
  await app.ready();
});

const get = (url: string, headers: Record<string, string> = auth) =>
  app.inject({ method: 'GET', url, headers });
const resolve = (qr: string) => get(`/mobile/resolve?qr=${encodeURIComponent(qr)}`);
const arLink = (payload: unknown, headers: Record<string, string> = auth) =>
  app.inject({ method: 'POST', url: '/mobile/ar-link', payload: payload as object, headers });

/** Kontrakt 4: xato tanasi `{error, message}`. */
const expectError = (res: { statusCode: number; json(): unknown }, status: number, error: string) => {
  expect(res.statusCode).toBe(status);
  const body = res.json() as { error: unknown; message: unknown };
  expect(body.error).toBe(error);
  expect(typeof body.message).toBe('string');
  expect(Object.keys(body).sort()).toEqual(['error', 'message']);
};

describe('POST /mobile/pair', () => {
  const pair = (code: unknown, remoteAddress = '10.0.0.1') =>
    app.inject({ method: 'POST', url: '/mobile/pair', payload: { code } as object, remoteAddress });

  it('123456 → {device_token, user:{id,name,role}, company:{id,name}}; token keyin ishlaydi', async () => {
    const res = await pair('123456');
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toEqual({
      device_token: expect.any(String),
      user: { id: 7, name: 'Dizayner (mock)', role: 'designer' },
      company: { id: 1, name: 'Namuna Mebel' },
    });
    expect((await get('/mobile/projects', { authorization: `Bearer ${body.device_token}` })).statusCode).toBe(
      200,
    );
  });

  it.each(['000000', 123456, undefined])('noto‘g‘ri kod %j → 401', async (code) => {
    expectError(await pair(code, '10.0.0.2'), 401, 'invalid_code');
  });

  it('muddati o‘tgan / ishlatilgan kod → 410 pair_code_expired', async () => {
    expectError(await pair('111111', '10.0.0.3'), 410, 'pair_code_expired');
  });

  it('1 daqiqada 5 tadan ko‘p muvaffaqiyatsiz urinish → 429 rate_limited; daqiqadan keyin yana mumkin', async () => {
    const ip = '10.0.0.9';
    for (let i = 0; i < PAIR_RATE.maxFailures; i++) expect((await pair('000000', ip)).statusCode).toBe(401);
    expectError(await pair('123456', ip), 429, 'rate_limited');
    expect((await pair('123456', '10.0.0.10')).statusCode).toBe(200); // boshqa IP
    clock = T0 + PAIR_RATE.windowMs + 1;
    expect((await pair('123456', ip)).statusCode).toBe(200);
    clock = T0;
  });

  it('juftlash QR matni (4.1): uhub-pair:1?server=<URL-kodlangan>&code=…', () => {
    expect(pairQrText('http://192.168.1.20:8787', '123456')).toBe(
      'uhub-pair:1?server=http%3A%2F%2F192.168.1.20%3A8787&code=123456',
    );
  });
});

describe('Bearer', () => {
  it.each(['/mobile/projects', '/mobile/projects/101', '/mobile/resolve?qr=x', '/files/glb/m0-r3.glb'])(
    '%s tokensiz yoki noto‘g‘ri token → 401 token_invalid',
    async (url) => {
      expectError(await get(url, {}), 401, 'token_invalid');
      expectError(await get(url, { authorization: 'Bearer wrong' }), 401, 'token_invalid');
    },
  );
});

describe('GET /mobile/projects', () => {
  it('faqat o‘z kompaniyasi; status ∈ draft|validated|approved', async () => {
    const list = (await get('/mobile/projects')).json() as Record<string, unknown>[];
    expect(list.map((p) => p.number)).toEqual([51, 52, 53]);
    expect(list.map((p) => p.status)).toEqual(['validated', 'draft', 'approved']);
    expect(Object.keys(list[0]!).sort()).toEqual(
      ['id', 'number', 'name', 'status', 'items_count', 'updated_at', 'thumb_url'].sort(),
    );
    expect(list[0]!.thumb_url).toBeNull();
  });

  it('updated_since filtrlaydi; noto‘g‘ri sana → 400 bad_request', async () => {
    const res = await get('/mobile/projects?updated_since=2026-10-30T00:00:00Z');
    expect((res.json() as { number: number }[]).map((p) => p.number)).toEqual([51]);
    expectError(await get('/mobile/projects?updated_since=kecha'), 400, 'bad_request');
  });
});

describe('GET /mobile/projects/{id}', () => {
  it('buyumlar: size_mm obyekt, approved, revision_label, export_status; glb_url faqat ready da', async () => {
    const body = (await get('/mobile/projects/101')).json() as { items: Record<string, unknown>[] };
    expect(Object.keys(body).sort()).toEqual(['id', 'items', 'name', 'number', 'status', 'updated_at']);
    const [m0, m1, m2] = body.items;
    expect(m0).toEqual({
      item_id: 'm0',
      name: 'M-0 namuna',
      revision_id: 'm0-r5',
      revision_label: 'R5',
      approved: false,
      size_mm: { width: 600, height: 900, depth: 560 },
      export_status: 'ready',
      glb_url: `${BASE}/files/glb/m0-r5.glb`,
      usdz_url: null,
      thumb_url: null,
    });
    expect(m1).toMatchObject({ item_id: 'm1', export_status: 'pending', glb_url: null });
    expect(m2).toMatchObject({ item_id: 'm2', export_status: 'failed', glb_url: null, approved: true });
  });

  it('noma’lum va boshqa kompaniya loyihasi → 404 not_found', async () => {
    expectError(await get('/mobile/projects/999'), 404, 'not_found');
    expectError(await get('/mobile/projects/201'), 404, 'not_found');
  });
});

describe('GET /mobile/resolve', () => {
  it('joriy reviziya etiketkasi → approved, latest_* = o‘sha qiymatlar', async () => {
    const res = await resolve(`uhub:p/51/${SHELF_UID}/s5`);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      project_id: 101,
      project_number: 51,
      item_id: 'm0',
      item_name: 'M-0 namuna',
      revision_id: 'm0-r5',
      revision_label: 'R5',
      approved: false,
      part_uid: SHELF_UID,
      part_name: 'Polka',
      glb_url: `${BASE}/files/glb/m0-r5.glb`,
      is_latest: true,
      part_in_latest: true,
      latest_revision_id: 'm0-r5',
      latest_revision_label: 'R5',
      latest_glb_url: `${BASE}/files/glb/m0-r5.glb`,
    });
  });

  it('eski etiketka → etiketkadagi reviziya; latest_* = R5', async () => {
    expect((await resolve(`uhub:p/51/${SHELF_UID}/s3`)).json()).toMatchObject({
      revision_id: 'm0-r3',
      revision_label: 'R3',
      is_latest: false,
      part_in_latest: true,
      latest_revision_id: 'm0-r5',
      latest_revision_label: 'R5',
      latest_glb_url: `${BASE}/files/glb/m0-r5.glb`,
    });
  });

  it('R5 da o‘chirilgan detal → part_in_latest=false, latest_* baribir to‘ldirilgan', async () => {
    expect((await resolve(`uhub:p/51/${REMOVED_UID}/s3`)).json()).toMatchObject({
      revision_id: 'm0-r3',
      part_uid: REMOVED_UID,
      is_latest: false,
      part_in_latest: false,
      latest_revision_id: 'm0-r5',
      latest_revision_label: 'R5',
    });
  });

  it('ruxsat etilmagan belgili uid (slash bilan) topiladi', async () => {
    expect((await resolve(`uhub:p/51/${UNSAFE_UID}/s5`)).json()).toMatchObject({ part_uid: UNSAFE_UID });
  });

  it.each(['uhub:p/51/m0p06', 'uhub:x', 'uhub:'])('buzilgan uhub: QR %j → 400 bad_qr', async (qr) => {
    expectError(await resolve(qr), 400, 'bad_qr');
  });

  it('uhub: bo‘lmagan QR → 400 bad_request (ilova bunday so‘rov yubormaydi)', async () => {
    expectError(await resolve('https://example.com'), 400, 'bad_request');
  });

  it.each([
    'uhub:p/999/m0p06/s5', // noma'lum loyiha
    'uhub:p/51/zzz/s5', // noma'lum detal
    'uhub:p/51/m0p06/s9', // noma'lum snapshot
    `uhub:p/51/${REMOVED_UID}/s5`, // R5 da yo'q detal R5 etiketkasi bilan
    'uhub:p/77/m0p06/s5', // boshqa kompaniya — 404
  ])('%s → 404 not_found', async (qr) => {
    expectError(await resolve(qr), 404, 'not_found');
  });
});

describe('POST /mobile/ar-link', () => {
  const linkFor = async (payload: object) => {
    const res = await arLink(payload);
    expect(res.statusCode).toBe(200);
    return res.json() as { url: string; expires_at: string };
  };
  const path = (url: string) => url.replace(BASE, '');

  it('imzolangan havola AR variantiga (animatsiyasiz): 10 daqiqa, Bearer’siz ishlaydi', async () => {
    clock = T0;
    const { url, expires_at } = await linkFor({ item_id: 'm0', revision_id: 'm0-r3', format: 'glb' });
    expect(Date.parse(expires_at) - T0).toBe(AR_LINK_TTL_MS);
    expect(url).toMatch(/^http:\/\/localhost:80\/files\/ar\/m0-r3-ar\.glb\?exp=\d+&sig=[0-9a-f]{64}$/);
    const file = await get(path(url), {});
    expect(file.statusCode).toBe(200);
    expect(file.headers['content-type']).toBe('model/gltf-binary');
    expect(Buffer.compare(file.rawPayload, Buffer.from(glbs['m0-r3-ar']!))).toBe(0);
  });

  it('MOCK_PUBLIC_URL berilsa havola shu tashqi manzil bilan (HTTPS tunnel)', async () => {
    const tunneled = buildApp({
      store: await createStore(glbs),
      glbs,
      devToken: TOKEN,
      pairCode: '123456',
      signSecret: 'test-secret',
      publicUrl: 'https://abc.trycloudflare.com',
      now: () => T0,
    });
    const res = await tunneled.inject({
      method: 'POST',
      url: '/mobile/ar-link',
      payload: { item_id: 'm0', revision_id: 'm0-r5', format: 'glb' },
      headers: auth,
    });
    const { url } = res.json() as { url: string };
    expect(url).toMatch(
      /^https:\/\/abc\.trycloudflare\.com\/files\/ar\/m0-r5-ar\.glb\?exp=\d+&sig=[0-9a-f]{64}$/,
    );
    // imzo manzilga bog'liq emas — tunnel ortidagi server ham faylni beradi
    const file = await tunneled.inject({
      method: 'GET',
      url: url.replace('https://abc.trycloudflare.com', ''),
    });
    expect(file.statusCode).toBe(200);
    await tunneled.close();
  });

  it('muddati o‘tgan havola → 404', async () => {
    clock = T0;
    const { url } = await linkFor({ item_id: 'm0', revision_id: 'm0-r5', format: 'glb' });
    clock = T0 + AR_LINK_TTL_MS + 1000;
    expectError(await get(path(url), {}), 404, 'not_found');
    clock = T0;
  });

  it('buzilgan imzo yoki boshqa fayl → 404', async () => {
    const { url } = await linkFor({ item_id: 'm0', revision_id: 'm0-r3', format: 'glb' });
    expectError(await get(path(url).replace(/sig=[0-9a-f]+/, `sig=${'0'.repeat(64)}`), {}), 404, 'not_found');
    expectError(await get(path(url).replace('m0-r3-ar.glb', 'm0-r5-ar.glb'), {}), 404, 'not_found');
    expectError(await get(path(url).replace('m0-r3-ar.glb', 'm0-r3.glb'), {}), 404, 'not_found');
    expectError(await get('/files/ar/m0-r3-ar.glb', {}), 404, 'not_found');
  });

  it('noto‘g‘ri tana → 400; noma’lum reviziya, USDZ (mock’da yo‘q) → 404; tokensiz → 401', async () => {
    expectError(await arLink({ item_id: 'm0', revision_id: 'm0-r3', format: 'obj' }), 400, 'bad_request');
    expectError(await arLink({ item_id: 'm0' }), 400, 'bad_request');
    expectError(await arLink({ item_id: 'm0', revision_id: 'm0-r9', format: 'glb' }), 404, 'not_found');
    expectError(await arLink({ item_id: 'm0', revision_id: 'm0-r3', format: 'usdz' }), 404, 'not_found');
    expectError(
      await arLink({ item_id: 'm0', revision_id: 'm0-r3', format: 'glb' }, {}),
      401,
      'token_invalid',
    );
  });
});

describe('fayllar', () => {
  it('GLB: abadiy kesh, model/gltf-binary', async () => {
    const res = await get('/files/glb/m0-r3.glb');
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(res.headers['content-type']).toBe('model/gltf-binary');
  });

  it('noma’lum fayl → 404', async () => {
    expectError(await get('/files/glb/m0-r9.glb'), 404, 'not_found');
    expectError(await get('/files/glb/..%2Fsecret.glb'), 404, 'not_found');
  });
});

describe('DELETE /mobile/device', () => {
  it('204 tanasiz; takroriy ham 204; keyin token → 401 token_revoked', async () => {
    const pair = await app.inject({
      method: 'POST',
      url: '/mobile/pair',
      payload: { code: '123456' },
      remoteAddress: '10.0.1.1',
    });
    const headers = { authorization: `Bearer ${pair.json().device_token}` };
    const del = await app.inject({ method: 'DELETE', url: '/mobile/device', headers });
    expect(del.statusCode).toBe(204);
    expect(del.body).toBe('');
    expect((await app.inject({ method: 'DELETE', url: '/mobile/device', headers })).statusCode).toBe(204);
    expectError(await get('/mobile/projects', headers), 401, 'token_revoked');
  });
});

describe('GET /ar/launch (AR zaxira sahifasi)', () => {
  const PUBLIC = 'https://abc.trycloudflare.com';
  const build = async () =>
    buildApp({
      store: await createStore(glbs),
      glbs,
      devToken: TOKEN,
      pairCode: '123456',
      signSecret: 'test-secret',
      publicUrl: PUBLIC,
      now: () => T0,
    });
  const signed = `${PUBLIC}/files/ar/m0-r5-ar.glb?exp=1793700000&sig=ab12`;
  const page = (a: Awaited<ReturnType<typeof build>>, file: string) =>
    a.inject({
      method: 'GET',
      url: `/ar/launch?file=${encodeURIComponent(file)}&title=${encodeURIComponent('M-0 namuna')}`,
    });

  it('tokensiz ochiladi; <model-viewer> WebXR: src = imzolangan havola, ar-scale=fixed, polga', async () => {
    const a = await build();
    const res = await page(a, signed);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain(`<script type="module" src="${MODEL_VIEWER_SRC}"></script>`);
    const tag = /<model-viewer [^>]+>/.exec(res.body)![0];
    expect(/src="([^"]+)"/.exec(tag)![1]!.replaceAll('&amp;', '&')).toBe(signed);
    expect(tag).toContain('ar-modes="webxr scene-viewer"');
    expect(tag).toContain('ar-scale="fixed"');
    expect(tag).toContain('ar-placement="floor"');
    expect(res.body).toContain('M-0 namuna');
    await a.close();
  });

  it('AR fayli CORS bilan beriladi (model-viewer fetch)', async () => {
    const a = await build();
    const link = await a.inject({
      method: 'POST',
      url: '/mobile/ar-link',
      payload: { item_id: 'm0', revision_id: 'm0-r5', format: 'glb' },
      headers: auth,
    });
    const url = (link.json() as { url: string }).url.replace(PUBLIC, '');
    const file = await a.inject({ method: 'GET', url });
    expect(file.statusCode).toBe(200);
    expect(file.headers['access-control-allow-origin']).toBe('*');
    await a.close();
  });

  it.each([
    'https://evil.example.com/files/ar/x.glb', // begona host
    'http://abc.trycloudflare.com/files/ar/m0-r5-ar.glb', // HTTPS emas
    'https://abc.trycloudflare.com/mobile/projects', // AR fayli emas
    'not a url',
  ])('yaroqsiz havola %s → 404', async (file) => {
    const a = await build();
    expectError(await page(a, file), 404, 'not_found');
    await a.close();
  });
});
