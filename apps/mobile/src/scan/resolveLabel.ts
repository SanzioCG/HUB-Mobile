// QR matni → resolve natijasi (kontrakt 6, 1–2-qadamlar). Oflaynda — keshlangan natijalar va etiketkalardan.
import type { ApiClient } from '../api/client';
import { ApiError, errorMessage, isOfflineError } from '../api/errors';
import { uz } from '../i18n/uz';
import { offlineResolve } from '../offline/labels';
import { loadOfflineData, saveResolve } from '../offline/store';
import { isUhubQr, parseQr, qrKey } from './qr';
import type { ScanSelection } from './selection';

export type LabelResult =
  | { ok: true; selection: ScanSelection }
  | { ok: false; message: string; /** skaner davom etadi */ notUhub?: boolean };

export async function resolveLabel(client: ApiClient, qr: string): Promise<LabelResult> {
  if (!isUhubQr(qr)) return { ok: false, message: uz.scan.notUhub, notUhub: true };
  try {
    const result = await client.resolve(qr);
    const parsed = parseQr(qr);
    if (parsed) void saveResolve(qrKey(parsed), result);
    return { ok: true, selection: { qr, result, offline: false } };
  } catch (e) {
    if (isOfflineError(e)) {
      // Kontrakt 6.2: oflaynda — keshda shu reviziya bo'lsa keshdan, bo'lmasa xabar.
      const result = offlineResolve(qr, await loadOfflineData());
      return result
        ? { ok: true, selection: { qr, result, offline: true } }
        : { ok: false, message: uz.scan.offlineMissing };
    }
    if (e instanceof ApiError && e.kind === 'http' && (e.status === 404 || e.status === 400)) {
      return { ok: false, message: e.code === 'not_uhub' ? uz.scan.notUhub : uz.scan.notFound };
    }
    return { ok: false, message: errorMessage(e) };
  }
}
