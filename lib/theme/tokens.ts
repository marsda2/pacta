import type { TextStyle } from 'react-native';

// Tokens de diseño de PACTA. Fuente visual: UI Kit y Windows & Flows.
export const colors = {
  forest: '#123C35',
  forestSoft: '#1B5247',
  mint: '#BCE9D5',
  mintSoft: '#E2F5ED',
  mintWash: '#F0FAF6',
  aqua: '#80D9E7',
  aquaWash: '#E3F7FA',
  amber: '#FFC247',
  amberInk: '#A66E00',
  amberSoft: '#FFF4DC',
  bg: '#F4F7F5',
  surface: '#FFFFFF',
  subtle: '#EEF4F1',
  border: '#DDE8E3',
  text: '#123C35',
  muted: '#67807B',
  placeholder: '#9DB0AB',
  disabledBg: '#E5ECE9',
  disabledText: '#A5B6B1',
  white: '#FFFFFF',
  danger: '#EB5757',
  dangerSoft: '#FDECEC',
  status: {
    scheduled: '#67807B',
    progress: '#FFC247',
    pending: '#FBA94C',
    verified: '#1CB57E',
    missed: '#EB5757',
  },
  dark: {
    bg: '#0A1C18',
    surface: '#0F2621',
    border: '#15342D',
    glow: '#F6AA38',
    textMuted: 'rgba(255,255,255,0.55)',
  },
} as const;

export const radii = { sm: 10, md: 16, lg: 24, xl: 28, pill: 9999 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const shadows = {
  card: '0 4px 24px -2px rgba(18, 60, 53, 0.07)',
  raised: '0 8px 30px -4px rgba(18, 60, 53, 0.14)',
  button: '0 6px 16px -4px rgba(18, 60, 53, 0.35)',
  mintGlow: '0 0 24px 0 rgba(188, 233, 213, 0.55)',
  amberGlow: '0 0 14px 4px rgba(246, 170, 56, 0.55)',
} as const;

export const type = {
  display: { fontSize: 32, lineHeight: 36, fontWeight: '800', letterSpacing: -1 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.6 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  small: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  eyebrow: { fontSize: 11, lineHeight: 14, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase' },
  timer: { fontSize: 46, lineHeight: 52, fontWeight: '300', letterSpacing: -1, fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;
