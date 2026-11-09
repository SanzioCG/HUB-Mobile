// V-110: klip tugmasi ikonkasi — pantograf (`lift__`) alohida, eshik/tortma o'zgarmagan.
import { describe, expect, it } from 'vitest';
import { clipIconName } from '../src/icons';

describe('clipIconName', () => {
  it('pantograf: yopiq — tushirish, ochiq — ko‘tarish', () => {
    expect(clipIconName('lift__1__open', false)).toBe('lift-down');
    expect(clipIconName('lift__1__open', true)).toBe('lift-up');
  });
  it('loyiha rejimi prefiksi bilan ham', () => {
    expect(clipIconName('shkaf-2::lift__a__open', false)).toBe('lift-down');
  });
  it('eshik va tortma avvalgidek', () => {
    expect(clipIconName('door__1__open', false)).toBe('door-open');
    expect(clipIconName('door__1__open', true)).toBe('door-close');
    expect(clipIconName('drawer__2__open', false)).toBe('drawer-open');
    expect(clipIconName('drawer__2__open', true)).toBe('drawer-close');
  });
});
