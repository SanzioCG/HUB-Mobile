import type { ProjectStatus, ProjectSummary, StatusFilter } from './types';
import { matchesStatusFilter } from './types';

/** `updated_since` javobini mavjud ro'yxatga qo'shish: id bo'yicha almashtirish, yangilari qo'shiladi. */
export function mergeProjects(
  prev: readonly ProjectSummary[],
  changed: readonly ProjectSummary[],
): ProjectSummary[] {
  // TODO(contract): o'chirilgan loyiha `updated_since` javobida qanday bildirilishi kontraktda yo'q.
  const byId = new Map(prev.map((p) => [p.id, p]));
  for (const p of changed) byId.set(p.id, p);
  return sortByUpdated([...byId.values()]);
}

export function sortByUpdated(list: ProjectSummary[]): ProjectSummary[] {
  return list.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
}

/** Eng oxirgi `updated_at` — keyingi `updated_since` uchun. */
export function latestUpdate(list: readonly ProjectSummary[]): string | undefined {
  let best: ProjectSummary | undefined;
  for (const p of list) if (!best || Date.parse(p.updated_at) > Date.parse(best.updated_at)) best = p;
  return best?.updated_at;
}

/** Mahalliy qidiruv (raqam yoki nom) va segment filtr. */
export function filterProjects(
  list: readonly ProjectSummary[],
  query: string,
  filter: StatusFilter,
): ProjectSummary[] {
  const q = query.trim().toLowerCase().replace(/^№\s*/, '');
  return list.filter(
    (p) =>
      matchesStatusFilter(p.status as ProjectStatus, filter) &&
      (!q || String(p.number).includes(q) || p.name.toLowerCase().includes(q)),
  );
}
