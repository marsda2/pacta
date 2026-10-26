import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ProofMethodPicker } from '@/components/pact/ProofMethodPicker';
import {
  Button,
  Card,
  Checkbox,
  ErrorBanner,
  Icon,
  Screen,
  ScreenTitle,
  SectionLabel,
  Segmented,
  StakeChips,
  Text,
  TextField,
  type SegmentOption,
} from '@/components/ui';
import { routes } from '@/lib/routes';
import { checkLevel, CREDIT_STAKE_MIN_CENTS, CREDIT_STAKE_PRESETS_CENTS, formatUsd, STAKE_PRESETS_CENTS, type CheckLevel } from '@/lib/shared/rules';
import {
  buildDayOptions,
  buildTimeSlotOptions,
  combineDayAndTime,
  defaultTimeSlot,
  filterAvailableTimeSlots,
  formatDeadline,
  formatScheduledDays,
  parseCustomTime,
  WEEKDAYS,
  type TimeSlotOption,
} from '@/lib/shared/time';
import type { ProofMethod } from '@/lib/shared/types';
import { usePacts } from '@/lib/store/pacts';
import { useWallet } from '@/lib/store/wallet';
import { colors, radii } from '@/lib/theme';
import { openCheckout } from '@/lib/whop';

type PayWith = 'credit' | 'card' | 'none';
type FrequencyMode = 'once' | 'weekly';
type TimePeriod = 'morning' | 'afternoon' | 'evening';

const payOptions: SegmentOption<PayWith>[] = [
  { value: 'credit', label: 'Balance' },
  { value: 'card', label: 'Card' },
  { value: 'none', label: 'No money' },
];

const freqOptions: SegmentOption<FrequencyMode>[] = [
  { value: 'once', label: 'One-time' },
  { value: 'weekly', label: 'Weekly habit' },
];

const periodLabels: { key: TimePeriod; label: string }[] = [
  { key: 'morning', label: 'Morning' },
  { key: 'afternoon', label: 'Afternoon' },
  { key: 'evening', label: 'Evening' },
];

const SCHEDULE_PRESETS: { label: string; days: number[] }[] = [
  { label: 'Tue · Wed · Thu', days: [2, 3, 4] },
  { label: 'Mon · Wed · Fri', days: [1, 3, 5] },
  { label: 'Weekdays (M–F)', days: [1, 2, 3, 4, 5] },
];

// Cuánto se verifica según lo que hay en juego (rules.ts, checkLevel).
const checkCopy: Record<CheckLevel, string> = {
  light: 'Light check (< $5 or free): a live photo or 1-tap GPS check-in (when Location is on) is enough — no handwritten code required.',
  standard: 'Strict AI check ($5+): requires the 4-letter handwritten code in your photo (or live GPS + live photo when Location is on).',
  human: 'Big stake ($20+): requires the 4-letter handwritten code (or live GPS + live photo); if the AI doubts, a human Terac juror decides.',
};

// Flujo 01 · Create a pact
export default function NewPact() {
  const router = useRouter();
  const { createPact } = usePacts();
  const { wallet } = useWallet();
  const dayOptions = useMemo(() => buildDayOptions(), []);
  const timeSlots = useMemo(() => buildTimeSlotOptions(), []);
  const todayHasSlots = useMemo(() => filterAvailableTimeSlots(timeSlots, 0).length > 0, [timeSlots]);
  const initialDay = todayHasSlots ? dayOptions[0] : (dayOptions[1] ?? dayOptions[0]);
  const initialSlot = useMemo(() => defaultTimeSlot(timeSlots, initialDay.offset), [timeSlots, initialDay.offset]);

  const [task, setTask] = useState('');
  const [freq, setFreq] = useState<FrequencyMode>('once');
  const [scheduledDays, setScheduledDays] = useState<number[]>([2, 3, 4]);
  const [dayChoice, setDayChoice] = useState(initialDay);
  const [timeChoice, setTimeChoice] = useState<TimeSlotOption>(initialSlot);
  const [activePeriod, setActivePeriod] = useState<TimePeriod>(initialSlot.period);
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState('');
  const [payChoice, setPayWith] = useState<PayWith | null>(null);
  const [stakeChoice, setStake] = useState<number | null>(null);
  const [methods, setMethods] = useState<ProofMethod[]>(['photo']);
  const [locationName, setLocationName] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const effectiveDayOffset = freq === 'weekly' ? 7 : dayChoice.offset;
  const availableSlots = useMemo(
    () => filterAvailableTimeSlots(timeSlots, freq === 'once' ? dayChoice.offset : 1),
    [timeSlots, freq, dayChoice.offset],
  );

  // Si al cambiar a "Today" la hora elegida ya pasó, salta automáticamente a la primera hora disponible.
  const activeSlot = useMemo(() => {
    if (useCustomTime) {
      const parsed = parseCustomTime(customTimeInput);
      if (parsed) return parsed;
    }
    const stillValid = availableSlots.some((s) => s.hour === timeChoice.hour && s.minute === timeChoice.minute);
    return stillValid ? timeChoice : (availableSlots[0] ?? timeChoice);
  }, [useCustomTime, customTimeInput, availableSlots, timeChoice]);

  const periodSlots = useMemo(() => {
    const inPeriod = availableSlots.filter((s) => s.period === activePeriod);
    return inPeriod.length > 0 ? inPeriod : availableSlots;
  }, [availableSlots, activePeriod]);

  const selectDay = (opt: (typeof dayOptions)[number]) => {
    setDayChoice(opt);
    const nextSlots = filterAvailableTimeSlots(timeSlots, opt.offset);
    if (!nextSlots.some((s) => s.hour === timeChoice.hour && s.minute === timeChoice.minute)) {
      const next = defaultTimeSlot(timeSlots, opt.offset);
      setTimeChoice(next);
      setActivePeriod(next.period);
    }
  };

  const toggleWeekday = (weekday: number) => {
    setScheduledDays((prev) => {
      if (prev.includes(weekday)) {
        return prev.length > 1 ? prev.filter((d) => d !== weekday) : prev;
      }
      return [...prev, weekday];
    });
  };

  const dueAt = combineDayAndTime(effectiveDayOffset, activeSlot.hour, activeSlot.minute);
  const targetDays = freq === 'weekly' ? scheduledDays.length : 1;

  // Con saldo suficiente se paga con él por defecto; si no, con tarjeta.
  const balance = wallet?.balanceCents ?? 0;
  const payWith: PayWith = payChoice ?? (balance >= CREDIT_STAKE_MIN_CENTS ? 'credit' : 'card');
  const presets: readonly number[] = payWith === 'credit' ? CREDIT_STAKE_PRESETS_CENTS : STAKE_PRESETS_CENTS;
  const stake = stakeChoice !== null && presets.includes(stakeChoice) ? stakeChoice : presets[1];
  const short = payWith === 'credit' && stake > balance;
  const money = payWith !== 'none';

  const canConfirm = task.trim().length > 0 && (!money || agreed) && !short && !saving;

  const confirm = async () => {
    setSaving(true);
    setError(null);
    try {
      const pact = await createPact({
        title: task.trim(),
        stakeCents: stake,
        dueAt,
        methods,
        targetDays,
        scheduledDays: freq === 'weekly' ? scheduledDays : undefined,
        locationName: methods.includes('location') && locationName.trim() ? locationName.trim() : undefined,
        reputationOnly: !money,
        payWith: payWith === 'credit' ? 'credit' : 'card',
      });
      // Con tarjeta el stake se paga en Whop (dentro de Whop, en su modal); el webhook deja el pacto ACTIVE.
      if (pact.checkout) await openCheckout(pact.checkout);
      router.replace(routes.pact(pact.id));
    } catch (e) {
      setError(e);
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScreenTitle title="Make it concrete." subtitle="Choose your task, schedule, and proof." onBack={() => router.back()} />

      <Card style={styles.form}>
        <TextField label="Task" value={task} onChangeText={setTask} placeholder="Go to the gym / Finish proposal" />

        <View style={styles.group}>
          <SectionLabel>Schedule & frequency</SectionLabel>
          <Segmented options={freqOptions} value={freq} onChange={setFreq} />

          {freq === 'weekly' ? (
            <View style={styles.scheduleBox}>
              <View style={styles.scheduleHeader}>
                <Text variant="small" color="muted">Which days will you check in?</Text>
                <Text variant="caption" color="forest">{scheduledDays.length} days / week</Text>
              </View>

              <View style={styles.weekdayRow}>
                {WEEKDAYS.map((w) => {
                  const selected = scheduledDays.includes(w.id);
                  return (
                    <Pressable
                      key={w.id}
                      accessibilityRole="button"
                      onPress={() => toggleWeekday(w.id)}
                      style={[styles.weekdayBtn, selected && styles.weekdayBtnOn]}
                    >
                      <Text variant="caption" color={selected ? 'white' : 'muted'}>{w.short}</Text>
                      <Text variant="bodyStrong" color={selected ? 'white' : 'text'}>{w.name}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.presetRow}>
                {SCHEDULE_PRESETS.map((preset) => {
                  const active =
                    preset.days.length === scheduledDays.length &&
                    preset.days.every((d) => scheduledDays.includes(d));
                  return (
                    <Pressable
                      key={preset.label}
                      accessibilityRole="button"
                      onPress={() => setScheduledDays(preset.days)}
                      style={[styles.presetPill, active && styles.presetPillOn]}
                    >
                      <Text variant="caption" color={active ? 'forest' : 'muted'}>{preset.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text variant="caption" color="muted">
                Scheduled: <Text variant="bodyStrong" color="forest">{formatScheduledDays(scheduledDays)}</Text> before {activeSlot.label} (weekly cutoff {formatDeadline(dueAt)}).
              </Text>
            </View>
          ) : (
            <View style={styles.scheduleBox}>
              <Text variant="small" color="muted">Day</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
                {dayOptions.map((opt) => {
                  const disabled = opt.offset === 0 && !todayHasSlots;
                  const selected = dayChoice.offset === opt.offset;
                  return (
                    <Pressable
                      key={opt.offset}
                      accessibilityRole="button"
                      disabled={disabled}
                      onPress={() => selectDay(opt)}
                      style={[
                        styles.dateCard,
                        selected && styles.dateCardOn,
                        disabled && styles.dateCardDisabled,
                      ]}
                    >
                      <Text variant="caption" color={selected ? 'white' : 'muted'}>{opt.shortWeekday}</Text>
                      <Text variant="bodyStrong" color={selected ? 'white' : 'text'}>{opt.monthDay}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <View style={styles.scheduleBox}>
            <View style={styles.scheduleHeader}>
              <View style={styles.timeTitleRow}>
                <Icon name="timer" size={16} color={colors.forest} />
                <Text variant="small" color="muted">
                  {freq === 'weekly' ? 'Check-in time on scheduled days' : 'Deadline time'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setUseCustomTime((v) => !v)}
                style={[styles.presetPill, useCustomTime && styles.presetPillOn]}
              >
                <Text variant="caption" color={useCustomTime ? 'forest' : 'muted'}>
                  {useCustomTime ? 'Pick from grid' : 'Exact time'}
                </Text>
              </Pressable>
            </View>

            {useCustomTime ? (
              <View style={styles.group}>
                <TextField
                  label="Custom time"
                  value={customTimeInput}
                  onChangeText={setCustomTimeInput}
                  placeholder="e.g. 19:15 or 7:15 PM"
                />
                <Text variant="caption" color="muted">
                  Selected: <Text variant="bodyStrong" color="forest">{activeSlot.label}</Text>
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.periodTabs}>
                  {periodLabels.map((p) => {
                    const count = availableSlots.filter((s) => s.period === p.key).length;
                    const active = activePeriod === p.key;
                    return (
                      <Pressable
                        key={p.key}
                        accessibilityRole="button"
                        disabled={count === 0}
                        onPress={() => setActivePeriod(p.key)}
                        style={[
                          styles.periodTab,
                          active && styles.periodTabOn,
                          count === 0 && styles.dateCardDisabled,
                        ]}
                      >
                        <Text variant="caption" color={active ? 'forest' : 'muted'}>
                          {p.label}{count === 0 ? ' (past)' : ''}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.timeGrid}>
                  {periodSlots.map((slot) => {
                    const selected = activeSlot.hour === slot.hour && activeSlot.minute === slot.minute;
                    return (
                      <Pressable
                        key={slot.label}
                        accessibilityRole="button"
                        onPress={() => setTimeChoice(slot)}
                        style={[styles.timeChip, selected && styles.timeChipOn]}
                      >
                        <Text variant="small" color={selected ? 'white' : 'text'}>{slot.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {freq === 'once' && dayChoice.offset === 0 ? (
                  <Text variant="caption" color="muted">
                    Showing only remaining times for today.
                  </Text>
                ) : null}
              </>
            )}
          </View>
        </View>

        <View style={styles.group}>
          <SectionLabel>Pay with</SectionLabel>
          <Segmented options={payOptions} value={payWith} onChange={setPayWith} />
          {payWith === 'credit' ? (
            <View style={styles.balanceRow}>
              <Text variant="small" color={short ? 'danger' : 'muted'} style={styles.flex}>
                {short ? `Not enough balance (${formatUsd(balance)}) for this stake.` : `Balance ${formatUsd(balance)}. No fee per pact.`}
              </Text>
              <Button label="Add funds" variant="link" fullWidth={false} onPress={() => router.push(routes.wallet)} />
            </View>
          ) : null}
          {payWith === 'card' ? <Text variant="small" color="muted">Paid in Whop. Kept pacts are refunded to your card.</Text> : null}
          {payWith === 'none' ? (
            <Text variant="small" color="muted">
              Nothing is charged (+5 Trust on completion, −30 if missed). Free pacts do not count toward the 3-pact streak to unlock Vault money.
            </Text>
          ) : null}
        </View>

        {money ? (
          <View style={styles.group}>
            <SectionLabel>Stake</SectionLabel>
            <StakeChips presets={presets} cents={stake} onChange={setStake} />
          </View>
        ) : null}
        <Text variant="caption" color="muted">{checkCopy[checkLevel(money ? stake : 0)]}</Text>

        <View style={styles.group}>
          <SectionLabel>Proof method</SectionLabel>
          <ProofMethodPicker value={methods} onChange={setMethods} />
          {methods.includes('location') ? (
            <TextField
              label="Place / Location name"
              value={locationName}
              onChangeText={setLocationName}
              placeholder="e.g. SmartFit Gym, Library, Office"
            />
          ) : null}
        </View>

        {money ? (
          <Checkbox
            checked={agreed}
            onChange={setAgreed}
            label={`Lock ${formatUsd(stake)} in my Vault if I miss the deadline.`}
            caption={`Proof must be approved by ${formatDeadline(dueAt)}. Your money isn’t lost.`}
          />
        ) : null}

        {error ? <ErrorBanner error={error} /> : null}
        <Button label={saving ? 'Creating…' : 'Confirm pact'} icon="arrowRight" disabled={!canConfirm} onPress={confirm} />
        {!task.trim() ? <Text variant="caption" color="muted" style={styles.hint}>Name the task to continue.</Text> : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 18 },
  group: { gap: 8 },
  flex: { flex: 1 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scheduleBox: {
    gap: 10,
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: colors.mintWash,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scheduleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  timeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  weekdayRow: { flexDirection: 'row', gap: 6 },
  weekdayBtn: {
    flex: 1,
    minHeight: 54,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekdayBtnOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  presetPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetPillOn: { backgroundColor: colors.mintSoft, borderColor: colors.forest },
  dateScroll: { gap: 8, paddingVertical: 2 },
  dateCard: {
    minWidth: 86,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 2,
  },
  dateCardOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  dateCardDisabled: { opacity: 0.4 },
  periodTabs: { flexDirection: 'row', gap: 6 },
  periodTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodTabOn: { backgroundColor: colors.mintSoft, borderColor: colors.forest },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  timeChip: {
    minWidth: '31%',
    flexGrow: 1,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  timeChipOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  hint: { textAlign: 'center', marginTop: -6 },
});
