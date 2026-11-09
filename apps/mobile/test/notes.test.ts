// V-110 qism 2 (kontrakt 1.9, 10.2): `notes` — eski saqlangan fayllarda (1.9 dan oldin) maydon yo'q, xato bo'lmasligi kerak.
import { fileIndexes, getFile, itemNotes, listFiles } from '../src/files/store';

const mockMem = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => mockMem.get(k) ?? null),
  setItem: jest.fn(async (k: string, v: string) => void mockMem.set(k, v)),
}));
jest.mock('expo-file-system', () => ({ Directory: jest.fn(), File: jest.fn(), Paths: { document: '/doc' } }));

/** 1.9 dan oldin saqlangan yozuv: buyumlarda `notes` maydoni umuman yo'q. */
const OLD_ENTRY = {
  id: '1042-r5',
  project_number: 1042,
  project_name: 'Oshxona',
  exported_at: '2026-11-01T10:00:00Z',
  contract: '1.6',
  opened_at: '2026-11-02T10:00:00Z',
  items: [
    {
      item_id: 'shkaf-1',
      name: 'Shkaf 600',
      revision_id: 'r5',
      revision_label: 'R5',
      approved: true,
      snapshot: 's1',
      size_mm: { width: 600, height: 2100, depth: 560 },
      transform: { translation: [0, 0, 0], rotation: [0, 0, 0, 1] },
      glb: 'viewer/shkaf-1.glb',
      thumb: null,
      parts: [],
      warnings: [],
    },
  ],
};

beforeEach(() => {
  mockMem.clear();
  mockMem.set('uhub.files', JSON.stringify([OLD_ENTRY]));
});

it('eski fayl o‘qiladi, notes — bo‘sh ro‘yxat', async () => {
  const f = await getFile('1042-r5');
  const item = f?.items[0];
  expect(item).toBeDefined();
  expect(item!.notes).toBeUndefined();
  expect(itemNotes(item!)).toEqual([]);
  expect(await listFiles()).toHaveLength(1);
  expect((await fileIndexes())[0]?.items[0]?.item_id).toBe('shkaf-1');
});

it('yangi fayl: notes kulrang ro‘yxat uchun, bo‘sh satrlarsiz', () => {
  expect(itemNotes({ notes: ['Tutqich yo‘q', ' ', 'Shisha 4 mm'] })).toEqual(['Tutqich yo‘q', 'Shisha 4 mm']);
  expect(itemNotes({ notes: undefined })).toEqual([]);
});
