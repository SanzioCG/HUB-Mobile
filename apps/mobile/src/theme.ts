// U-HUB mobil dizayn palitrasi — "Graphite Engineering" (laym aksent, yangi 3D-kub logosi bilan).
// Komponentlarda rang va o'lcham faqat shu yerdan.
// Laym kam ishlatiladi: tanlangan holat, asosiy amal, faol indikator. Ustidagi matn — `onAccent` (to'q).

export const colors = {
  /** Asosiy amal, tanlangan holat, faol indikator, tanlov konturi. */
  accent: '#C6F542',
  /** Aksent ustidagi matn va ikonka (laym fonda oq o'qilmaydi). Kontrast 14:1. */
  onAccent: '#0B0D0F',
  /** Tanlangan holat foni (aksentning past shaffof varianti). */
  accentSoft: 'rgba(198,245,66,0.12)',
  bg: '#0B0D0F',
  panel: '#15181C',
  surface: '#1C2025',
  /** Faol (bosilgan, tanlangan) yuza. */
  raised: '#252A30',
  border: '#2A2F36',
  text: '#F4F5F2',
  /** Ikkinchi matn: fon 6.6:1, panel 6.1:1, surface 5.6:1 (WCAG AA). */
  textMuted: '#9299A3',
  /**
   * Holat ranglari — Brand Kit v1 tokenlari (assets/design/design-tokens.json: warning, success, danger; ASSETS.md 6-izoh).
   * Panel ustida: sariq 9.5:1, yashil 8.8:1, qizil 7.6:1. TODO(contract): kontrakt 1-bo'limida hali #F2C14E / #4CC38A.
   */
  yellow: '#E9B45F',
  green: '#67C99A',
  danger: '#ED8F8F',
  white: '#FFFFFF',
  scrim: 'rgba(0,0,0,0.5)',
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  mono: 'DMMono_400Regular',
  monoMedium: 'DMMono_500Medium',
} as const;

/** Matn 14–16 px; sarlavha va karta raqami — alohida. */
export const fontSize = {
  /** Panel tugmalari yorlig'i, holat chipi. */
  label: 12,
  sm: 14,
  md: 15,
  lg: 16,
  title: 20,
  number: 32,
} as const;

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

/** Bosiladigan nishon kamida 48 dp (Android Material). */
export const hit = 48;

export const size = {
  dot: 8,
  thumb: 56,
  pinCell: 48,
  icon: 22,
  /** Bo'sh holat va ruxsat ekranlaridagi illyustratsiya balandligi. */
  illustration: 120,
} as const;

export const duration = { sheet: 220 } as const;
