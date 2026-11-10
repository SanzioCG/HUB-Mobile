// U-HUB mobil dizayn palitrasi — "Graphite Engineering" (laym aksent, yangi 3D-kub logosi bilan).
// Komponentlarda rang va o'lcham faqat shu yerdan.
// Laym kam ishlatiladi: tanlangan holat, asosiy amal, faol indikator. Ustidagi matn — `onAccent` (to'q).

export const colors = {
  /** Asosiy amal, tanlangan holat, faol indikator, tanlov konturi. */
  accent: '#C1EF1B',
  /** Aksent ustidagi matn va ikonka (laym fonda oq o'qilmaydi). Kontrast 14:1. */
  onAccent: '#0B0D0F',
  /** Tanlangan holat foni (aksentning past shaffof varianti). */
  accentSoft: 'rgba(193,239,27,0.12)',
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
  /** Figma 06 Mobile Viewer — pastki tab bar (220:2). */
  tabBar: '#15171A',
  tabBorder: '#2B3036',
  tabInactive: '#878F94',
  /** Figma 06: kamera ustidagi qorong'i qatlamlar (04 QR skaner) va undagi tugmalar. */
  cameraScrim: 'rgba(6,8,10,0.82)',
  cameraChip: 'rgba(6,8,10,0.78)',
  cameraControls: 'rgba(6,8,10,0.9)',
  cameraButton: '#131619',
  cameraButtonBorder: '#363D42',
  cameraHint: '#B8C2C9',
  /** Figma 06: QR topildi belgisi (06), versiya qatori (03). */
  success: '#47BF73',
  faint: '#596169',
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
