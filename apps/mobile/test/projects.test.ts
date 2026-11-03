import { filterProjects, latestUpdate, mergeProjects } from '../src/api/projects';
import { matchesStatusFilter, revisionLabel, type ProjectSummary } from '../src/api/types';
import { relativeTime } from '../src/utils/time';

const p = (id: number, number: number, name: string, status: string, updated_at: string): ProjectSummary => ({
  id,
  number,
  name,
  status,
  items_count: 1,
  updated_at,
  thumb_url: null,
});

const LIST = [
  p(101, 51, 'Oshxona — Chilonzor', 'production', '2026-11-02T14:30:00Z'),
  p(102, 52, 'Yotoqxona shkafi', 'design', '2026-10-28T09:10:00Z'),
  p(103, 53, 'Ofis stellaji', 'done', '2026-10-15T16:45:00Z'),
];

describe('updated_since bilan yangilash', () => {
  it('o‘zgarganlar almashtiriladi, yangilari qo‘shiladi, yangilangan vaqt bo‘yicha tartib', () => {
    const changed = [
      p(102, 52, 'Yotoqxona shkafi (2)', 'production', '2026-11-03T08:00:00Z'),
      p(104, 54, 'Dahliz', 'design', '2026-11-03T07:00:00Z'),
    ];
    const merged = mergeProjects(LIST, changed);
    expect(merged.map((x) => x.id)).toEqual([102, 104, 101, 103]);
    expect(merged.find((x) => x.id === 102)!.name).toBe('Yotoqxona shkafi (2)');
  });

  it('latestUpdate — eng yangi updated_at', () => {
    expect(latestUpdate(LIST)).toBe('2026-11-02T14:30:00Z');
    expect(latestUpdate([])).toBeUndefined();
  });
});

describe('qidiruv va filtr', () => {
  it('raqam (№ bilan ham) yoki nom bo‘yicha, katta-kichik harfsiz', () => {
    expect(filterProjects(LIST, '52', 'all').map((x) => x.id)).toEqual([102]);
    expect(filterProjects(LIST, '№ 53', 'all').map((x) => x.id)).toEqual([103]);
    expect(filterProjects(LIST, 'OSHXONA', 'all').map((x) => x.id)).toEqual([101]);
    expect(filterProjects(LIST, 'yo‘q', 'all')).toEqual([]);
  });

  it('segment filtr (taxminiy status mosligi)', () => {
    expect(filterProjects(LIST, '', 'production').map((x) => x.id)).toEqual([101]);
    expect(filterProjects(LIST, '', 'unapproved').map((x) => x.id)).toEqual([102]);
    expect(matchesStatusFilter('anything', 'all')).toBe(true);
  });
});

describe('ko‘rinish yordamchilari', () => {
  it('revisionLabel', () => {
    expect(revisionLabel('m0-r5')).toBe('R5');
    expect(revisionLabel('rev-abc')).toBe('rev-abc');
  });

  it('relativeTime o‘zbekcha', () => {
    const now = Date.parse('2026-11-03T12:00:00Z');
    expect(relativeTime('2026-11-03T11:59:30Z', now)).toBe('hozirgina');
    expect(relativeTime('2026-11-03T11:55:00Z', now)).toBe('5 daqiqa oldin');
    expect(relativeTime('2026-11-03T09:00:00Z', now)).toBe('3 soat oldin');
    expect(relativeTime('2026-11-02T10:00:00Z', now)).toBe('kecha');
    expect(relativeTime('2026-10-30T12:00:00Z', now)).toBe('4 kun oldin');
    expect(relativeTime('2026-10-15T12:00:00Z', now)).toMatch(/^15\.10\.2026$/);
    expect(relativeTime('noto‘g‘ri', now)).toBe('—');
  });
});
