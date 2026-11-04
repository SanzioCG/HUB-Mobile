// Kontrakt 1.6, 10-bo'lim: `.uhub` yuklagichi — to'g'ri fayl, buzilgan SHA, `..` yo'l, ZIP-bomba, `viewer/` yo'q,
// noma'lum format, `project.json` ochilmasligi, QR'ning 4 holati (10.4), transform.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { strToU8, unzipSync, zipSync } from 'fflate';
import { Group, Quaternion, Vector3 } from 'three';
import { sampleUhubSpec, uhubEntries, zipEntries } from '@hub-mobile/sample-glb/uhub';
import { applyTransform } from '../src/project.js';
import {
  FILE_QR_TEXT,
  UHUB_LIMITS,
  UhubError,
  isSafePath,
  itemKey,
  openUhub,
  resolveFromFiles,
  type UhubErrorCode,
} from '../src/uhub.js';

const entries = await uhubEntries(sampleUhubSpec());
const good = zipEntries(entries);

const code = (f: () => unknown): UhubErrorCode | null => {
  try {
    f();
    return null;
  } catch (e) {
    expect(e).toBeInstanceOf(UhubError);
    return (e as UhubError).code;
  }
};

/** ZIP ichida `name` yozuvining siqilgan ma'lumotini buzadi (mahalliy sarlavha bo'yicha). */
function corruptEntryData(zip: Uint8Array, name: string): Uint8Array {
  const out = zip.slice();
  const nameBytes = strToU8(name);
  for (let i = 0; i + 30 < out.length; i++) {
    if (out[i] !== 0x50 || out[i + 1] !== 0x4b || out[i + 2] !== 0x03 || out[i + 3] !== 0x04) continue;
    const nLen = out[i + 26]! | (out[i + 27]! << 8);
    const xLen = out[i + 28]! | (out[i + 29]! << 8);
    const n = out.subarray(i + 30, i + 30 + nLen);
    if (nLen !== nameBytes.length || !n.every((b, k) => b === nameBytes[k])) continue;
    const size = out[i + 18]! | (out[i + 19]! << 8) | (out[i + 20]! << 16);
    out.fill(0xff, i + 30 + nLen + xLen, i + 30 + nLen + xLen + size);
    return out;
  }
  throw new Error(`yozuv topilmadi: ${name}`);
}

describe('to‘g‘ri fayl', () => {
  it('index va faqat viewer/* fayllari; ogohlantirishlar; approved eksport paytidagi', () => {
    const { index, files } = openUhub(good);
    expect(index.project_number).toBe(51);
    expect(index.contract).toBe('1.6');
    expect(index.items.map((i) => i.item_id)).toEqual(['f1', 'f2']);
    expect(index.items.map(itemKey)).toEqual(['f1', 'f2']);
    expect([...files.keys()].sort()).toEqual(['viewer/f1.glb', 'viewer/f2.glb', 'viewer/index.json']);
    expect(index.items[0]!.warnings).toHaveLength(1);
    expect(index.items[1]!.warnings).toEqual([]);
    expect(index.items.map((i) => i.approved)).toEqual([true, false]);
    expect(index.items[1]!.transform.translation).toEqual([0.95, 0, 0]);
    expect(index.items[0]!.parts.length).toBeGreaterThan(10);
  });

  it('project.json va documents/ ochilmaydi: ularning siqilgan ma’lumoti buzilsa ham fayl ochiladi', () => {
    let zip = corruptEntryData(good, 'project.json');
    zip = corruptEntryData(zip, 'documents/item-1.json');
    // nazorat: hamma yozuvni ochmoqchi bo'lsa — yiqiladi (buzilgan deflate)
    expect(() => unzipSync(zip)).toThrow();
    const { files } = openUhub(zip);
    expect(files.has('project.json')).toBe(false);
    expect([...files.keys()].some((k) => k.startsWith('documents/'))).toBe(false);
  });

  it('noma’lum qo‘shimcha maydonlar e’tiborsiz', () => {
    const idx = JSON.parse(new TextDecoder().decode(entries['viewer/index.json']!)) as Record<
      string,
      unknown
    >;
    const spec = { ...entries, 'viewer/index.json': strToU8(JSON.stringify({ ...idx, kelajak: 1 })) };
    expect(code(() => openUhub(zipEntries(resign(spec))))).toBeNull();
  });
});

/** Manifestni qayta hisoblaydi (buzilgan yozuv SHA'si to'g'ri bo'lsin — boshqa tekshiruvni sinash uchun). */
function resign(files: Record<string, Uint8Array>): Record<string, Uint8Array> {
  // SHA-256 Node crypto bilan (sinov tomoni), yuklagich @noble/hashes ishlatadi.
  const sums: Record<string, string> = {};
  for (const [p, b] of Object.entries(files))
    if (p !== 'manifest.json') sums[p] = createHash('sha256').update(b).digest('hex');
  return { ...files, 'manifest.json': strToU8(JSON.stringify({ format: 'uhub/1', files: sums })) };
}

describe('rad etiladi (tushunarli xabar, yiqilmaydi)', () => {
  it('bitta GLB bayti o‘zgargan → sha_mismatch', () => {
    const glb = entries['viewer/f1.glb']!.slice();
    glb[100] = glb[100]! ^ 0xff;
    const e = code(() => openUhub(zipEntries({ ...entries, 'viewer/f1.glb': glb })));
    expect(e).toBe('sha_mismatch');
  });

  it.each(['../evil.txt', 'viewer/../../evil.glb', '/abs/viewer.glb', 'C:/viewer/x.glb', 'viewer\\x.glb'])(
    'yo‘l %s → bad_path',
    (name) => {
      expect(isSafePath(name)).toBe(false);
      expect(code(() => openUhub(zipEntries({ ...entries, [name]: strToU8('x') })))).toBe('bad_path');
    },
  );

  it('ZIP-bomba (ochilgandagi hajm siqilganidan juda katta) → zip_bomb', () => {
    const bomb = new Uint8Array(20 * 1024 * 1024); // nollar — ~20 KB ga siqiladi
    const zip = zipSync({
      ...Object.fromEntries(Object.entries(entries)),
      'viewer/bomb.bin': [bomb, { level: 9 }],
    });
    expect(code(() => openUhub(zip))).toBe('zip_bomb');
  });

  it('yozuvlar > 2 000 → too_many_entries; fayl > 50 MB → too_large', () => {
    const many: Record<string, Uint8Array> = { ...entries };
    for (let i = 0; i <= UHUB_LIMITS.maxEntries; i++) many[`viewer/x${i}.txt`] = new Uint8Array(1);
    expect(code(() => openUhub(zipEntries(many)))).toBe('too_many_entries');
    expect(code(() => openUhub(new Uint8Array(UHUB_LIMITS.maxFileBytes + 1)))).toBe('too_large');
  });

  it('viewer/ yo‘q (eski fayl) → no_viewer, kontrakt matni', () => {
    const old = Object.fromEntries(Object.entries(entries).filter(([p]) => !p.startsWith('viewer/')));
    let err: unknown;
    try {
      openUhub(zipEntries(resign(old)));
    } catch (e) {
      err = e;
    }
    expect((err as UhubError).code).toBe('no_viewer');
    expect((err as UhubError).message).toBe(
      'Bu fayl ko‘rish uchun tayyorlanmagan — U-HUB’da qayta eksport qiling',
    );
  });

  it('format major noma’lum → "Ilovani yangilang"', () => {
    const idx = JSON.parse(new TextDecoder().decode(entries['viewer/index.json']!)) as Record<
      string,
      unknown
    >;
    const v2 = resign({
      ...entries,
      'viewer/index.json': strToU8(JSON.stringify({ ...idx, format: 'uhub-viewer/2' })),
    });
    expect(code(() => openUhub(zipEntries(v2)))).toBe('format_unknown');
    const m2 = { ...resign(entries) };
    const man = JSON.parse(new TextDecoder().decode(m2['manifest.json']!)) as Record<string, unknown>;
    m2['manifest.json'] = strToU8(JSON.stringify({ ...man, format: 'uhub/2' }));
    let err: unknown;
    try {
      openUhub(zipEntries(m2));
    } catch (e) {
      err = e;
    }
    expect((err as UhubError).code).toBe('format_unknown');
    expect((err as UhubError).message).toBe('Ilovani yangilang');
  });

  it('ZIP emas → bad_zip', () => {
    expect(code(() => openUhub(strToU8('bu zip emas')))).toBe('bad_zip');
  });
});

describe('QR → detal, fayldan (10.4)', () => {
  const { index } = openUhub(good);
  const glassDoorUid = index.items[0]!.parts.find((p) => p.kind === 'door')!.uid;

  it('1) shu loyiha fayli yo‘q', () => {
    expect(resolveFromFiles({ projectNumber: 77, partUid: glassDoorUid, snapshot: 's5' }, [index])).toEqual({
      kind: 'no_file',
    });
    expect(FILE_QR_TEXT.noFile).toBe('Bu loyiha telefonda yo‘q — faylini oching');
  });

  it('2) snapshot mos → o‘sha buyum va detal', () => {
    const r = resolveFromFiles({ projectNumber: 51, partUid: glassDoorUid, snapshot: 's5' }, [index]);
    expect(r).toMatchObject({ kind: 'match', uid: glassDoorUid });
    expect(r.kind === 'match' && r.item.item_id).toBe('f1');
  });

  it('3) snapshot mos emas, lekin detal faylda bor → sariq banner matni', () => {
    const r = resolveFromFiles({ projectNumber: 51, partUid: glassDoorUid, snapshot: 's9' }, [index]);
    expect(r.kind).toBe('other_snapshot');
    expect(FILE_QR_TEXT.otherSnapshot('R5')).toBe('Etiketka boshqa reviziyadan. Fayldagi: R5');
  });

  it('4) detal fayldagi reviziyada yo‘q', () => {
    expect(resolveFromFiles({ projectNumber: 51, partUid: 'yoq-uid', snapshot: 's5' }, [index])).toEqual({
      kind: 'no_part',
    });
    expect(FILE_QR_TEXT.noPart).toBe('Bu detal fayldagi reviziyada yo‘q');
  });
});

describe('transform (10.2): translation metrda, rotation [x, y, z, w]', () => {
  it('buyum loyiha ramkasiga qo‘yiladi, masshtab o‘zgarmaydi', () => {
    const holder = new Group();
    const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
    applyTransform(holder, { translation: [1.2, 0, 0.018], rotation: [q.x, q.y, q.z, q.w] });
    holder.updateMatrixWorld(true);
    expect(holder.position.toArray()).toEqual([1.2, 0, 0.018]);
    expect(holder.scale.toArray()).toEqual([1, 1, 1]);
    // buyumning old tomoni (+Z) Y atrofida 90° → +X
    const front = new Vector3(0, 0, 1).applyQuaternion(holder.quaternion);
    expect(front.x).toBeCloseTo(1);
    expect(front.z).toBeCloseTo(0);
  });
});
