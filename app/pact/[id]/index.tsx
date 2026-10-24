import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { PaxSays } from '@/components/companion/Pax';
import { FocusSessionCard } from '@/components/pact/FocusSessionCard';
import { PactResultCard } from '@/components/pact/PactResultCard';
import { useCountdown } from '@/components/pact/useCountdown';
import { Banner, Button, Icon, LoadingBlock, Screen, ScreenTitle, StepTracker, Text } from '@/components/ui';
import { apiFetch } from '@/lib/api/client';
import { routes } from '@/lib/routes';
import { formatDeadline } from '@/lib/shared/time';
import { usePacts } from '@/lib/store/pacts';

const STEPS = ['Outline', 'Draft', 'Review'] as const;

// Flujo 02 · Active pact
export default function ActivePact() {
  const router = useRouter();
  const { id, autostart } = useLocalSearchParams<{ id: string; autostart?: string }>();
  const { getPact, setFocusRemaining, loading } = usePacts();
  const pact = getPact(id);

  const timer = useCountdown(pact?.focusRemainingSec ?? 0, (remaining) => {
    if (pact && remaining % 5 === 0) setFocusRemaining(pact.id, remaining);
  });

  // El pacto puede llegar después del primer render (enlace directo): siembra la cuenta atrás una vez.
  const seeded = useRef(false);
  useEffect(() => {
    if (pact && !seeded.current) {
      seeded.current = true;
      timer.reset(pact.focusRemainingSec);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pact]);

  useEffect(() => {
    if (autostart) timer.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autostart]);

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
        <PaxSays message="I can’t find that pact. Let’s go back home." expression="worried" />
      </Screen>
    );
  }

  const finished = pact.status === 'verified' || pact.status === 'missed';

  // El checkout se cerró sin pagar: pedimos un enlace nuevo al servidor y lo abrimos.
  const payStake = async () => {
    const { url } = await apiFetch<{ url: string }>(`/api/pacts/${pact.id}/checkout`, { method: 'POST' });
    await Linking.openURL(url);
  };

  return (
    <Screen>
      <ScreenTitle title={finished ? 'Pact closed.' : 'You’re in.'} subtitle={pact.title} onBack={() => router.back()} />

      {finished ? (
        <PactResultCard pact={pact} onPlanNext={() => router.replace(routes.newPact)} onViewDetails={() => router.push(routes.result(pact.id))} />
      ) : (
        <>
          <FocusSessionCard
            badge={pact.status === 'pending' ? 'Proof pending' : 'In progress'}
            remainingSec={timer.remaining}
            stakeCents={pact.stakeCents}
            dueLabel={formatDeadline(pact.dueAt)}
            running={timer.running}
            onToggle={timer.toggle}
            maxMinutes={60}
          />

          <StepTracker steps={STEPS} current={pact.stepIndex} />

          {pact.rawStatus === 'AWAITING_PAYMENT' ? (
            <Button label="Pay stake" icon="arrowRight" onPress={payStake} />
          ) : null}

          {pact.status === 'pending' ? (
            <Banner title="Proof uploaded" subtitle="We’re reviewing it now." />
          ) : (
            <View style={styles.actions}>
              <Button label="Submit proof" icon="arrowRight" onPress={() => router.push(routes.proof(pact.id))} />
              <Button label="I’m stuck" variant="outline" leadingIcon="copilot" onPress={() => router.push(routes.copilot)} />
            </View>
          )}

          {pact.status === 'pending' ? (
            <View style={styles.actions}>
              <Button label="See review" icon="arrowRight" onPress={() => router.push(routes.result(pact.id))} />
            </View>
          ) : null}

          <View style={styles.foot}>
            <Icon name="lock" size={14} />
            <Text variant="caption" color="muted">If you miss the deadline, your stake moves to your Vault. It isn’t lost.</Text>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 12 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingHorizontal: 8 },
});
