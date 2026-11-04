// Expo Router: tizimdan kelgan havolalar (kontrakt 1.6, 10.3) — `.uhub` fayl (VIEW intent) "Fayldan ochilganlar" ga.
// Hujjat: "Do not crash inside this function" — xatoda havola o'zgarmaydi.
import { incomingFileRoute } from '../files/incoming';

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    return incomingFileRoute(path) ?? path;
  } catch {
    return path;
  }
}
