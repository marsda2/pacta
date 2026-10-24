import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PaxSays } from '@/components/companion/Pax';
import { PactResultCard } from '@/components/pact/PactResultCard';
import { Button, Card, ErrorBanner, LoadingBlock, Screen, ScreenTitle, SectionLabel, Text } from '@/components/ui';
import { routes } from '@/lib/routes';
import { usePacts } from '@/lib/store/pacts';

// Flujo 06 · Pact result (y estado intermedio "reviewing" mientras no hay veredicto)
export default function PactResult() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPact, resolvePact, loading } = usePacts();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const pact = getPact(id);

  const decide = async (kept: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await resolvePact(id, kept, 'demo');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  if (!pact && loading) {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  }

  if (!pact) {
    return (
      <Screen>
        <ScreenTitle title="Pact not found" onBack={() => router.replace(routes.home)} />
      </Screen>
    );
  }

  const reviewing = pact.status === 'pending' || pact.status === 'progress' || pact.status === 'scheduled';

  return (
    <Screen>
      <ScreenTitle title={reviewing ? 'Reviewing your proof.' : pact.title} subtitle={reviewing ? pact.title : undefined} onBack={() => router.replace(routes.home)} />

      {reviewing ? (
        <>
          <PaxSays message="Hang tight. A witness or the Terac jury will take a look." expression="talking" />
          <Card style={styles.demo}>
            <SectionLabel>Prototype controls</SectionLabel>
            <Text variant="small" color="muted">
              Verdicts will come from the AI auditor and the Terac jury (roadmap phase 5). For now, pick an outcome.
            </Text>
            <Button label="Ask a witness" icon="arrowRight" variant="mint" onPress={() => router.push(routes.witness(pact.id))} />
            {error ? <ErrorBanner error={error} /> : null}
            <Button label="Simulate: pact kept" variant="outline" disabled={busy} onPress={() => decide(true)} />
            <Button label="Simulate: deadline missed" variant="outline" disabled={busy} onPress={() => decide(false)} />
          </Card>
        </>
      ) : (
        <View style={styles.result}>
          <PactResultCard
            pact={pact}
            onPlanNext={() => router.replace(routes.newPact)}
            onViewDetails={() => router.push(routes.pact(pact.id))}
          />
          <Button label="Back to my pacts" variant="link" onPress={() => router.replace(routes.pacts)} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  demo: { gap: 12 },
  result: { gap: 16 },
});
