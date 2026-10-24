import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii } from '@/lib/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

interface SegmentedProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  // "tabs": píldora oscura (Today / Upcoming / Completed). "cards": método de prueba con icono.
  variant?: 'tabs' | 'cards';
}

export function Segmented<T extends string>({ options, value, onChange, variant = 'tabs' }: SegmentedProps<T>) {
  const cards = variant === 'cards';

  return (
    <View style={[styles.row, cards ? styles.rowCards : styles.rowTabs]}>
      {options.map((option) => {
        const selected = option.value === value;
        const fg = cards ? colors.forest : selected ? colors.white : colors.forest;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.item,
              cards ? styles.itemCard : styles.itemTab,
              selected && (cards ? styles.itemCardSelected : styles.itemTabSelected),
            ]}
          >
            {option.icon ? <Icon name={option.icon} size={cards ? 22 : 16} color={fg} /> : null}
            <Text variant={cards ? 'small' : 'bodyStrong'} color={fg} style={cards && { fontWeight: '600' }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  rowTabs: { padding: 4, backgroundColor: colors.surface, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border },
  rowCards: {},
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  itemTab: { minHeight: 40, borderRadius: radii.pill, paddingHorizontal: 12 },
  itemTabSelected: { backgroundColor: colors.forest },
  itemCard: {
    gap: 6,
    minHeight: 72,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemCardSelected: { backgroundColor: colors.mint, borderColor: colors.mint },
});
