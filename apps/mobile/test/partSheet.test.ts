// V-110 (kontrakt 1.10, 2.2): detal kartasidagi pantograf tugmasi va joylashuv matni.
import { clipAction, locationOf } from '../src/viewer/clipAction';
import type { PartExtras } from '../src/viewer/bridge';

const part = (reveal: string[]) => ({ reveal }) as unknown as PartExtras;

describe('clipAction', () => {
  it('pantograf: yopiq — tushirish, ochiq — ko‘tarish', () => {
    expect(clipAction('lift__1__open', false)).toEqual({
      label: 'Pantografni tushirish',
      icon: 'arrow-down-to-line',
    });
    expect(clipAction('lift__1__open', true)).toEqual({
      label: 'Pantografni ko‘tarish',
      icon: 'arrow-up-to-line',
    });
  });
  it('loyiha rejimi prefiksi bilan ham pantograf', () => {
    expect(clipAction('shkaf-2::lift__a__open', false).icon).toBe('arrow-down-to-line');
  });
  it('eshik va tortma avvalgidek', () => {
    expect(clipAction('door__1__open', false)).toEqual({ label: 'Ochish', icon: 'door-open' });
    expect(clipAction('door__1__open', true)).toEqual({ label: 'Yopish', icon: 'door-close' });
    expect(clipAction('drawer__1__open', false)).toEqual({ label: 'Ochish', icon: 'drawer-open' });
  });
});

describe('locationOf', () => {
  it('pantograf detali (reveal: eshik, keyin pantograf) — "Pantografda"', () => {
    expect(locationOf(part(['door__1__open', 'lift__1__open']))).toBe('Pantografda');
  });
  it('tortma va eshik avvalgidek', () => {
    expect(locationOf(part(['door__1__open', 'drawer__2__open']))).toBe('Tortma ichida');
    expect(locationOf(part(['door__1__open']))).toBe('Eshik orqasida');
    expect(locationOf(part([]))).toBeNull();
  });
});
