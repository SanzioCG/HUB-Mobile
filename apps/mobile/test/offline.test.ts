// Oflayn kesh (batch M-A2, 3): LRU tozalash, kesh kaliti, oflayn resolve qidiruvi.
import type { ProjectDetail, ResolveResponse } from '../src/api/types';
import { CACHE_LIMITS } from '../src/config';
import { labelsFromParts, offlineResolve, type OfflineData } from '../src/offline/labels';
import { formatMb, glbFileName, planEviction, usageOf, type CacheEntry } from '../src/offline/policy';

jest.mock('expo-constants', () => ({ expoConfig: {} }));

const MB = 1024 * 1024;
const entry = (revisionId: string, lastUsed: number, bytes = MB): CacheEntry => ({
  revisionId,
  bytes,
  lastUsed,
});

describe('LRU tozalash', () => {
  it('chegara config.ts da: 20 reviziya yoki 500 MB', () => {
    expect(CACHE_LIMITS).toEqual({ maxRevisions: 20, maxBytes: 500 * MB });
  });

  it('soni oshsa — eng eski ishlatilganlar o‘chiriladi', () => {
    const entries = Array.from({ length: 23 }, (_, i) => entry(`r${i}`, 1000 + i));
    expect(planEviction(entries, CACHE_LIMITS)).toEqual(['r0', 'r1', 'r2']);
  });

  it('hajm oshsa — hajm chegaraga tushguncha', () => {
    const entries = [entry('a', 1, 200 * MB), entry('b', 2, 200 * MB), entry('c', 3, 200 * MB)];
    expect(planEviction(entries, CACHE_LIMITS)).toEqual(['a']);
  });

  it('LRU tartibi lastUsed bo‘yicha, ro‘yxat tartibiga bog‘liq emas', () => {
    const entries = [entry('new', 50, 300 * MB), entry('old', 10, 300 * MB)];
    expect(planEviction(entries, CACHE_LIMITS)).toEqual(['old']);
  });

  it('hozir ochilayotgan reviziya o‘chirilmaydi (o‘zi chegaradan katta bo‘lsa ham)', () => {
    expect(planEviction([entry('big', 1, 600 * MB)], CACHE_LIMITS, 'big')).toEqual([]);
    expect(planEviction([entry('old', 1, 100 * MB), entry('big', 2, 450 * MB)], CACHE_LIMITS, 'big')).toEqual(
      ['old'],
    );
  });

  it('chegarada — hech narsa o‘chirilmaydi; band hajm', () => {
    const entries = Array.from({ length: 20 }, (_, i) => entry(`r${i}`, i));
    expect(planEviction(entries, CACHE_LIMITS)).toEqual([]);
    expect(usageOf(entries)).toEqual({ count: 20, bytes: 20 * MB });
    expect(formatMb(36 * 1024)).toBe('0.04 MB');
  });
});

describe('kesh kaliti', () => {
  it('revision_id → fayl nomi', () => {
    expect(glbFileName('m0-r5')).toBe('m0-r5.glb');
    expect(glbFileName('rev/5 a')).toBe('rev_5_a.glb');
  });
});

describe('oflayn resolve', () => {
  const BASE = 'http://x/files/glb';
  const ctx = (rev: string) => ({
    project_id: 101,
    item_id: 'm0',
    item_name: 'M-0 namuna',
    revision_id: `m0-${rev.toLowerCase()}`,
    revision_label: rev,
    glb_url: `${BASE}/m0-${rev.toLowerCase()}.glb`,
  });
  const parts = (snap: string, uids: string[]) =>
    uids.map((uid) => ({ uid, name: `Detal ${uid}`, qr: `uhub:p/51/${uid}/${snap}` }));
  const project = (revisionId: string, label: string): ProjectDetail =>
    ({
      id: 101,
      items: [
        {
          item_id: 'm0',
          revision_id: revisionId,
          revision_label: label,
          glb_url: `${BASE}/${revisionId}.glb`,
        },
      ],
    }) as unknown as ProjectDetail;

  const data = (over: Partial<OfflineData> = {}): OfflineData => ({
    resolves: {},
    labels: {
      ...labelsFromParts(parts('s3', ['m0p06', 'm0p22', 'A1/B2.c']), ctx('R3')),
      ...labelsFromParts(parts('s5', ['m0p06', 'A1/B2.c']), ctx('R5')),
    },
    projects: { '101': project('m0-r5', 'R5') },
    ...over,
  });

  it('ochilgan modeldagi etiketka — joriy reviziya', () => {
    expect(offlineResolve('uhub:p/51/m0p06/s5', data())).toMatchObject({
      project_id: 101,
      project_number: 51,
      revision_id: 'm0-r5',
      part_uid: 'm0p06',
      part_name: 'Detal m0p06',
      is_latest: true,
      part_in_latest: true,
    });
  });

  it('eski reviziya etiketkasi: joriy reviziya keshlangan loyihadan, part_in_latest etiketkalardan', () => {
    expect(offlineResolve('uhub:p/51/m0p06/s3', data())).toMatchObject({
      revision_id: 'm0-r3',
      is_latest: false,
      part_in_latest: true,
      latest_revision_id: 'm0-r5',
      latest_revision_label: 'R5',
    });
    expect(offlineResolve('uhub:p/51/m0p22/s3', data())).toMatchObject({
      is_latest: false,
      part_in_latest: false,
    });
  });

  it('ruxsat etilmagan belgili uid ham topiladi', () => {
    expect(offlineResolve('uhub:p/51/A1/B2.c/s5', data())?.part_uid).toBe('A1/B2.c');
  });

  it('keshlangan onlayn resolve natijasi ustun', () => {
    const online = { part_uid: 'm0p06', revision_id: 'online' } as ResolveResponse;
    expect(offlineResolve('uhub:p/51/m0p06/s5', data({ resolves: { '51/m0p06/s5': online } }))).toBe(online);
  });

  it('loyiha keshda yo‘q — etiketkadagi reviziya joriy deb olinadi', () => {
    expect(offlineResolve('uhub:p/51/m0p06/s3', data({ projects: {} }))).toMatchObject({
      is_latest: true,
      latest_revision_id: 'm0-r3',
    });
  });

  it('keshda yo‘q yoki buzilgan QR — null', () => {
    expect(offlineResolve('uhub:p/51/zzz/s5', data())).toBeNull();
    expect(offlineResolve('uhub:p/52/m0p06/s5', data())).toBeNull();
    expect(offlineResolve('https://example.com', data())).toBeNull();
  });
});
