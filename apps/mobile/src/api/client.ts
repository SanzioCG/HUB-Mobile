// Kontrakt 4-bo'lim klienti. Xatolar `ApiError` ga keltiriladi; har so'rovda timeout.
import { API_TIMEOUT_MS } from '../config';
import { ApiError } from './errors';
import {
  parseErrorBody,
  type ArFormat,
  type ArLinkResponse,
  type PairResponse,
  type ProjectDetail,
  type ProjectSummary,
  type ResolveResponse,
} from './types';

export interface ClientOptions {
  baseUrl: string | null;
  token?: string | null;
  timeoutMs?: number;
  fetch?: typeof fetch;
  /** Token talab qiladigan so'rovda 401 — token bekor qilingan (kontrakt 4: desktopdan). */
  onUnauthorized?: () => void;
}

interface RequestOptions {
  body?: unknown;
  /** false — `pair`: token yuborilmaydi, 401 = noto'g'ri kod. */
  auth?: boolean;
}

export type ApiClient = ReturnType<typeof createClient>;

export function createClient(opts: ClientOptions) {
  const doFetch = opts.fetch ?? fetch;
  const timeoutMs = opts.timeoutMs ?? API_TIMEOUT_MS;

  async function request<T>(
    method: string,
    path: string,
    { body, auth = true }: RequestOptions = {},
  ): Promise<T> {
    if (!opts.baseUrl) throw new ApiError('config', 'server manzili yo‘q');
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth && opts.token) headers.Authorization = `Bearer ${opts.token}`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res: Response;
    try {
      res = await doFetch(`${opts.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: ctrl.signal,
      });
    } catch (e) {
      if (ctrl.signal.aborted) throw new ApiError('timeout', `${method} ${path}: ${timeoutMs} ms`);
      throw new ApiError('network', `${method} ${path}: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const { code, message } = parseErrorBody(await res.json().catch(() => null));
      if (res.status === 401 && auth) opts.onUnauthorized?.();
      throw new ApiError('http', `${method} ${path}: HTTP ${res.status}`, res.status, code, message);
    }
    if (res.status === 204) return undefined as T;
    try {
      return (await res.json()) as T;
    } catch {
      throw new ApiError('parse', `${method} ${path}: JSON emas`, res.status);
    }
  }

  const q = (v: string) => encodeURIComponent(v);

  return {
    pair: (code: string) => request<PairResponse>('POST', '/mobile/pair', { body: { code }, auth: false }),
    projects: (updatedSince?: string) =>
      request<ProjectSummary[]>(
        'GET',
        `/mobile/projects${updatedSince ? `?updated_since=${q(updatedSince)}` : ''}`,
      ),
    project: (id: number | string) => request<ProjectDetail>('GET', `/mobile/projects/${q(String(id))}`),
    resolve: (qr: string) => request<ResolveResponse>('GET', `/mobile/resolve?qr=${q(qr)}`),
    unpairDevice: () => request<void>('DELETE', '/mobile/device'),
    arLink: (itemId: string, revisionId: string, format: ArFormat) =>
      request<ArLinkResponse>('POST', '/mobile/ar-link', {
        body: { item_id: itemId, revision_id: revisionId, format },
      }),
  };
}
