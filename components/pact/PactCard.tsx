import { Fragment } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, StatusBadge, Text, type IconName } from '@/components/ui';
import { formatUsd } from '@/lib/shared/rules';
import { formatClockTime } from '@/lib/shared/time';
import type { Pact, ProofMethod } from '@/lib/shared/types';
import { colors, radii, shadows } from '@/lib/theme';

const methodMeta: Record<ProofMethod, { icon: IconName; label: string }> = {
  photo: { icon: 'camera', label: 'Photo' },
  location: { icon: 'location', label: 'Location' },
  witness: { icon: 'witness', label: 'Witness' },
};

interface PactCardProps {
  pact: Pact;
  onPress?: () => void;
}

export function PactCard({ pact, onPress }: PactCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] }]}
    >
      <View style={styles.top}>
        <Text variant="heading" style={styles.title} numberOfLines={2}>{pact.title}</Text>
        <StatusBadge status={pact.status} />
      </View>

      <View style={styles.meta}>
        <View style={styles.row}>
          <Icon name="timer" size={18} />
          <Text variant="body" color="muted">Due at {formatClockTime(pact.dueAt)}</Text>
        </View>
        <View style={styles.row}>
          <Text variant="heading" color={colors.amber}>{formatUsd(pact.stakeCents)}</Text>
          <Text variant="body" color="muted">at stake</Text>
          <Icon name="chevronRight" size={18} color={colors.muted} />
        </View>
      </View>

      <View style={styles.methods}>
        {pact.methods.map((method, index) => (
          <Fragment key={method}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <View style={styles.method}>
              <Icon name={methodMeta[method].icon} size={18} />
              <Text variant="small" color="muted">{methodMeta[method].label}</Text>
            </View>
          </Fragment>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    gap: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadows.card,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  title: { flex: 1 },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.subtle,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  methods: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  method: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  divider: { width: 1, height: 18, backgroundColor: colors.border },
});
