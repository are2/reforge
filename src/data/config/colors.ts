/**
 * Design token color definitions.
 * These mirror the @theme values in index.css.
 * Use Tailwind classes (e.g. bg-primary-500) in components —
 * import from here only when raw values are needed in JS/TS logic.
 */

export const primary = {
  50: '#FFFBEB',
  100: '#FEF3C7',
  200: '#FDE68A',
  300: '#FCD34D',
  400: '#FBBF24',
  500: '#F59E0B',
  600: '#D97706',
  700: '#B45309',
  800: '#92400E',
  900: '#78350F',
} as const

export const secondary = {
  50: '#ECFDF5',
  100: '#D1FAE5',
  200: '#A7F3D0',
  300: '#6EE7B7',
  400: '#34D399',
  500: '#10B981',
  600: '#059669',
  700: '#047857',
  800: '#065F46',
  900: '#064E3B',
} as const

export const neutral = {
  0: '#FFFFFF',
  25: '#FAFAFA',
  50: '#F4F4F5',
  100: '#E4E4E7',
  200: '#D4D4D8',
  300: '#A1A1AA',
  400: '#71717A',
  500: '#52525B',
  600: '#3F3F46',
  700: '#2A2A30',
  800: '#222228',
  850: '#1C1D22',
  900: '#17181C',
  950: '#0F1115',
} as const

export const accent = {
  violet: '#E9A8F5',
  blue: '#60A5FA',
  red: '#F87171',
} as const

/** Semantic mapping helpers for JS-side logic (prefer Tailwind classes instead). */
export const darkSurface = {
  appBg: neutral[950],
  surface1: neutral[900],
  surface2: neutral[850],
  surface3: neutral[800],
  selected: neutral[700],
  border: neutral[600],
  textPrimary: neutral[50],
  textSecondary: neutral[300],
  textTertiary: neutral[400],
} as const

export const lightSurface = {
  appBg: neutral[25],
  surface1: neutral[0],
  surface2: neutral[50],
  surface3: neutral[100],
  selected: neutral[200],
  border: neutral[200],
  textPrimary: neutral[900],
  textSecondary: neutral[600],
  textTertiary: neutral[500],
} as const
