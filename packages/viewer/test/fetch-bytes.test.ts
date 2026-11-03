import { describe, expect, it } from 'vitest';
import { readWithProgress } from '../src/fetch-bytes.js';

const stream = (chunks: number[][]) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      for (const ch of chunks) c.enqueue(new Uint8Array(ch));
      c.close();
    },
  });

describe('progress (readWithProgress)', () => {
  it('har bo‘lakda loaded oshadi, oxirida baytlar to‘liq', async () => {
    const calls: [number, number | null][] = [];
    const buf = await readWithProgress(stream([[1, 2], [3], [4, 5, 6]]), 6, (l, t) => calls.push([l, t]));
    expect([...new Uint8Array(buf)]).toEqual([1, 2, 3, 4, 5, 6]);
    expect(calls).toEqual([
      [0, 6],
      [2, 6],
      [3, 6],
      [6, 6],
    ]);
  });

  it('hajm noma’lum bo‘lsa total = null', async () => {
    const calls: (number | null)[] = [];
    await readWithProgress(stream([[1]]), null, (_l, t) => calls.push(t));
    expect(calls.every((t) => t === null)).toBe(true);
  });
});
