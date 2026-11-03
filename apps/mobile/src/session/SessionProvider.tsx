import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createClient, type ApiClient } from '../api/client';
import { defaultApiUrl, trimSlash } from '../config';
import {
  clearSession,
  createUnauthorizedHandler,
  loadApiUrl,
  loadSession,
  saveApiUrl,
  saveSession,
  type StoredSession,
} from './storage';

type SessionState =
  { status: 'loading' } | { status: 'unpaired' } | { status: 'paired'; session: StoredSession };

interface SessionValue {
  state: SessionState;
  apiUrl: string | null;
  setApiUrl(url: string): Promise<void>;
  client: ApiClient;
  /** `server` berilsa (juftlash QR'i, kontrakt 4.1) — avval shu manzil saqlanadi. Bir vaqtda bitta server. */
  pair(code: string, server?: string): Promise<void>;
  unpair(): Promise<void>;
}

const Ctx = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  const [apiUrl, setApiUrlState] = useState<string | null>(defaultApiUrl());

  useEffect(() => {
    void (async () => {
      const [session, savedUrl] = await Promise.all([loadSession(), loadApiUrl()]);
      if (savedUrl) setApiUrlState(savedUrl);
      setState(session ? { status: 'paired', session } : { status: 'unpaired' });
    })();
  }, []);

  const onUnauthorized = useMemo(() => createUnauthorizedHandler(() => setState({ status: 'unpaired' })), []);
  const token = state.status === 'paired' ? state.session.token : null;
  const client = useMemo(
    () => createClient({ baseUrl: apiUrl, token, onUnauthorized: () => void onUnauthorized() }),
    [apiUrl, token, onUnauthorized],
  );

  const pair = useCallback(
    async (code: string, server?: string) => {
      const base = server ? trimSlash(server) : apiUrl;
      const res = await createClient({ baseUrl: base }).pair(code);
      if (server && base) {
        await saveApiUrl(base);
        setApiUrlState(base);
      }
      const session = { token: res.device_token, user: res.user, company: res.company };
      await saveSession(session);
      setState({ status: 'paired', session });
    },
    [apiUrl],
  );

  const unpair = useCallback(async () => {
    await client.unpairDevice().catch(() => undefined); // server yetmasa ham mahalliy uziladi
    await clearSession();
    setState({ status: 'unpaired' });
  }, [client]);

  const setApiUrl = useCallback(async (url: string) => {
    const clean = trimSlash(url);
    await saveApiUrl(clean);
    setApiUrlState(clean);
  }, []);

  const value = useMemo(
    () => ({ state, apiUrl, setApiUrl, client, pair, unpair }),
    [state, apiUrl, setApiUrl, client, pair, unpair],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession: SessionProvider yo‘q');
  return v;
}

/** Juftlangan sessiya; 401 dan keyin ekran yopilguncha null bo'lishi mumkin. */
export function usePairedSession(): StoredSession | null {
  const { state } = useSession();
  return state.status === 'paired' ? state.session : null;
}
