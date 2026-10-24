import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PaxSays } from '@/components/companion/Pax';
import { FocusSessionCard } from '@/components/pact/FocusSessionCard';
import { PactResultCard } from '@/components/pact/PactResultCard';
import { useCountdown } from '@/components/pact/useCountdown';
import { Banner, Button, Card, Icon, LoadingBlock, ProgressBar, Screen, ScreenTitle, StatusBadge, StepTracker, Text } from '@/components/ui';
import { apiFetch } from '@/lib/api/client';
import { routes } from '@/lib/routes';
import { checkLevel, formatUsd } from '@/lib/shared/rules';
import { formatDeadline } from '@/lib/shared/time';
import type { CheckoutLinkDto } from '@/lib/shared/types';
import { usePacts } from '@/lib/store/pacts';
import { colors, radii } from '@/lib/theme';
import { openCheckout } from '@/lib/whop';

const STEPS = ['Outline', 'Draft', 'Review'] as const;

// Flujo 02 · Active pact
export default function ActivePact() {
  const router = useRouter();
  const { id, autostart } = useLocalSearchParams<{ id: string; autostart?: string }>();
  const { getPact, setFocusRemaining, loading, refetch } = usePacts();
  const pact = getPact(id);
  const [showFocus, setShowFocus] = useState(Boolean(autostart));

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
  const targetDays = pact.targetDays ?? 1;
  const completedDays = pact.completedDays ?? 0;
  const isLight = checkLevel(pact.stakeCents) === 'light';

  // El checkout se cerró sin pagar: pedimos un enlace nuevo al servidor y lo abrimos.
  // Dentro de Whop se paga en su modal y al cerrarlo el webhook ya puede haber activado el pacto.
  const payStake = async () => {
    const link = await apiFetch<CheckoutLinkDto>(`/api/pacts/${pact.id}/checkout`, { method: 'POST' });
    if ((await openCheckout(link)) === 'paid') refetch();
  };

  return (
    <Screen>
      <ScreenTitle title={finished ? 'Pact closed.' : 'You’re in.'} subtitle={pact.title} onBack={() => router.back()} />

      {finished ? (
        <PactResultCard pact={pact} onPlanNext={() => router.replace(routes.newPact)} onViewDetails={() => router.push(routes.result(pact.id))} />
      ) : (
        <>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <View style={styles.summaryCol}>
                <Text variant="caption" color="muted">Deadline</Text>
                <Text variant="bodyStrong">{formatDeadline(pact.dueAt)}</Text>
              </View>
              <StatusBadge status={pact.status} />
            </View>

            <View style={styles.metaGrid}>
              <View style={styles.metaBox}>
                <Text variant="caption" color="muted">At stake</Text>
                <Text variant="heading" color={colors.amber}>{formatUsd(pact.stakeCents)}</Text>
              </View>
              {pact.dayCode ? (
                <View style={styles.metaBox}>
                  <Text variant="caption" color="muted">{isLight ? 'Daily code (optional)' : 'Handwritten code'}</Text>
                  <Text variant="heading" color="forest">{pact.dayCode}</Text>
                </View>
              ) : null}
            </View>

            {targetDays > 1 ? (
              <View style={styles.progressSection}>
                <View style={styles.summaryTop}>
                  <Text variant="small" color="muted">Weekly habit progress</Text>
                  <Text variant="bodyStrong">{completedDays} / {targetDays} days</Text>
                </View>
                <ProgressBar step={completedDays} total={targetDays} />
              </View>
            ) : null}

            {pact.locationName ? (
              <View style={styles.locationRow}>
                <Icon name="location" size={16} color={colors.forest} />
                <Text variant="small" color="forest">Location check-in: {pact.locationName}</Text>
              </View>
            ) : null}
          </Card>

          {showFocus ? (
            <FocusSessionCard
              badge={pact.status === 'pending' ? 'Proof pending' : 'Focus timer'}
              remainingSec={timer.remaining}
              stakeCents={pact.stakeCents}
              dueLabel={formatDeadline(pact.dueAt)}
              running={timer.running}
              onToggle={timer.toggle}
              maxMinutes={60}
            />
          ) : null}

          <StepTracker steps={STEPS} current={pact.stepIndex} />

          {pact.rawStatus === 'AWAITING_PAYMENT' ? (
            <Button label="Pay stake" icon="arrowRight" onPress={payStake} />
          ) : null}

          {pact.status === 'pending' ? (
            <Banner title="Proof uploaded" subtitle="We’re reviewing it now." />
          ) : (
            <View style={styles.actions}>
              <Button label={targetDays > 1 ? `Submit today's proof (${completedDays + 1}/${targetDays})` : 'Submit proof'} icon="arrowRight" onPress={() => router.push(routes.proof(pact.id))} />
              <Button
                label={showFocus ? 'Hide Pomodoro timer' : 'Start Pomodoro / Focus timer'}
                variant="outline"
                leadingIcon="timer"
                onPress={() => setShowFocus((v) => !v)}
              />
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
  summaryCard: { gap: 14 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  summaryCol: { gap: 2, flex: 1 },
  metaGrid: { flexDirection: 'row', gap: 10 },
  metaBox: {
    flex: 1,
    gap: 2,
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: colors.mintWash,
    borderWidth: 1,
    borderColor: colors.mint,
  },
  progressSection: { gap: 6 },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: colors.mintSoft,
  },
  actions: { gap: 12 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingHorizontal: 8 },
});
