import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PaxSays } from '@/components/companion/Pax';
import { FocusSessionCard } from '@/components/pact/FocusSessionCard';
import { PactResultCard } from '@/components/pact/PactResultCard';
import { useCountdown } from '@/components/pact/useCountdown';
import { Banner, Button, Card, ErrorBanner, Icon, LoadingBlock, ProgressBar, Screen, ScreenTitle, StatusBadge, StepTracker, Text } from '@/components/ui';
import { apiFetch } from '@/lib/api/client';
import { routes } from '@/lib/routes';
import { checkLevel, formatUsd } from '@/lib/shared/rules';
import { currentWeekday, formatClockTime, formatDeadline, formatScheduledDays, isTodayScheduled, WEEKDAYS } from '@/lib/shared/time';
import type { CheckoutLinkDto } from '@/lib/shared/types';
import { usePacts } from '@/lib/store/pacts';
import { colors, radii } from '@/lib/theme';
import { openCheckout } from '@/lib/whop';

const STEPS = ['Outline', 'Draft', 'Review'] as const;

// Flujo 02 · Active pact
export default function ActivePact() {
  const router = useRouter();
  const { id, autostart } = useLocalSearchParams<{ id: string; autostart?: string }>();
  const { getPact, setFocusRemaining, submitProof, loading, refetch } = usePacts();
  const pact = getPact(id);
  const [showFocus, setShowFocus] = useState(Boolean(autostart));
  const [checkingGps, setCheckingGps] = useState(false);
  const [gpsError, setGpsError] = useState<unknown>(null);

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
  const hasLocation = pact.methods.includes('location');
  const isLight = checkLevel(pact.stakeCents) === 'light';
  const needsCode = !isLight && !hasLocation;
  const todayIdx = currentWeekday();
  const dueToday = isTodayScheduled(pact.scheduledDays);

  // El checkout se cerró sin pagar: pedimos un enlace nuevo al servidor y lo abrimos.
  // Dentro de Whop se paga en su modal y al cerrarlo el webhook ya puede haber activado el pacto.
  const payStake = async () => {
    const link = await apiFetch<CheckoutLinkDto>(`/api/pacts/${pact.id}/checkout`, { method: 'POST' });
    if ((await openCheckout(link)) === 'paid') refetch();
  };

  // Para pactos Light (< $5 o reputación) con Location: check-in GPS de 1 toque sin foto.
  const quickGpsCheckIn = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      router.push(routes.proof(pact.id));
      return;
    }
    setCheckingGps(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await submitProof(pact.id, undefined, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          setCheckingGps(false);
          router.push(routes.result(pact.id));
        } catch (e) {
          setGpsError(e);
          setCheckingGps(false);
        }
      },
      () => {
        setGpsError(new Error('Could not read live GPS. Please allow location permissions or submit with a photo.'));
        setCheckingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <Screen>
      <ScreenTitle title={finished ? 'Pact closed.' : 'You’re in.'} subtitle={pact.title} onBack={() => router.back()} />

      {finished ? (
        <PactResultCard pact={pact} onPlanNext={() => router.replace(routes.newPact)} onViewDetails={() => router.push(routes.result(pact.id))} />
      ) : (
        <>
          {dueToday ? (
            <Banner
              title={`Today is your scheduled check-in day!`}
              subtitle={`Remember to check in${pact.locationName ? ` at ${pact.locationName}` : ''} before ${formatClockTime(pact.dueAt)}.`}
            />
          ) : null}

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
              {needsCode && pact.dayCode ? (
                <View style={styles.metaBox}>
                  <Text variant="caption" color="muted">Required handwritten code</Text>
                  <Text variant="heading" color="forest">{pact.dayCode}</Text>
                </View>
              ) : (
                <View style={styles.metaBox}>
                  <Text variant="caption" color="muted">Verification</Text>
                  <Text variant="bodyStrong" color="forest">
                    {hasLocation && isLight
                      ? '1-Tap GPS or Photo'
                      : hasLocation
                        ? 'Live GPS + Photo (no code)'
                        : 'Light check (no code)'}
                  </Text>
                </View>
              )}
            </View>
            {needsCode && pact.dayCode ? (
              <Text variant="caption" color="muted">
                Write <Text variant="bodyStrong" color="forest">{pact.dayCode}</Text> by hand on a note and include it in your live photo to prove it’s real.
              </Text>
            ) : null}

            {targetDays > 1 ? (
              <View style={styles.progressSection}>
                <View style={styles.summaryTop}>
                  <Text variant="small" color="muted">
                    {pact.scheduledDays?.length ? `Schedule: ${formatScheduledDays(pact.scheduledDays)}` : 'Weekly habit progress'}
                  </Text>
                  <Text variant="bodyStrong">{completedDays} / {targetDays} days</Text>
                </View>
                <ProgressBar step={completedDays} total={targetDays} />

                {pact.scheduledDays?.length ? (
                  <View style={styles.weekStrip}>
                    {WEEKDAYS.map((w) => {
                      const scheduled = pact.scheduledDays?.includes(w.id);
                      const isToday = w.id === todayIdx;
                      return (
                        <View
                          key={w.id}
                          style={[
                            styles.weekDayCell,
                            scheduled && styles.weekDayScheduled,
                            isToday && styles.weekDayToday,
                          ]}
                        >
                          <Text variant="caption" color={scheduled ? 'white' : 'muted'}>{w.short}</Text>
                          {isToday ? <View style={[styles.todayDot, scheduled && styles.todayDotOn]} /> : null}
                        </View>
                      );
                    })}
                  </View>
                ) : null}
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
              {gpsError ? <ErrorBanner error={gpsError} /> : null}
              {hasLocation && isLight ? (
                <Button
                  label={
                    checkingGps
                      ? 'Verifying GPS location…'
                      : targetDays > 1
                        ? `Quick GPS Check-in (${completedDays + 1}/${targetDays})`
                        : 'Quick GPS Check-in'
                  }
                  leadingIcon="location"
                  disabled={checkingGps}
                  onPress={quickGpsCheckIn}
                />
              ) : null}
              <Button
                label={
                  targetDays > 1
                    ? `Submit photo proof (${completedDays + 1}/${targetDays})`
                    : hasLocation && isLight
                      ? 'Or submit photo proof'
                      : 'Submit proof'
                }
                variant={hasLocation && isLight ? 'outline' : 'primary'}
                icon="arrowRight"
                onPress={() => router.push(routes.proof(pact.id))}
              />
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
  progressSection: { gap: 8 },
  weekStrip: { flexDirection: 'row', gap: 6, marginTop: 4 },
  weekDayCell: {
    flex: 1,
    minHeight: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.mintWash,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  weekDayScheduled: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  weekDayToday: {
    borderWidth: 2,
    borderColor: colors.amber,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.amber,
  },
  todayDotOn: {
    backgroundColor: colors.white,
  },
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
