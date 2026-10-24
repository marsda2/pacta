import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radii, shadows } from '@/lib/theme';

interface CardProps extends ViewProps {
  padding?: number;
  style?: StyleProp<ViewStyle>;
}

export function Card({ padding = 20, style, ...props }: CardProps) {
  return <View {...props} style={[styles.card, { padding }, style]} />;
}

// Superficie "vidrio" menta/aqua de Copilot y de los estados positivos.
export function GlassCard({ padding = 22, style, children, ...props }: CardProps) {
  return (
    <LinearGradient
      colors={[colors.mintWash, colors.aquaWash]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.glass, { padding }, style]}
      {...(props as object)}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadows.card,
  },
  glass: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(188, 233, 213, 0.9)',
    boxShadow: shadows.card,
    overflow: 'hidden',
  },
});
