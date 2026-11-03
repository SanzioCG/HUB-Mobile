import { uz } from '../i18n/uz';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Nisbiy vaqt, o'zbekcha: "hozirgina", "5 daqiqa oldin", "kecha", 7 kundan keyin — sana (kk.oo.yyyy). */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return uz.common.dash;
  const diff = Math.max(0, now - t);
  if (diff < MIN) return uz.time.now;
  if (diff < HOUR) return uz.time.minutes(Math.floor(diff / MIN));
  if (diff < DAY) return uz.time.hours(Math.floor(diff / HOUR));
  const days = Math.floor(diff / DAY);
  if (days === 1) return uz.time.yesterday;
  if (days < 7) return uz.time.days(days);
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}
