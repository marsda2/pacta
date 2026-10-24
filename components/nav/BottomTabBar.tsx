import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text, type IconName } from '@/components/ui';
import { colors, radii, shadows } from '@/lib/theme';

const tabs: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Home', icon: 'home' },
  pacts: { label: 'Pacts', icon: 'pacts' },
  copilot: { label: 'Pax', icon: 'copilot' },
  progress: { label: 'Progress', icon: 'progress' },
};

// Barra inferior flotante de PACTA para expo-router (<Tabs tabBar={...} />).
export function BottomTabBar({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const meta = tabs[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          const color = focused ? colors.forest : colors.muted;

          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };

          return (
            <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected: focused }} onPress={onPress} style={[styles.item, focused && styles.itemOn]}>
              <Icon name={meta.icon} size={22} color={color} />
              <Text variant="caption" color={color} style={focused && { fontWeight: '700' }}>{meta.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    gap: 4,
    padding: 6,
    width: '100%',
    maxWidth: 520,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadows.raised,
  },
  item: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 9, borderRadius: radii.lg },
  itemOn: { backgroundColor: colors.mintSoft },
});
