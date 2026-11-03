// Har endpoint va har `resolve` holati (kontrakt 4-bo'lim). GLB'lar xotirada yasaladi — fixtures shart emas.
import { beforeAll, describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { buildM0 } from '@hub-mobile/sample-glb/build';
import { REVISIONS } from '@hub-mobile/sample-glb/m0';
import { buildApp } from '../src/app.js';
import { createStore } from '../src/data.js';

const TOKEN = 'test-token';
const auth = { authorization: `Bearer ${TOKEN}` };
const REMOVED_UID = REVISIONS.r5.removedUids[0]!;
const SHELF_UID = 'm0p06';

let app: ReturnType<typeof buildApp>;

beforeAll(async () => {
  const io = new NodeIO();
  const glbs = {
    'm0-r3': await io.writeBinary(buildM0('r3')),
    'm0-r5': await io.writeBinary(buildM0('r5')),
  };
  app = buildApp({ store: await createStore(glbs), glbs, devToken: TOKEN, pairCode: '123456' });
  await app.ready();
});

const get = (url: string, headers: Record<string, string> = auth) =>
  app.inject({ method: 'GET', url, headers });
const resolve = (qr: string) => get(`/mobile/resolve?qr=${encodeURIComponent(qr)}`);

describe('POST /mobile/pair', () => {
  it('123456 → token, user, company; token keyin ishlaydi', async () => {
    const res = await app.inject({ method: 'POST', url: '/mobile/pair', payload: { code: '123456' } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({ device_token: expect.any(String), user: { id: 7 }, company: { id: 1 } });
    const list = await get('/mobile/projects', { authorization: `Bearer ${body.device_token}` });
    expect(list.statusCode).toBe(200);
  });

  it.each([{ code: '000000' }, { code: 123456 }, {}])('noto‘g‘ri kod %j → 401', async (payload) => {
    const res = await app.inject({ method: 'POST', url: '/mobile/pair', payload });
    expect(res.statusCode).toBe(401);
  });
});

describe('Bearer', () => {
  it.each(['/mobile/projects', '/mobile/projects/101', '/mobile/resolve?qr=x', '/files/glb/m0-r3.glb'])(
    '%s tokensiz → 401, noto‘g‘ri token → 401',
    async (url) => {
      expect((await get(url, {})).statusCode).toBe(401);
      expect((await get(url, { authorization: 'Bearer wrong' })).statusCode).toBe(401);
    },
  );
});

describe('GET /mobile/projects', () => {
  it('faqat o‘z kompaniyasi loyihalari, kontrakt maydonlari bilan', async () => {
    const res = await get('/mobile/projects');
    expect(res.statusCode).toBe(200);
    const list = res.json() as Record<string, unknown>[];
    expect(list.map((p) => p.number)).toEqual([51, 52, 53]);
    expect(Object.keys(list[0]!).sort()).toEqual(
      ['id', 'number', 'name', 'status', 'items_count', 'updated_at', 'thumb_url'].sort(),
    );
    expect(list[0]!.items_count).toBe(1);
  });

  it('updated_since filtrlaydi; noto‘g‘ri sana → 400', async () => {
    const res = await get('/mobile/projects?updated_since=2026-10-30T00:00:00Z');
    expect((res.json() as { number: number }[]).map((p) => p.number)).toEqual([51]);
    expect((await get('/mobile/projects?updated_since=kecha')).statusCode).toBe(400);
  });
});

describe('GET /mobile/projects/{id}', () => {
  it('buyumlar joriy reviziya bilan', async () => {
    const res = await get('/mobile/projects/101');
    expect(res.statusCode).toBe(200);
    const { items } = res.json() as { items: Record<string, unknown>[] };
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      item_id: 'm0',
      revision_id: 'm0-r5',
      glb_url: 'http://localhost:80/files/glb/m0-r5.glb',
      approved: false,
    });
    expect(Object.keys(items[0]!).sort()).toEqual(
      ['item_id', 'name', 'revision_id', 'size_mm', 'glb_url', 'usdz_url', 'thumb_url', 'approved'].sort(),
    );
  });

  it('noma’lum va boshqa kompaniya loyihasi → 404', async () => {
    expect((await get('/mobile/projects/999')).statusCode).toBe(404);
    expect((await get('/mobile/projects/201')).statusCode).toBe(404);
  });
});

describe('GET /mobile/resolve', () => {
  it('joriy reviziya etiketkasi → 200, is_latest=true', async () => {
    const res = await resolve(`uhub:p/51/${SHELF_UID}/s5`);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      project_id: 101,
      project_number: 51,
      item_id: 'm0',
      item_name: 'M-0 namuna',
      revision_id: 'm0-r5',
      part_uid: SHELF_UID,
      part_name: 'Polka',
      glb_url: 'http://localhost:80/files/glb/m0-r5.glb',
      is_latest: true,
      latest_revision_id: 'm0-r5',
      latest_glb_url: 'http://localhost:80/files/glb/m0-r5.glb',
    });
  });

  it('eski etiketka, detal hali bor → etiketkadagi reviziya, is_latest=false, latest_* = R5', async () => {
    const res = await resolve(`uhub:p/51/${SHELF_UID}/s3`);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      revision_id: 'm0-r3',
      glb_url: 'http://localhost:80/files/glb/m0-r3.glb',
      is_latest: false,
      latest_revision_id: 'm0-r5',
      latest_glb_url: 'http://localhost:80/files/glb/m0-r5.glb',
    });
  });

  it('R5 da o‘chirilgan detal → 200, is_latest=false, latest_* = null', async () => {
    const res = await resolve(`uhub:p/51/${REMOVED_UID}/s3`);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      revision_id: 'm0-r3',
      part_uid: REMOVED_UID,
      is_latest: false,
      latest_revision_id: null,
      latest_glb_url: null,
    });
  });

  it.each(['https://example.com', 'p/51/m0p06/s5', ''])('uhub: bilan boshlanmaydi (%j) → 400', async (qr) => {
    const res = await resolve(qr);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'not_uhub' });
  });

  it.each([
    'uhub:p/999/m0p06/s5', // noma'lum loyiha
    'uhub:p/51/zzz/s5', // noma'lum detal
    'uhub:p/51/m0p06/s9', // noma'lum snapshot
    `uhub:p/51/${REMOVED_UID}/s5`, // R5 da yo'q detal R5 etiketkasi bilan
    'uhub:p/51/m0p06', // buzilgan format
  ])('%s → 404 not_found', async (qr) => {
    const res = await resolve(qr);
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'not_found' });
  });

  it('boshqa kompaniya etiketkasi → 403 other_company', async () => {
    const res = await resolve('uhub:p/77/m0p06/s5');
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'other_company' });
  });
});

describe('fayllar', () => {
  it('GLB: abadiy kesh, model/gltf-binary', async () => {
    const res = await get('/files/glb/m0-r3.glb');
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(res.headers['content-type']).toBe('model/gltf-binary');
    expect(res.rawPayload.subarray(0, 4).toString('ascii')).toBe('glTF');
  });

  it('noma’lum fayl → 404', async () => {
    expect((await get('/files/glb/m0-r9.glb')).statusCode).toBe(404);
    expect((await get('/files/glb/..%2Fsecret.glb')).statusCode).toBe(404);
  });
});

describe('DELETE /mobile/device', () => {
  it('tokenni bekor qiladi', async () => {
    const pair = await app.inject({ method: 'POST', url: '/mobile/pair', payload: { code: '123456' } });
    const headers = { authorization: `Bearer ${pair.json().device_token}` };
    const del = await app.inject({ method: 'DELETE', url: '/mobile/device', headers });
    expect(del.statusCode).toBe(204);
    expect((await get('/mobile/projects', headers)).statusCode).toBe(401);
  });

  it('tokensiz → 401', async () => {
    expect((await app.inject({ method: 'DELETE', url: '/mobile/device' })).statusCode).toBe(401);
  });
});
