import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, shadows } from '@/lib/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'mint' | 'outline' | 'link';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  leadingIcon?: IconName;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const tone = {
  primary: { bg: colors.forest, fg: colors.white, border: 'transparent' },
  mint: { bg: colors.mint, fg: colors.forest, border: 'transparent' },
  outline: { bg: colors.surface, fg: colors.forest, border: colors.forest },
  link: { bg: 'transparent', fg: colors.forest, border: 'transparent' },
} as const;

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  leadingIcon,
  disabled,
  fullWidth = true,
  style,
}: ButtonProps) {
  const t = disabled ? { bg: colors.disabledBg, fg: colors.disabledText, border: 'transparent' } : tone[variant];
  const isLink = variant === 'link';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isLink ? styles.link : { backgroundColor: t.bg, borderColor: t.border, borderWidth: variant === 'outline' ? 1.5 : 0 },
        variant === 'primary' && !disabled && { boxShadow: shadows.button },
        fullWidth && !isLink && styles.full,
        pressed && !disabled && { opacity: 0.92, transform: [{ scale: 0.985 }] },
        style,
      ]}
    >
      {leadingIcon ? <Icon name={leadingIcon} size={18} color={t.fg} /> : null}
      <Text
        variant="bodyStrong"
        color={t.fg}
        style={[variant === 'mint' && { fontWeight: '700' }, isLink && styles.underline, !fullWidth && !isLink && null]}
      >
        {label}
      </Text>
      {icon ? (
        <View style={styles.trailing}>
          <Icon name={icon} size={18} color={t.fg} strokeWidth={2.2} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: 22,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  full: { alignSelf: 'stretch' },
  link: { minHeight: 36, paddingHorizontal: 4 },
  underline: { textDecorationLine: 'underline', textDecorationColor: colors.aqua },
  trailing: { marginLeft: 4 },
});
