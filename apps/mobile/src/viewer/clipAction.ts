// Detal kartasi mantiqi (kontrakt 1.6 va 1.10, 2.2): klip tugmasi yozuvi va ikonkasi, detal joylashuvi.
// Sof funksiyalar — react-native importsiz (jest testi: test/partSheet.test.ts).
import { uz } from '../i18n/uz';
import type { IconName } from '../ui/Icon';
import type { PartExtras } from './bridge';

/**
 * Detal joylashuvi `reveal` kliplaridan (pantografda / tortma ichida / eshik orqasida).
 * Pantograf detali `reveal` ida eshiklar ham bor (avval eshik, keyin pantograf) — pantograf birinchi tekshiriladi.
 * TODO(contract): aniq joylashuv ("2-tortma ichida") kontraktda yo'q — tartib raqami bilinmaydi.
 */
export function locationOf(part: PartExtras): string | null {
  if (part.reveal.some((c) => c.includes('lift__'))) return uz.select.onLift;
  if (part.reveal.some((c) => c.startsWith('drawer__'))) return uz.select.inDrawer;
  if (part.reveal.some((c) => c.startsWith('door__'))) return uz.select.behindDoor;
  return null;
}

/**
 * Detal kartasidagi klip tugmasi (viewer `selected.clip`): yozuv va ikonka.
 * Pantograf (`lift__`, kontrakt 1.10) — "tushirish / ko'tarish"; eshik va tortma — "Ochish / Yopish".
 * Loyiha rejimidagi `<item>::` prefiksi bilan ham ishlaydi (`includes`).
 */
export function clipAction(clip: string, open: boolean): { label: string; icon: IconName } {
  if (clip.includes('lift__'))
    return open
      ? { label: uz.part.liftUp, icon: 'arrow-up-to-line' }
      : { label: uz.part.liftDown, icon: 'arrow-down-to-line' };
  const label = open ? uz.part.close : uz.part.open;
  if (clip.includes('door__')) return { label, icon: open ? 'door-close' : 'door-open' };
  return { label, icon: open ? 'drawer-close' : 'drawer-open' };
}
