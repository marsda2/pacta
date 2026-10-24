import { Pressable, StyleSheet, View } from 'react-native';

import { formatUsd, STAKE_MAX_CENTS, STAKE_MIN_CENTS, STAKE_STEP_CENTS } from '@/lib/shared/rules';
import { colors, radii } from '@/lib/theme';

import { Icon } from './Icon';
import { Text } from './Text';

interface StakeStepperProps {
  cents: number;
  onChange: (cents: number) => void;
}

export function StakeStepper({ cents, onChange }: StakeStepperProps) {
  const dec = () => onChange(Math.max(STAKE_MIN_CENTS, cents - STAKE_STEP_CENTS));
  const inc = () => onChange(Math.min(STAKE_MAX_CENTS, cents + STAKE_STEP_CENTS));

  return (
    <View style={styles.stepper}>
      <Pressable accessibilityLabel="Decrease stake" onPress={dec} style={styles.stepBtn}>
        <Icon name="minus" size={18} />
      </Pressable>
      <Text variant="heading">{formatUsd(cents)}</Text>
      <Pressable accessibilityLabel="Increase stake" onPress={inc} style={styles.stepBtn}>
        <Icon name="plus" size={18} />
      </Pressable>
    </View>
  );
}

interface StakeChipsProps {
  presets: readonly number[];
  cents: number;
  onChange: (cents: number) => void;
}

export function StakeChips({ presets, cents, onChange }: StakeChipsProps) {
  return (
    <View style={styles.chips}>
      {presets.map((preset) => {
        const selected = preset === cents;
        return (
          <Pressable
            key={preset}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(preset)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text variant="bodyStrong" color={selected ? 'white' : 'text'}>{formatUsd(preset)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 6,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.subtle,
  },
  chips: { flexDirection: 'row', gap: 10 },
  chip: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.forest, borderColor: colors.forest },
});
