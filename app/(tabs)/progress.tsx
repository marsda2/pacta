import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/nav/AppHeader';
import { Card, ErrorBanner, Screen, SectionLabel, StatusBadge, Text } from '@/components/ui';
import { formatUsd, TRUST_MAX, VAULT_APY_SIMULATED, VAULT_UNLOCK_MIN_TRUST } from '@/lib/shared/rules';
import { usePacts } from '@/lib/store/pacts';
import { colors, radii } from '@/lib/theme';

export default function Progress() {
  const { pacts, summary, error, refetch } = usePacts();
  const score = summary.trustScore;
  const vault = summary.vaultCents;
  const kept = pacts.filter((p) => p.status === 'verified').length;
  const missed = pacts.filter((p) => p.status === 'missed').length;
  const finished = pacts.filter((p) => p.status === 'verified' || p.status === 'missed');

  return (
    <Screen withTabBar>
      <AppHeader title="Progress" />
      {error ? <ErrorBanner error={error} onRetry={refetch} /> : null}

      <Card style={styles.block}>
        <SectionLabel>Trust Score</SectionLabel>
        <Text variant="display">{score}<Text variant="body" color="muted"> / {TRUST_MAX}</Text></Text>
        <View style={styles.track}>
          <LinearGradient colors={[colors.mint, '#5FD0A5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.fill, { width: `${score}%` }]} />
          <View style={[styles.threshold, { left: `${VAULT_UNLOCK_MIN_TRUST}%` }]} />
        </View>
        <Text variant="small" color="muted">Reach {VAULT_UNLOCK_MIN_TRUST} to start unlocking your Vault.</Text>
      </Card>

      <Card style={styles.block}>
        <SectionLabel>Frozen Redemption Vault</SectionLabel>
        <Text variant="display">{formatUsd(vault)}</Text>
        <Text variant="small" color="muted">
          You haven’t lost it. It grows at {(VAULT_APY_SIMULATED * 100).toFixed(2)}% APY (simulated) until you earn it back.
        </Text>
      </Card>

      <View style={styles.stats}>
        <Card padding={16} style={styles.stat}>
          <Text variant="caption" color="muted">Kept</Text>
          <Text variant="title">{kept}</Text>
        </Card>
        <Card padding={16} style={styles.stat}>
          <Text variant="caption" color="muted">Missed</Text>
          <Text variant="title">{missed}</Text>
        </Card>
      </View>

      <View style={styles.block}>
        <SectionLabel>History</SectionLabel>
        {finished.map((pact) => (
          <Card key={pact.id} padding={14} style={styles.historyRow}>
            <Text variant="bodyStrong" style={styles.flex}>{pact.title}</Text>
            <StatusBadge status={pact.status} />
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  block: { gap: 8 },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.disabledBg, overflow: 'hidden', marginTop: 4 },
  fill: { height: '100%', borderRadius: 5 },
  threshold: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: colors.forest },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, gap: 2, borderRadius: radii.lg },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
