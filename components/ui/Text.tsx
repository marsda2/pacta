import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, type, type TypeVariant } from '@/lib/theme';

const palette = {
  text: colors.text,
  muted: colors.muted,
  white: colors.white,
  amber: colors.amber,
  amberInk: colors.amberInk,
  danger: colors.danger,
  verified: colors.status.verified,
  onDark: colors.dark.textMuted,
} as const;

export type TextColor = keyof typeof palette;

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  color?: TextColor | (string & {});
}

export function Text({ variant = 'body', color = 'text', style, ...props }: TextProps) {
  const resolved = color in palette ? palette[color as TextColor] : color;
  return <RNText {...props} style={[type[variant], { color: resolved }, style]} />;
}
