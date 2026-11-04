// Kontrakt 1.6 (10.3): tizim "Ochish" orqali kelgan `.uhub` (Android VIEW intent, app.config intent filtri).
// Expo Router `+native-intent` → `redirectSystemPath`: `content://` / `file://` havola → "Fayldan ochilganlar"
// ekrani, u faylni o'zi ochadi. Faqat build'da (Expo Go intent filtrlarini ishlatmaydi).

const FILE_URI = /^(content|file):\/\//i;

/** Kelgan fayl havolasi bo'lsa — ichki marshrut, aks holda null (oddiy havolalar o'zgarmaydi). */
export function incomingFileRoute(path: string): string | null {
  if (!FILE_URI.test(path)) return null;
  return `/files?incoming=${encodeURIComponent(path)}`;
}
