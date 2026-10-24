import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii } from '@/lib/theme';

import { Icon } from './Icon';
import { Text } from './Text';

interface ScreenProps {
  children: ReactNode;
  // Hueco inferior para la barra de pestañas flotante.
  withTabBar?: boolean;
  background?: string;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({ children, withTabBar, background = colors.bg, contentStyle }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + (withTabBar ? 112 : 32) },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return <Text variant="eyebrow" color="muted">{children}</Text>;
}

interface ScreenTitleProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}

export function ScreenTitle({ title, subtitle, onBack, right }: ScreenTitleProps) {
  return (
    <View style={styles.titleRow}>
      {onBack ? (
        <Pressable accessibilityLabel="Back" onPress={onBack} style={styles.back}>
          <Icon name="chevronRight" size={20} />
        </Pressable>
      ) : null}
      <View style={styles.flex}>
        <Text variant="title">{title}</Text>
        {subtitle ? <Text variant="body" color="muted">{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

// Zona "Add live photo": caja punteada para subir la prueba.
export function UploadDropzone({ title = 'Add live photo', caption = 'PNG, JPG up to 10MB', onPress }: { title?: string; caption?: string; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.dropzone}>
      <Icon name="camera" size={28} />
      <Text variant="bodyStrong">{title}</Text>
      <Text variant="caption" color="muted">{caption}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    transform: [{ scaleX: -1 }],
  },
  dropzone: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 28,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.mint,
    backgroundColor: colors.mintWash,
  },
});
