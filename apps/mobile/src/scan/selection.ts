// Skaner → 3D ekran: resolve natijasini uzatish. Navigatsiya parametrlarida faqat QR matni,
// natijaning o'zi shu yerda (xotirada). Ketma-ket skanerlashda o'sha buyum ochiq bo'lsa — hodisa (model qayta yuklanmaydi).
import { useEffect, useRef } from 'react';
import type { ResolveResponse } from '../api/types';

export interface ScanSelection {
  qr: string;
  result: ResolveResponse;
  /** Natija keshdan (oflayn) olingan. */
  offline: boolean;
}

const selections = new Map<string, ScanSelection>();
const listeners = new Set<(sel: ScanSelection) => void>();

export function putSelection(sel: ScanSelection): void {
  selections.set(sel.qr, sel);
}

export function getSelection(qr: string): ScanSelection | undefined {
  return selections.get(qr);
}

/** Ochiq 3D ekranga yangi tanlovni yuborish; tinglovchi bo'lmasa false. */
export function emitSelection(sel: ScanSelection): boolean {
  putSelection(sel);
  for (const l of listeners) l(sel);
  return listeners.size > 0;
}

export function useSelectionListener(fn: (sel: ScanSelection) => void): void {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useEffect(() => {
    const l = (sel: ScanSelection) => ref.current(sel);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
}

/** 3D ekrandagi buyum kaliti: o'sha buyum + o'sha reviziya bo'lsa model qayta yuklanmaydi. */
export const itemKey = (itemId: string, revisionId: string) => `${itemId}@${revisionId}`;
