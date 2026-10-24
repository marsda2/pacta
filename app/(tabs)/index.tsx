import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Pax } from '@/components/companion/Pax';
import { CopilotCard } from '@/components/copilot/CopilotCard';
import { AppHeader } from '@/components/nav/AppHeader';
import { PactCard } from '@/components/pact/PactCard';
import { Button, Card, ErrorBanner, GlassCard, LoadingBlock, Screen, SectionLabel, Text } from '@/components/ui';
import { VaultCard } from '@/components/vault/VaultCard';
import { routes } from '@/lib/routes';
import { formatUsd } from '@/lib/shared/rules';
import { usePacts } from '@/lib/store/pacts';
import { useVault } from '@/lib/store/vault';
import { useWallet } from '@/lib/store/wallet';
import { colors } from '@/lib/theme';

export default function Home() {
  const router = useRouter();
  const { pacts, summary, loading, error, refetch } = usePacts();
  const { vault } = useVault();
  const { wallet } = useWallet();
  const active = pacts.find((pact) => pact.status === 'progress' || pact.status === 'pending');

  return (
    <Screen withTabBar>
      <AppHeader title="Home" />

      <GlassCard style={styles.hero} padding={20}>
        <Pax expression="idle" waving size={104} />
        <View style={styles.heroText}>
          <Text variant="title">Calm control.</Text>
          <Text variant="body" color="muted">One task. One deadline. Pax keeps you company.</Text>
          <Button label="Create a pact" icon="arrowRight" onPress={() => router.push(routes.newPact)} style={styles.heroCta} />
        </View>
      </GlassCard>

      {error ? <ErrorBanner error={error} onRetry={refetch} /> : null}
      {loading ? <LoadingBlock /> : null}

      {active ? (
        <View style={styles.section}>
          <SectionLabel>Up next</SectionLabel>
          <PactCard pact={active} onPress={() => router.push(routes.pact(active.id))} />
          <View style={styles.stats}>
            <Button label="Submit proof" icon="arrowRight" onPress={() => router.push(routes.proof(active.id))} style={styles.statPress} />
            <Button label="Pomodoro / Focus" variant="outline" leadingIcon="timer" onPress={() => router.push(routes.pact(active.id, '?autostart=1'))} style={styles.statPress} />
          </View>
        </View>
      ) : null}

      <View style={styles.stats}>
        <Card style={styles.stat} padding={16}>
          <Text variant="caption" color="muted">Trust Score</Text>
          <Text variant="title">{summary.trustScore}<Text variant="small" color="muted"> / 100</Text></Text>
        </Card>
        <Pressable accessibilityRole="button" accessibilityLabel="Open your balance" onPress={() => router.push(routes.wallet)} style={styles.statPress}>
          <Card style={styles.stat} padding={16}>
            <Text variant="caption" color="muted">Balance</Text>
            <Text variant="title">{formatUsd(wallet?.balanceCents ?? 0)}</Text>
            <Text variant="caption" color="muted">Add funds · stake from $1</Text>
          </Card>
        </Pressable>
      </View>

      <VaultCard vault={vault} fallbackCents={summary.vaultCents} onPress={() => router.push(routes.vault)} />

      <CopilotCard onStartFocus={() => router.push(routes.copilot)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroText: { flex: 1, gap: 4 },
  heroCta: { marginTop: 10, minHeight: 46 },
  section: { gap: 10 },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, gap: 2, borderColor: colors.border },
  statPress: { flex: 1 },
});
