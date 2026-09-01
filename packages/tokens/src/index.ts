/**
 * Design tokens consumed by apps/web (Tailwind theme) and apps/mobile
 * (StyleSheet constants). Values only — rendering stays in each app.
 */

export const colors = {
  primary: '#0EA5E9',
  primaryDark: '#0369A1',
  accent: '#F59E0B',
  surface: '#FFFFFF',
  surfaceMuted: '#F8FAFC',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  border: '#E2E8F0',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
} as const;

/** Spacing scale in logical pixels; multiples of the 4px base grid. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 9999,
} as const;

/** Font sizes in logical pixels; line heights are unitless multipliers. */
export const typography = {
  sizes: { xs: 12, sm: 14, md: 16, lg: 20, xl: 24, xxl: 32 },
  lineHeights: { tight: 1.25, normal: 1.5, relaxed: 1.75 },
  weights: { regular: '400', medium: '500', semibold: '600', bold: '700' },
} as const;

export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
