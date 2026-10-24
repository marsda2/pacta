import { StyleSheet, View } from 'react-native';

import type { PactUiStatus } from '@/lib/shared/types';
import { colors, radii } from '@/lib/theme';

import { Text } from './Text';

const config: Record<PactUiStatus, { label: string; dot: string; bg: string; fg: string }> = {
  scheduled: { label: 'Scheduled', dot: colors.status.scheduled, bg: colors.subtle, fg: colors.muted },
  progress: { label: 'In progress', dot: colors.status.progress, bg: colors.amberSoft, fg: colors.amberInk },
  pending: { label: 'Proof pending', dot: colors.status.pending, bg: colors.amberSoft, fg: colors.amberInk },
  verified: { label: 'Verified', dot: colors.status.verified, bg: colors.mintSoft, fg: colors.forest },
  missed: { label: 'Missed', dot: colors.status.missed, bg: colors.dangerSoft, fg: '#B23A3A' },
};

export function StatusBadge({ status }: { status: PactUiStatus }) {
  const c = config[status];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <View style={[styles.dot, { backgroundColor: c.dot }]} />
      <Text variant="caption" color={c.fg} style={{ fontWeight: '700' }}>{c.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
