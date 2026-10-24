import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Pax } from '@/components/companion/Pax';
import { CopilotCard } from '@/components/copilot/CopilotCard';
import { AppHeader } from '@/components/nav/AppHeader';
import { FocusSessionCard } from '@/components/pact/FocusSessionCard';
import { Button, Card, GlassCard, Screen, SectionLabel, Text } from '@/components/ui';
import { routes } from '@/lib/routes';
import { formatUsd, TRUST_START_SCORE, VAULT_APY_SIMULATED } from '@/lib/shared/rules';
import { formatDeadline } from '@/lib/shared/time';
import { usePacts } from '@/lib/store/pacts';
import { trustScore, vaultCents } from '@/lib/store/selectors';
import { colors } from '@/lib/theme';

export default function Home() {
  const router = useRouter();
  const { pacts } = usePacts();
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

      {active ? (
        <View style={styles.section}>
          <SectionLabel>Up next</SectionLabel>
          <Text variant="heading">{active.title}</Text>
          <FocusSessionCard
            remainingSec={active.focusRemainingSec}
            stakeCents={active.stakeCents}
            dueLabel={formatDeadline(active.dueAt)}
            maxMinutes={60}
          />
          <Button label="Open pact" variant="outline" onPress={() => router.push(routes.pact(active.id))} />
        </View>
      ) : null}

      <View style={styles.stats}>
        <Card style={styles.stat} padding={16}>
          <Text variant="caption" color="muted">Trust Score</Text>
          <Text variant="title">{trustScore(pacts, TRUST_START_SCORE)}<Text variant="small" color="muted"> / 100</Text></Text>
        </Card>
        <Card style={styles.stat} padding={16}>
          <Text variant="caption" color="muted">Frozen Vault</Text>
          <Text variant="title">{formatUsd(vaultCents(pacts))}</Text>
          <Text variant="caption" color="muted">{(VAULT_APY_SIMULATED * 100).toFixed(2)}% APY simulated</Text>
        </Card>
      </View>

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
});
