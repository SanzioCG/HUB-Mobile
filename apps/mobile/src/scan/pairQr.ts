// Kontrakt 4.1: juftlash QR'i `uhub-pair:1?server=<URL-kodlangan base URL>&code=123456`.
// Skaner prefikslarni ajratadi: `uhub-pair:` — juftlash, `uhub:` — etiketka, boshqasi — "Bu U-HUB etiketkasi emas".

export interface PairQr {
  server: string;
  code: string;
}

export const PAIR_PREFIX = 'uhub-pair:';

export type QrKind = 'pair' | 'label' | 'other';

export function classifyQr(text: string): QrKind {
  if (text.startsWith(PAIR_PREFIX)) return 'pair';
  if (text.startsWith('uhub:')) return 'label';
  return 'other';
}

/** Versiya 1, server — http(s) manzil, kod — 6 raqam. Aks holda null. */
export function parsePairQr(text: string): PairQr | null {
  const m = /^uhub-pair:(\d+)\?(.*)$/.exec(text.trim());
  if (!m || m[1] !== '1') return null;
  const params = new Map<string, string>();
  for (const pair of m[2]!.split('&')) {
    const i = pair.indexOf('=');
    if (i <= 0) continue;
    try {
      params.set(pair.slice(0, i), decodeURIComponent(pair.slice(i + 1)));
    } catch {
      return null;
    }
  }
  const server = (params.get('server') ?? '').replace(/\/+$/, '');
  const code = params.get('code') ?? '';
  if (!/^https?:\/\/[^\s/]+/i.test(server) || !/^\d{6}$/.test(code)) return null;
  return { server, code };
}
