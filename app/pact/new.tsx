import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ProofMethodPicker } from '@/components/pact/ProofMethodPicker';
import { Button, Card, Checkbox, Screen, ScreenTitle, SectionLabel, SelectField, StakeChips, Text, TextField } from '@/components/ui';
import { routes } from '@/lib/routes';
import { formatUsd, STAKE_PRESETS_CENTS } from '@/lib/shared/rules';
import { buildDeadlineOptions, formatClockTime } from '@/lib/shared/time';
import type { ProofMethod } from '@/lib/shared/types';
import { usePacts } from '@/lib/store/pacts';

// Flujo 01 · Create a pact
export default function NewPact() {
  const router = useRouter();
  const { createPact } = usePacts();
  const options = useMemo(() => buildDeadlineOptions(), []);

  const [task, setTask] = useState('');
  const [deadline, setDeadline] = useState(options[0]);
  const [stake, setStake] = useState<number>(STAKE_PRESETS_CENTS[1]);
  const [methods, setMethods] = useState<ProofMethod[]>(['photo']);
  const [agreed, setAgreed] = useState(true);

  const canConfirm = task.trim().length > 0 && agreed;

  const confirm = () => {
    const pact = createPact({ title: task, stakeCents: stake, dueAt: deadline.dueAt, methods });
    router.replace(routes.pact(pact.id));
  };

  return (
    <Screen>
      <ScreenTitle title="Make it concrete." subtitle="One task. One deadline." onBack={() => router.back()} />

      <Card style={styles.form}>
        <TextField label="Task" value={task} onChangeText={setTask} placeholder="Finish the proposal" />
        <SelectField
          label="Deadline"
          value={deadline.label}
          options={options.map((o) => o.label)}
          onChange={(label) => setDeadline(options.find((o) => o.label === label) ?? options[0])}
        />

        <View style={styles.group}>
          <SectionLabel>Stake</SectionLabel>
          <StakeChips presets={STAKE_PRESETS_CENTS} cents={stake} onChange={setStake} />
        </View>

        <View style={styles.group}>
          <SectionLabel>Proof method</SectionLabel>
          <ProofMethodPicker value={methods} onChange={setMethods} />
        </View>

        <Checkbox
          checked={agreed}
          onChange={setAgreed}
          label={`Lock ${formatUsd(stake)} in my Vault if I miss the deadline.`}
          caption={`Proof must be approved by ${formatClockTime(deadline.dueAt)}. Your money isn’t lost.`}
        />

        <Button label="Confirm pact" icon="arrowRight" disabled={!canConfirm} onPress={confirm} />
        {!task.trim() ? <Text variant="caption" color="muted" style={styles.hint}>Name the task to continue.</Text> : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 18 },
  group: { gap: 8 },
  hint: { textAlign: 'center', marginTop: -6 },
});
