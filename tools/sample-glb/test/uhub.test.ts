// M-A7, 3-qism: sintetik `.uhub` — kontrakt 1.6 (2.5 lmdf/pvc/noma'lum kind, 10.2 warnings), shisha eshik, `__mid`.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { strFromU8, unzipSync } from 'fflate';
import { SAMPLE_WARNINGS, buildSampleUhub, partsOf, sampleUhubSpec } from '../src/uhub.js';

const files = unzipSync(await buildSampleUhub());
const json = (p: string) => JSON.parse(strFromU8(files[p]!)) as Record<string, unknown>;
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');

describe('sintetik .uhub', () => {
  it('tuzilma: manifest, viewer/index.json, GLB’lar, project.json va documents/', () => {
    expect(Object.keys(files).sort()).toEqual([
      'documents/item-1.json',
      'manifest.json',
      'project.json',
      'viewer/f1.glb',
      'viewer/f2.glb',
      'viewer/index.json',
    ]);
  });

  it('manifest: format uhub/1, har fayl (manifestdan boshqa) SHA-256 bilan', () => {
    const m = json('manifest.json') as { format: string; files: Record<string, string> };
    expect(m.format).toBe('uhub/1');
    expect(Object.keys(m.files).sort()).toEqual(
      Object.keys(files)
        .filter((p) => p !== 'manifest.json')
        .sort(),
    );
    for (const [p, h] of Object.entries(m.files)) expect(sha(files[p]!), p).toBe(h);
  });

  it('index: format uhub-viewer/1, kontrakt 1.6, transform, parts = GLB uid’lari, warnings faqat A da', async () => {
    const idx = json('viewer/index.json') as {
      format: string;
      contract: string;
      project_number: number;
      items: {
        item_id: string;
        glb: string;
        parts: { uid: string }[];
        warnings?: string[];
        transform: unknown;
      }[];
    };
    expect(idx.format).toBe('uhub-viewer/1');
    expect(idx.contract).toBe('1.6');
    expect(idx.project_number).toBe(51);
    expect(idx.items.map((i) => i.item_id)).toEqual(['f1', 'f2']);
    expect(idx.items[0]!.warnings).toEqual(SAMPLE_WARNINGS);
    expect(idx.items[1]!.warnings).toBeUndefined();
    const io = new NodeIO();
    for (const it of idx.items) {
      const doc = await io.readBinary(files[it.glb]!);
      expect(it.parts.map((p) => p.uid).sort()).toEqual(
        partsOf(doc)
          .map((p) => p.uid)
          .sort(),
      );
      expect(doc.getRoot().listExtensionsUsed()).toEqual([]);
    }
    expect(JSON.stringify(idx)).not.toContain('Sinov Mijoz'); // mijoz ma'lumoti index'ga kirmaydi
  });

  it('A: shisha eshik (BLEND), lmdf, pvc, noma’lum kind, __mid; kliplar fayldan ham bor', async () => {
    const doc = await new NodeIO().readBinary(files['viewer/f1.glb']!);
    const kinds = doc
      .getRoot()
      .listMaterials()
      .map((m) => (m.getExtras() as { uhub: { kind: string } }).uhub.kind);
    expect(kinds).toEqual(expect.arrayContaining(['lmdf', 'pvc', 'akril', 'glass']));
    const door = partsOf(doc).find((p) => p.kind === 'door')!;
    expect(door.name).toBe('Shisha eshik');
    const glass = doc
      .getRoot()
      .listMaterials()
      .find((m) => m.getName() === 'mat__glass-clear-6')!;
    expect(glass.getAlphaMode()).toBe('BLEND');
    expect(
      doc
        .getRoot()
        .listNodes()
        .some((n) => n.getName().endsWith('__mid')),
    ).toBe(true);
    expect(
      doc
        .getRoot()
        .listAnimations()
        .map((a) => a.getName()),
    ).toEqual(expect.arrayContaining(['door__d1__open', 'drawer__d2__open']));
  });

  it('deterministik (fixture git’da)', async () => {
    expect(sha(await buildSampleUhub())).toBe(sha(await buildSampleUhub()));
    expect(sampleUhubSpec().items).toHaveLength(2);
  });
});
