// Oflayn ma'lumotlar (AsyncStorage): loyihalar ro'yxati, loyiha tafsilotlari, resolve natijalari, etiketkalar.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ProjectDetail, ProjectSummary, ResolveResponse } from '../api/types';
import type { LabelRecord, OfflineData } from './labels';

const KEY = {
  projects: 'uhub.cache.projects',
  project: (id: string) => `uhub.cache.project.${id}`,
  projectIds: 'uhub.cache.projectIds',
  resolves: 'uhub.cache.resolves',
  labels: 'uhub.cache.labels',
} as const;

async function load<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const save = (key: string, value: unknown) =>
  AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => undefined);

export const saveProjects = (list: ProjectSummary[]) => save(KEY.projects, list);
export const loadProjects = () => load<ProjectSummary[] | null>(KEY.projects, null);

export async function saveProject(p: ProjectDetail): Promise<void> {
  await save(KEY.project(String(p.id)), p);
  const ids = await load<string[]>(KEY.projectIds, []);
  if (!ids.includes(String(p.id))) await save(KEY.projectIds, [...ids, String(p.id)]);
}
export const loadProject = (id: string) => load<ProjectDetail | null>(KEY.project(id), null);

export async function saveResolve(key: string, r: ResolveResponse): Promise<void> {
  const all = await load<Record<string, ResolveResponse>>(KEY.resolves, {});
  all[key] = r;
  await save(KEY.resolves, all);
}

export async function saveLabels(records: Record<string, LabelRecord>): Promise<void> {
  const all = await load<Record<string, LabelRecord>>(KEY.labels, {});
  await save(KEY.labels, { ...all, ...records });
}

/** Oflayn resolve uchun barcha kesh. */
export async function loadOfflineData(): Promise<OfflineData> {
  const [resolves, labels, ids] = await Promise.all([
    load<Record<string, ResolveResponse>>(KEY.resolves, {}),
    load<Record<string, LabelRecord>>(KEY.labels, {}),
    load<string[]>(KEY.projectIds, []),
  ]);
  const projects: Record<string, ProjectDetail> = {};
  for (const id of ids) {
    const p = await loadProject(id);
    if (p) projects[id] = p;
  }
  return { resolves, labels, projects };
}
