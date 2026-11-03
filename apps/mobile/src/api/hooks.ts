import { useCallback, useEffect, useRef, useState } from 'react';
import { loadProject, loadProjects, saveProject, saveProjects } from '../offline/store';
import { useSession } from '../session/SessionProvider';
import { isOfflineError } from './errors';
import { latestUpdate, mergeProjects, sortByUpdated } from './projects';
import type { ProjectDetail, ProjectSummary } from './types';

export type Loadable<T> =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  /** `offline` — server yetmadi, oxirgi saqlangan javob ko'rsatilmoqda. */
  | { status: 'ok'; data: T; offline?: boolean };

/** Loyihalar ro'yxati; pull-to-refresh `updated_since` bilan faqat o'zgarganlarni oladi. Oflaynda — oxirgi javob. */
export function useProjectList() {
  const { client } = useSession();
  const [state, setState] = useState<Loadable<ProjectSummary[]>>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  /** Oxirgi so'rov muvaffaqiyatli bo'ldimi (sarlavhadagi holat nuqtasi). */
  const [online, setOnline] = useState<boolean | null>(null);
  const data = useRef<ProjectSummary[] | null>(null);

  const fetchAll = useCallback(
    () =>
      client.projects().then(
        (res) => {
          const list = sortByUpdated(res);
          data.current = list;
          setState({ status: 'ok', data: list });
          setOnline(true);
          void saveProjects(list);
        },
        async (error: unknown) => {
          setOnline(false);
          const cached = isOfflineError(error) ? await loadProjects() : null;
          if (cached) {
            data.current = cached;
            setState({ status: 'ok', data: cached, offline: true });
          } else {
            setState({ status: 'error', error });
          }
        },
      ),
    [client],
  );

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    void fetchAll();
  }, [fetchAll]);

  const refresh = useCallback(async () => {
    const prev = data.current;
    if (!prev) return reload();
    setRefreshing(true);
    try {
      const merged = mergeProjects(prev, await client.projects(latestUpdate(prev)));
      data.current = merged;
      setState({ status: 'ok', data: merged });
      setOnline(true);
      void saveProjects(merged);
    } catch {
      setOnline(false); // ro'yxat saqlanadi, nuqta sariq
    } finally {
      setRefreshing(false);
    }
  }, [client, reload]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  return { state, refreshing, online, reload, refresh };
}

const projectCache = new Map<string, ProjectDetail>();

/** Loyiha tafsiloti; xotiradagi nusxa darhol ko'rsatiladi va fonda yangilanadi. Oflaynda — oxirgi saqlangan javob. */
export function useProject(id: string) {
  const { client } = useSession();
  const [state, setState] = useState<Loadable<ProjectDetail>>(() => {
    const cached = projectCache.get(id);
    return cached ? { status: 'ok', data: cached } : { status: 'loading' };
  });

  const fetchOne = useCallback(
    () =>
      client.project(id).then(
        (p) => {
          projectCache.set(id, p);
          setState({ status: 'ok', data: p });
          void saveProject(p);
        },
        async (error: unknown) => {
          const stored = isOfflineError(error) ? (projectCache.get(id) ?? (await loadProject(id))) : null;
          if (stored) setState({ status: 'ok', data: stored, offline: true });
          else if (!projectCache.has(id)) setState({ status: 'error', error });
        },
      ),
    [client, id],
  );

  const reload = useCallback(() => {
    if (!projectCache.has(id)) setState({ status: 'loading' });
    void fetchOne();
  }, [fetchOne, id]);

  useEffect(() => {
    void fetchOne();
  }, [fetchOne]);

  return { state, reload };
}
