import { uz } from '../i18n/uz';
import { ERROR } from './types';

/**
 * Barcha API xatolari shu tipga keltiriladi.
 * - network: so'rov serverga yetmadi (Wi-Fi yo'q, IP noto'g'ri, server o'chiq);
 * - timeout: javob vaqtida kelmadi;
 * - http: server javob berdi, lekin 2xx emas (`status`, `code` — tanadagi xato kodi);
 * - parse: javob JSON emas yoki kutilgan shaklda emas;
 * - config: server manzili yo'q.
 */
export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'parse' | 'config';

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    message: string,
    readonly status?: number,
    readonly code?: string,
    /** Server matni (`{error, message}` dagi `message`). */
    readonly serverMessage?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const isUnauthorized = (e: unknown) => e instanceof ApiError && e.status === 401;

/** Server yetmadi (tarmoq/timeout) — keshdagi javob ko'rsatiladi. HTTP xatosi (401, 404…) — kesh emas. */
export const isOfflineError = (e: unknown) =>
  e instanceof ApiError && (e.kind === 'network' || e.kind === 'timeout');

/** Foydalanuvchiga ko'rsatiladigan matn. */
export function errorMessage(e: unknown): string {
  if (!(e instanceof ApiError)) return e instanceof Error ? e.message : String(e);
  switch (e.kind) {
    case 'network':
      return uz.errors.network;
    case 'timeout':
      return uz.errors.timeout;
    case 'parse':
      return uz.errors.parse;
    case 'config':
      return uz.errors.config;
    case 'http':
      // Kontrakt 4: matn — serverning `message` i; bo'lmasa `error` kodi bo'yicha zaxira matn.
      if (e.serverMessage) return e.serverMessage;
      return codeMessage(e.code) ?? statusMessage(e.status);
  }
}

function codeMessage(code: string | undefined): string | undefined {
  switch (code) {
    case ERROR.badQr:
      return uz.errors.badQr;
    case ERROR.notFound:
      return uz.errors.notFound;
    case ERROR.tokenRevoked:
      return uz.errors.tokenRevoked;
    case ERROR.pairCodeExpired:
      return uz.errors.pairCodeExpired;
    case ERROR.rateLimited:
      return uz.errors.rateLimited;
    default:
      return undefined;
  }
}

function statusMessage(status: number | undefined): string {
  if (status === 401) return uz.errors.unauthorized;
  if (status === 404) return uz.errors.notFound;
  return uz.errors.server(status ?? 0);
}
