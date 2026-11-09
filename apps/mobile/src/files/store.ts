// "Fayldan ochilganlar" (kontrakt 1.6, 10.3): `.uhub` dan tekshirilgan `viewer/*` fayllari ilova xotirasiga
// (`documentDirectory/uhub/<id>/viewer/…`) yoziladi, ro'yxat — AsyncStorage'da, server loyihalaridan alohida.
// Asl `.uhub` saqlanmaydi: `project.json` va `documents/` (mijoz ma'lumoti) telefonga yozilmaydi.
// Bir xil `project_number` + `revision_id` lar qayta ochilsa — o'sha `id`, eski nusxa almashtiriladi.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { openUhub, uhubFileId, type UhubIndex, type UhubItem } from '@hub-mobile/viewer/uhub';

export interface OpenedFile {
  id: string;
  project_number: number;
  project_name: string;
  exported_at: string;
  /** Index'dagi `contract` (masalan V-1a fayli "1.5"). */
  contract: string;
  /** ISO-8601 — telefonda ochilgan vaqt. */
  opened_at: string;
  items: UhubItem[];
}

const KEY = 'uhub.files';

export const filesDir = () => new Directory(Paths.document, 'uhub');
export const fileDir = (id: string) => new Directory(filesDir(), id);

export async function listFiles(): Promise<OpenedFile[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as OpenedFile[]) : [];
    return list.sort((a, b) => b.opened_at.localeCompare(a.opened_at));
  } catch {
    return [];
  }
}

const saveList = (list: OpenedFile[]) => AsyncStorage.setItem(KEY, JSON.stringify(list));

/**
 * Buyum izohlari (kontrakt 1.9, 10.2) — kulrang, belgisiz. 1.9 dan oldin saqlangan fayllarda `notes` yo'q
 * (AsyncStorage'dagi eski yozuv) — bo'sh ro'yxat, xato emas.
 */
export const itemNotes = (it: Pick<UhubItem, 'notes'>): string[] =>
  Array.isArray(it.notes) ? it.notes.filter((n) => typeof n === 'string' && n.trim() !== '') : [];

export async function getFile(id: string): Promise<OpenedFile | null> {
  return (await listFiles()).find((f) => f.id === id) ?? null;
}

/** Faqat index'lar — QR → detal (10.4) uchun. */
export async function fileIndexes(): Promise<
  (Pick<UhubIndex, 'project_number' | 'items'> & { id: string })[]
> {
  return (await listFiles()).map((f) => ({ id: f.id, project_number: f.project_number, items: f.items }));
}

/**
 * `.uhub` baytlarini tekshiradi (yuklagich — `packages/viewer`, kontrakt 10.3) va saqlaydi.
 * Xato — `UhubError` (o'zbekcha `message`); hech narsa yozilmaydi.
 */
export async function importUhub(bytes: Uint8Array, now: () => Date = () => new Date()): Promise<OpenedFile> {
  const { index, files } = openUhub(bytes);
  const id = uhubFileId(index);
  const dir = fileDir(id);
  if (dir.exists) dir.delete();
  dir.create({ intermediates: true });
  const viewerDir = new Directory(dir, 'viewer');
  viewerDir.create();
  for (const [path, data] of files) {
    if (!path.startsWith('viewer/')) continue;
    const out = new File(dir, path);
    out.create();
    // SDK 58: `write` — async. `slice()` — fflate natijasi kattaroq bufer ichidagi ko'rinish bo'lishi mumkin.
    await out.write(data.slice());
  }
  const entry: OpenedFile = {
    id,
    project_number: index.project_number,
    project_name: index.project_name,
    exported_at: index.exported_at,
    contract: index.contract,
    opened_at: now().toISOString(),
    items: index.items,
  };
  const list = (await listFiles()).filter((f) => f.id !== id);
  await saveList([entry, ...list]);
  return entry;
}

export async function removeFile(id: string): Promise<void> {
  const dir = fileDir(id);
  if (dir.exists) dir.delete();
  await saveList((await listFiles()).filter((f) => f.id !== id));
}
