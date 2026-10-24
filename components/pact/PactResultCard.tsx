import { StyleSheet, View } from 'react-native';

import { Pax } from '@/components/companion/Pax';
import { Button, GlassCard, Icon, Text } from '@/components/ui';
import { formatUsd } from '@/lib/shared/rules';
import { formatClockTime } from '@/lib/shared/time';
import type { Pact } from '@/lib/shared/types';
import { colors, radii } from '@/lib/theme';

interface PactResultCardProps {
  pact: Pact;
  onPlanNext?: () => void;
  onViewDetails?: () => void;
}

// Resultado del pacto: cumplido (Pax contento) o fallado (el stake pasa al Vault, no se pierde).
export function PactResultCard({ pact, onPlanNext, onViewDetails }: PactResultCardProps) {
  if (pact.status === 'missed') {
    return (
      <View style={styles.missed}>
        <View style={styles.missedIcon}>
          <Icon name="close" size={30} color={colors.white} strokeWidth={2.6} />
        </View>
        <View style={styles.flex}>
          <Text variant="title">Deadline missed</Text>
          <Text variant="heading" color={colors.danger}>{formatUsd(pact.stakeCents)} moved to your Vault</Text>
          <Text variant="small" color="muted">
            It isn’t lost. Rebuild your Trust Score to unlock it, or request a review.
          </Text>
          {onViewDetails ? <Button label="View details" variant="outline" fullWidth={false} onPress={onViewDetails} style={styles.details} /> : null}
        </View>
      </View>
    );
  }

  return (
    <GlassCard padding={24} style={styles.kept}>
      <Pax expression="happy" size={120} />
      <View style={styles.flex}>
        <Text variant="title">Pact kept.</Text>
        <Text variant="body" color="muted">Proof verified. Your {formatUsd(pact.stakeCents)} stays yours.</Text>
        <View style={styles.completed}>
          <Icon name="calendar" size={16} color={colors.muted} />
          <Text variant="small" color="muted">Completed at {formatClockTime(pact.completedAt ?? Date.now())}</Text>
        </View>
        {onPlanNext ? <Button label="Plan your next pact" icon="arrowRight" onPress={onPlanNext} style={styles.next} /> : null}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 6 },
  kept: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  completed: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  next: { marginTop: 10 },
  details: { marginTop: 10, alignSelf: 'flex-start' },
  missed: {
    flexDirection: 'row',
    gap: 16,
    padding: 22,
    borderRadius: radii.lg,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: '#F6CACA',
  },
  missedIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
  },
});
