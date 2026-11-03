// Har endpoint va har `resolve` holati (kontrakt 1.2 qoralama, 4-bo'lim). GLB'lar xotirada yasaladi.
import { beforeAll, describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { buildM0 } from '@hub-mobile/sample-glb/build';
import { REVISIONS, UNSAFE_UID } from '@hub-mobile/sample-glb/m0';
import { AR_LINK_TTL_MS, buildApp } from '../src/app.js';
import { createStore } from '../src/data.js';

const TOKEN = 'test-token';
const auth = { authorization: `Bearer ${TOKEN}` };
const REMOVED_UID = REVISIONS.r5.removedUids[0]!;
const SHELF_UID = 'm0p06';
const BASE = 'http://localhost:80';
const T0 = Date.parse('2026-11-03T10:00:00Z');

let app: ReturnType<typeof buildApp>;
let clock = T0;

beforeAll(async () => {
  const io = new NodeIO();
  const glbs = {
    'm0-r3': await io.writeBinary(buildM0('r3')),
    'm0-r5': await io.writeBinary(buildM0('r5')),
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

/** Kontrakt 1.2: xato tanasi `{error, message}`. */
const expectError = (res: { statusCode: number; json(): unknown }, status: number, error: string) => {
  expect(res.statusCode).toBe(status);
  const body = res.json() as { error: unknown; message: unknown };
  expect(body.error).toBe(error);
  expect(typeof body.message).toBe('string');
  expect(Object.keys(body).sort()).toEqual(['error', 'message']);
};

describe('POST /mobile/pair', () => {
  it('123456 → token, user, company; token keyin ishlaydi', async () => {
    const res = await app.inject({ method: 'POST', url: '/mobile/pair', payload: { code: '123456' } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({ device_token: expect.any(String), user: { id: 7 }, company: { id: 1 } });
    expect((await get('/mobile/projects', { authorization: `Bearer ${body.device_token}` })).statusCode).toBe(
      200,
    );
  });

  it.each([{ code: '000000' }, { code: 123456 }, {}])(
    'noto‘g‘ri kod %j → 401 invalid_code',
    async (payload) => {
      expectError(await app.inject({ method: 'POST', url: '/mobile/pair', payload }), 401, 'invalid_code');
    },
  );
});

describe('Bearer', () => {
  it.each(['/mobile/projects', '/mobile/projects/101', '/mobile/resolve?qr=x', '/files/glb/m0-r3.glb'])(
    '%s tokensiz yoki noto‘g‘ri token → 401 unauthorized',
    async (url) => {
      expectError(await get(url, {}), 401, 'unauthorized');
      expectError(await get(url, { authorization: 'Bearer wrong' }), 401, 'unauthorized');
    },
  );
});

describe('GET /mobile/projects', () => {
  it('faqat o‘z kompaniyasi loyihalari', async () => {
    const list = (await get('/mobile/projects')).json() as Record<string, unknown>[];
    expect(list.map((p) => p.number)).toEqual([51, 52, 53]);
    expect(Object.keys(list[0]!).sort()).toEqual(
      ['id', 'number', 'name', 'status', 'items_count', 'updated_at', 'thumb_url'].sort(),
    );
  });

  it('updated_since filtrlaydi; noto‘g‘ri sana → 400', async () => {
    const res = await get('/mobile/projects?updated_since=2026-10-30T00:00:00Z');
    expect((res.json() as { number: number }[]).map((p) => p.number)).toEqual([51]);
    expectError(await get('/mobile/projects?updated_since=kecha'), 400, 'bad_updated_since');
  });
});

describe('GET /mobile/projects/{id}', () => {
  it('buyumlar joriy reviziya bilan, revision_label va API’dagi approved', async () => {
    const { items } = (await get('/mobile/projects/101')).json() as { items: Record<string, unknown>[] };
    expect(items[0]).toEqual({
      item_id: 'm0',
      name: 'M-0 namuna',
      revision_id: 'm0-r5',
      revision_label: 'R5',
      size_mm: [600, 900, 560],
      glb_url: `${BASE}/files/glb/m0-r5.glb`,
      usdz_url: null,
      thumb_url: null,
      approved: false,
    });
  });

  it('noma’lum va boshqa kompaniya loyihasi → 404 not_found', async () => {
    expectError(await get('/mobile/projects/999'), 404, 'not_found');
    expectError(await get('/mobile/projects/201'), 404, 'not_found');
  });
});

describe('GET /mobile/resolve', () => {
  it('joriy reviziya etiketkasi → is_latest=true, part_in_latest=true', async () => {
    const res = await resolve(`uhub:p/51/${SHELF_UID}/s5`);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      project_id: 101,
      project_number: 51,
      item_id: 'm0',
      item_name: 'M-0 namuna',
      revision_id: 'm0-r5',
      revision_label: 'R5',
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

  it('eski etiketka, detal hali bor → etiketkadagi reviziya; latest_* = R5', async () => {
    expect((await resolve(`uhub:p/51/${SHELF_UID}/s3`)).json()).toMatchObject({
      revision_id: 'm0-r3',
      revision_label: 'R3',
      glb_url: `${BASE}/files/glb/m0-r3.glb`,
      is_latest: false,
      part_in_latest: true,
      latest_revision_id: 'm0-r5',
      latest_revision_label: 'R5',
      latest_glb_url: `${BASE}/files/glb/m0-r5.glb`,
    });
  });

  it('R5 da o‘chirilgan detal → 200, part_in_latest=false, latest_* to‘ldirilgan', async () => {
    const res = await resolve(`uhub:p/51/${REMOVED_UID}/s3`);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      revision_id: 'm0-r3',
      part_uid: REMOVED_UID,
      is_latest: false,
      part_in_latest: false,
      latest_revision_id: 'm0-r5',
      latest_revision_label: 'R5',
    });
  });

  it('ruxsat etilmagan belgili uid (`/` bilan) topiladi', async () => {
    const res = await resolve(`uhub:p/51/${UNSAFE_UID}/s5`);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ part_uid: UNSAFE_UID, part_name: "O'ng yon devor" });
  });

  it.each(['https://example.com', 'p/51/m0p06/s5', ''])(
    'uhub: bilan boshlanmaydi (%j) → 400 not_uhub',
    async (qr) => {
      expectError(await resolve(qr), 400, 'not_uhub');
    },
  );

  it.each([
    'uhub:p/999/m0p06/s5', // noma'lum loyiha
    'uhub:p/51/zzz/s5', // noma'lum detal
    'uhub:p/51/m0p06/s9', // noma'lum snapshot
    `uhub:p/51/${REMOVED_UID}/s5`, // R5 da yo'q detal R5 etiketkasi bilan
    'uhub:p/51/m0p06', // buzilgan format
    'uhub:p/77/m0p06/s5', // boshqa kompaniya — 1.2: 404 (403 emas)
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

  it('imzolangan havola: 10 daqiqa, Bearer’siz ishlaydi', async () => {
    clock = T0;
    const { url, expires_at } = await linkFor({ item_id: 'm0', revision_id: 'm0-r3', format: 'glb' });
    expect(Date.parse(expires_at) - T0).toBe(AR_LINK_TTL_MS);
    expect(url).toMatch(/^http:\/\/localhost:80\/files\/ar\/m0-r3\.glb\?exp=\d+&sig=[0-9a-f]{64}$/);
    const file = await get(path(url), {});
    expect(file.statusCode).toBe(200);
    expect(file.headers['content-type']).toBe('model/gltf-binary');
    expect(file.rawPayload.subarray(0, 4).toString('ascii')).toBe('glTF');
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
    expectError(await get(path(url).replace('m0-r3.glb', 'm0-r5.glb'), {}), 404, 'not_found');
    expectError(await get('/files/ar/m0-r3.glb', {}), 404, 'not_found');
  });

  it('noto‘g‘ri tana → 400; noma’lum reviziya, USDZ (mock’da yo‘q) → 404; tokensiz → 401', async () => {
    expectError(await arLink({ item_id: 'm0', revision_id: 'm0-r3', format: 'obj' }), 400, 'bad_request');
    expectError(await arLink({ item_id: 'm0' }), 400, 'bad_request');
    expectError(await arLink({ item_id: 'm0', revision_id: 'm0-r9', format: 'glb' }), 404, 'not_found');
    expectError(await arLink({ item_id: 'm0', revision_id: 'm0-r3', format: 'usdz' }), 404, 'not_found');
    expectError(
      await arLink({ item_id: 'm0', revision_id: 'm0-r3', format: 'glb' }, {}),
      401,
      'unauthorized',
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
  it('tokenni bekor qiladi', async () => {
    const pair = await app.inject({ method: 'POST', url: '/mobile/pair', payload: { code: '123456' } });
    const headers = { authorization: `Bearer ${pair.json().device_token}` };
    expect((await app.inject({ method: 'DELETE', url: '/mobile/device', headers })).statusCode).toBe(204);
    expectError(await get('/mobile/projects', headers), 401, 'unauthorized');
  });
});
