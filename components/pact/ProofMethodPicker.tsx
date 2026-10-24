import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text, type IconName } from '@/components/ui';
import type { ProofMethod } from '@/lib/shared/types';
import { colors, radii } from '@/lib/theme';

const options: { value: ProofMethod; label: string; icon: IconName; locked?: boolean }[] = [
  { value: 'photo', label: 'Live photo', icon: 'camera', locked: true },
  { value: 'location', label: 'Location', icon: 'location' },
  { value: 'witness', label: 'Witness', icon: 'witness' },
];

interface ProofMethodPickerProps {
  value: ProofMethod[];
  onChange: (value: ProofMethod[]) => void;
}

// La foto en vivo es obligatoria; ubicación y testigo son refuerzos opcionales.
export function ProofMethodPicker({ value, onChange }: ProofMethodPickerProps) {
  const toggle = (method: ProofMethod) => {
    onChange(value.includes(method) ? value.filter((m) => m !== method) : [...value, method]);
  };

  return (
    <View style={styles.row}>
      {options.map((option) => {
        const selected = value.includes(option.value);
        return (
          <Pressable
            key={option.value}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected, disabled: option.locked }}
            disabled={option.locked}
            onPress={() => toggle(option.value)}
            style={[styles.item, selected && styles.itemOn]}
          >
            <Icon name={option.icon} size={22} />
            <Text variant="small" style={{ fontWeight: '600' }}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  item: {
    flex: 1,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemOn: { backgroundColor: colors.mint, borderColor: colors.mint },
});
