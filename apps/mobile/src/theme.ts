// U-HUB qorong'i uslubi (kontrakt 1-bo'lim + M-A1 tokenlari). Komponentlarda rang va o'lcham faqat shu yerdan.

export const colors = {
  bg: '#111214',
  panel: '#191A1D',
  panel2: '#222428',
  active: '#2C2F35',
  accent: '#3988FF',
  text: '#E6E8EB',
  textMuted: '#8B929B',
  yellow: '#F2C14E',
  green: '#4CC38A',
  white: '#FFFFFF',
  /** Thumb bo'lmaganda joy (grafit) va skeleton — panel2. */
  graphite: '#222428',
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
