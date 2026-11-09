// Kontrakt 8: uhub-config (share rejimi) va bundle versiyasi.
import { describe, expect, it } from 'vitest';
import { parseUhubConfig } from '../src/model.js';
import { VIEWER_CONTRACT, VIEWER_VERSION, isContractCompatible } from '../src/version.js';

describe('uhub-config', () => {
  it('konfiguratsiya bor — share rejimi undan ishga tushadi', () => {
    const text = JSON.stringify({
      glb_url: 'https://x/s/t/m0.glb',
      usdz_url: null,
      title: 'M-0',
      mode: 'share',
    });
    expect(parseUhubConfig(text)).toEqual({
      glb_url: 'https://x/s/t/m0.glb',
      usdz_url: null,
      title: 'M-0',
      mode: 'share',
    });
  });

  it('konfiguratsiya yo‘q yoki noto‘g‘ri — null (viewer postMessage’dan ishlaydi)', () => {
    expect(parseUhubConfig(null)).toBeNull();
    expect(parseUhubConfig(undefined)).toBeNull();
    expect(parseUhubConfig('')).toBeNull();
    expect(parseUhubConfig('{buzilgan')).toBeNull();
    expect(parseUhubConfig(JSON.stringify({ title: 'glb yo‘q' }))).toBeNull();
  });
});

describe('versiya', () => {
  it('VIEWER_VERSION semver, kontrakt 1.10', () => {
    expect(VIEWER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(VIEWER_CONTRACT).toBe('1.10');
  });

  it('1.10 GLB qabul qilinadi (major 1; "1.10" > "1.9", satr sifatida solishtirilmaydi)', () => {
    expect(isContractCompatible('1.10')).toBe(true);
    expect(isContractCompatible('1.9')).toBe(true);
    expect(isContractCompatible('10.1')).toBe(false);
  });

  it('kontrakt major mosligi', () => {
    expect(isContractCompatible('1.3')).toBe(true);
    expect(isContractCompatible('1.1')).toBe(true);
    expect(isContractCompatible('2.0')).toBe(false);
    expect(isContractCompatible(undefined)).toBe(false);
  });
});
