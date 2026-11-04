import { describe, expect, it } from 'vitest';
import { parseIncoming } from '../src/bridge.js';

describe('parseIncoming', () => {
  it.each([
    [{ type: 'load', glbUrl: 'http://x/m0.glb', token: 't' }],
    [{ type: 'load', glbUrl: 'http://x/m0.glb', token: '' }],
    [{ type: 'select', uid: 'm0p06' }],
    [{ type: 'showAll' }],
    [{ type: 'openAll' }],
    [{ type: 'closeAll' }],
    [{ type: 'toggle', clip: 'door__d1__open' }],
    [{ type: 'setMode', mode: 'solid' }],
    [{ type: 'setMode', mode: 'edges' }],
    [{ type: 'setMode', mode: 'xray' }],
    [{ type: 'setDims', on: true }],
    [{ type: 'resetView' }],
    [{ type: 'deselect' }],
    [{ type: 'setView', view: 'front' }],
    [{ type: 'setView', view: 'iso' }],
    [{ type: 'setGroupVisible', group: 'fronts', on: false }],
    [{ type: 'fit' }],
  ])('%j qabul qilinadi', (msg) => {
    expect(parseIncoming(msg)).toEqual({ ok: true, msg });
  });

  it('JSON satr ham qabul qilinadi (React Native WebView)', () => {
    expect(parseIncoming('{"type":"select","uid":"a1"}')).toEqual({
      ok: true,
      msg: { type: 'select', uid: 'a1' },
    });
  });

  it('ortiqcha maydonlar tashlab yuboriladi', () => {
    expect(parseIncoming({ type: 'showAll', extra: 1 })).toEqual({ ok: true, msg: { type: 'showAll' } });
  });

  it.each([
    ['null', null],
    ['raqam', 42],
    ['buzilgan JSON', '{type:'],
    ["noma'lum type", { type: 'explode' }],
    ['type yo‘q', { uid: 'x' }],
    ['load: glbUrl yo‘q', { type: 'load', token: 't' }],
    ['load: token yo‘q', { type: 'load', glbUrl: 'u' }],
    ['select: bo‘sh uid', { type: 'select', uid: '' }],
    ['select: uid raqam', { type: 'select', uid: 6 }],
    ['toggle: clip yo‘q', { type: 'toggle' }],
    ['setMode: noto‘g‘ri rejim', { type: 'setMode', mode: 'wire' }],
    ['setDims: on satr', { type: 'setDims', on: 'true' }],
    ['chiquvchi xabar', { type: 'ready' }],
    ['setView: noma’lum ko‘rinish', { type: 'setView', view: 'back' }],
    ['setGroupVisible: noma’lum guruh', { type: 'setGroupVisible', group: 'doors', on: true }],
    ['setGroupVisible: on yo‘q', { type: 'setGroupVisible', group: 'fronts' }],
  ])('%s → rad etiladi', (_name, raw) => {
    expect(parseIncoming(raw).ok).toBe(false);
  });
});

describe('loadProject (kontrakt 1.6, 10.4 — "Butun loyiha")', () => {
  it('buyumlar kaliti, GLB va transform bilan', () => {
    const items = [
      { key: 'a', glbUrl: 'viewer/a.glb', transform: { translation: [0.3, 0, 0], rotation: [0, 0, 0, 1] } },
      { key: 'b', glbUrl: 'viewer/b.glb' },
    ];
    expect(parseIncoming({ type: 'loadProject', items, token: '' })).toEqual({
      ok: true,
      msg: { type: 'loadProject', items, token: '' },
    });
  });

  it('bo‘sh ro‘yxat yoki buzilgan transform — rad', () => {
    expect(parseIncoming({ type: 'loadProject', items: [], token: '' }).ok).toBe(false);
    const bad = [
      { key: 'a', glbUrl: 'viewer/a.glb', transform: { translation: [0, 0], rotation: [0, 0, 0, 1] } },
    ];
    expect(parseIncoming({ type: 'loadProject', items: bad, token: '' }).ok).toBe(false);
  });
});
