// QR matni (kontrakt 6): `uhub:p/<project_number>/<part_uid>/<snapshot>`. uid'da `/` bo'lishi mumkin, snapshot'da yo'q.

export interface ParsedQr {
  projectNumber: number;
  uid: string;
  snapshot: string;
}

const QR_RE = /^uhub:p\/(\d+)\/(.+)\/([^/]+)$/;

export const isUhubQr = (text: string) => text.startsWith('uhub:');

export function parseQr(text: string): ParsedQr | null {
  const m = QR_RE.exec(text.trim());
  if (!m) return null;
  return { projectNumber: Number(m[1]), uid: m[2]!, snapshot: m[3]! };
}

/** Kesh kaliti: `<project_number>/<part_uid>/<snapshot>` (batch M-A2, 3). */
export const qrKey = (p: ParsedQr) => `${p.projectNumber}/${p.uid}/${p.snapshot}`;

/** Bir xil matnni qayta-qayta o'qimaslik: shu oraliqda takror — e'tiborsiz. */
export const SCAN_DEBOUNCE_MS = 2000;

export function createDebouncer(windowMs = SCAN_DEBOUNCE_MS, now: () => number = Date.now) {
  let last: { text: string; at: number } | null = null;
  return (text: string): boolean => {
    const t = now();
    if (last && last.text === text && t - last.at < windowMs) return false;
    last = { text, at: t };
    return true;
  };
}
