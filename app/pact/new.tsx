import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProofMethodPicker } from '@/components/pact/ProofMethodPicker';
import {
  Button,
  Card,
  Checkbox,
  ErrorBanner,
  Screen,
  ScreenTitle,
  SectionLabel,
  Segmented,
  SelectField,
  StakeChips,
  Text,
  TextField,
  type SegmentOption,
} from '@/components/ui';
import { routes } from '@/lib/routes';
import { checkLevel, CREDIT_STAKE_MIN_CENTS, CREDIT_STAKE_PRESETS_CENTS, formatUsd, STAKE_PRESETS_CENTS, type CheckLevel } from '@/lib/shared/rules';
import { buildDayOptions, buildTimeSlotOptions, combineDayAndTime, defaultTimeSlot, formatDeadline } from '@/lib/shared/time';
import type { ProofMethod } from '@/lib/shared/types';
import { usePacts } from '@/lib/store/pacts';
import { useWallet } from '@/lib/store/wallet';
import { colors, radii } from '@/lib/theme';
import { openCheckout } from '@/lib/whop';

type PayWith = 'credit' | 'card' | 'none';
type FrequencyMode = 'once' | 'weekly';

const payOptions: SegmentOption<PayWith>[] = [
  { value: 'credit', label: 'Balance' },
  { value: 'card', label: 'Card' },
  { value: 'none', label: 'No money' },
];

const freqOptions: SegmentOption<FrequencyMode>[] = [
  { value: 'once', label: 'One-time' },
  { value: 'weekly', label: 'Weekly habit' },
];

const WEEKLY_DAYS = [2, 3, 4, 5, 6, 7] as const;

// Cuánto se verifica según lo que hay en juego (rules.ts, checkLevel).
const checkCopy: Record<CheckLevel, string> = {
  light: 'Light check (< $5 or free): a live photo (plus GPS if Location is on) is enough — no handwritten code required.',
  standard: 'Strict AI check ($5+): requires the 4-letter handwritten code in your live photo.',
  human: 'Big stake ($20+): requires the 4-letter handwritten code; if the AI doubts, a human Terac juror decides.',
};

// Flujo 01 · Create a pact
export default function NewPact() {
  const router = useRouter();
  const { createPact } = usePacts();
  const { wallet } = useWallet();
  const dayOptions = useMemo(() => buildDayOptions(), []);
  const timeSlots = useMemo(() => buildTimeSlotOptions(), []);
  const defaultSlot = useMemo(() => defaultTimeSlot(timeSlots), [timeSlots]);

  const [task, setTask] = useState('');
  const [freq, setFreq] = useState<FrequencyMode>('once');
  const [weeklyDays, setWeeklyDays] = useState<number>(4);
  const [dayChoice, setDayChoice] = useState(dayOptions[0]);
  const [timeChoice, setTimeChoice] = useState(defaultSlot);
  const [payChoice, setPayWith] = useState<PayWith | null>(null);
  const [stakeChoice, setStake] = useState<number | null>(null);
  const [methods, setMethods] = useState<ProofMethod[]>(['photo']);
  const [locationName, setLocationName] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const effectiveDayOffset = freq === 'weekly' ? 7 : dayChoice.offset;
  const dueAt = combineDayAndTime(effectiveDayOffset, timeChoice.hour, timeChoice.minute);
  const targetDays = freq === 'weekly' ? weeklyDays : 1;

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
      <ScreenTitle title="Make it concrete." subtitle="Choose your task, frequency, and proof." onBack={() => router.back()} />

      <Card style={styles.form}>
        <TextField label="Task" value={task} onChangeText={setTask} placeholder="Go to the gym / Finish proposal" />

        <View style={styles.group}>
          <SectionLabel>Frequency</SectionLabel>
          <Segmented options={freqOptions} value={freq} onChange={setFreq} />
          {freq === 'weekly' ? (
            <View style={styles.group}>
              <Text variant="small" color="muted">How many days this week?</Text>
              <View style={styles.daysRow}>
                {WEEKLY_DAYS.map((d) => (
                  <Pressable
                    key={d}
                    accessibilityRole="button"
                    onPress={() => setWeeklyDays(d)}
                    style={[styles.dayChip, weeklyDays === d && styles.dayChipOn]}
                  >
                    <Text variant="bodyStrong" color={weeklyDays === d ? 'white' : 'text'}>{d}x</Text>
                  </Pressable>
                ))}
              </View>
              <Text variant="caption" color="muted">
                Check in {weeklyDays} days over the next 7 days (until {formatDeadline(dueAt)}).
              </Text>
            </View>
          ) : (
            <SelectField
              label="Day"
              value={dayChoice.label}
              options={dayOptions.map((o) => o.label)}
              onChange={(label) => setDayChoice(dayOptions.find((o) => o.label === label) ?? dayOptions[0])}
            />
          )}
          <SelectField
            label={freq === 'weekly' ? 'Weekly cutoff time' : 'Time'}
            icon="timer"
            value={timeChoice.label}
            options={timeSlots.map((s) => s.label)}
            onChange={(label) => setTimeChoice(timeSlots.find((s) => s.label === label) ?? defaultSlot)}
          />
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
  daysRow: { flexDirection: 'row', gap: 8 },
  dayChip: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayChipOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  hint: { textAlign: 'center', marginTop: -6 },
});
