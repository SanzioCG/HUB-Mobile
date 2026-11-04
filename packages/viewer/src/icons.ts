// M-A6: AR overlay va fayl sahifasi ikonkalari — repo ildizidagi assets/ dan (Vite `?raw`), bundle ichida (oflayn,
// tarmoqdan olinmaydi). SVG shu nom bilan almashtirilsa — kod o'zgarmaydi. Rang — CSS `color` (currentColor).
import doorOpen from '../../../assets/icons/door-open.svg?raw';
import doorClose from '../../../assets/icons/door-close.svg?raw';
import drawerOpen from '../../../assets/icons/drawer-open.svg?raw';
import drawerClose from '../../../assets/icons/drawer-close.svg?raw';
import openAll from '../../../assets/icons/open-all.svg?raw';
import swingZone from '../../../assets/icons/swing-zone.svg?raw';
import arCoach from '../../../assets/illustrations/ar-coach.svg?raw';
import arUnsupported from '../../../assets/illustrations/ar-unsupported.svg?raw';
import { stripSvgMetadata } from './brand.js';

const lucide = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

/** Lucide (ISC) — ASSETS.md ro'yxatidagi `x` va `rotate-ccw`; maxsus fayli yo'q. */
const LUCIDE = {
  x: lucide('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
  'rotate-ccw': lucide('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>'),
};

const SVGS = {
  'door-open': doorOpen,
  'door-close': doorClose,
  'drawer-open': drawerOpen,
  'drawer-close': drawerClose,
  'open-all': openAll,
  'swing-zone': swingZone,
  'ar-coach': arCoach,
  'ar-unsupported': arUnsupported,
  ...LUCIDE,
} as const;

export type ViewerIconName = keyof typeof SVGS;

/** `<span class="icon">` ichida SVG; o'lcham — CSS (`width`/`height`), rang — `color`. */
export function iconEl(name: ViewerIconName, cls = 'icon'): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = cls;
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = stripSvgMetadata(SVGS[name]);
  return span;
}

/** Klip tugmasi ikonkasi: eshik/tortma, ochiq yoki yopiq holatga qarab (ochiq bo'lsa — yopish). */
export const clipIconName = (clip: string, open: boolean): ViewerIconName =>
  clip.includes('door__') ? (open ? 'door-close' : 'door-open') : open ? 'drawer-close' : 'drawer-open';
