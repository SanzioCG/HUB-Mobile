// U-HUB mobil dizayn palitrasi (docs/design/mobile-design-concept.png, M-A4). Komponentlarda rang va o'lcham faqat shu yerdan.

export const colors = {
  /** Asosiy tugmalar, faol holat, tanlov konturi. */
  accent: '#3988FF',
  /** Faqat brend elementlari (logo, splash, onboarding). */
  accentSecondary: '#6A5CFF',
  accentTertiary: '#00C2FF',
  bg: '#0B0D0F',
  panel: '#15181C',
  surface: '#22262B',
  border: '#333A41',
  text: '#F3F5F6',
  /** Ikkinchi matn: fon 7.6:1, panel 7.0:1, surface 6.0:1 (WCAG AA). */
  textMuted: '#9AA3AD',
  /** Holat nuqtalari: panel ustida sariq 10.6:1, yashil 8.0:1. */
  yellow: '#F2C14E',
  green: '#4CC38A',
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
  sm: 14,
  md: 15,
  lg: 16,
  title: 20,
  number: 32,
} as const;

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

/** Bosiladigan nishon kamida 44 px. */
export const hit = 44;

export const size = {
  dot: 8,
  thumb: 56,
  pinCell: 48,
  icon: 22,
} as const;

export const duration = { sheet: 220 } as const;
