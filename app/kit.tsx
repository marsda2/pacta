import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PactaLogo } from '@/components/brand/PactaLogo';
import { Pax, type PaxExpression } from '@/components/companion/Pax';
import { CopilotCard } from '@/components/copilot/CopilotCard';
import { CopilotPlanner } from '@/components/copilot/CopilotPlanner';
import { AppHeader } from '@/components/nav/AppHeader';
import { FocusSessionCard } from '@/components/pact/FocusSessionCard';
import { PactCard } from '@/components/pact/PactCard';
import { PactResultCard } from '@/components/pact/PactResultCard';
import { ProofMethodPicker } from '@/components/pact/ProofMethodPicker';
import {
  Banner,
  Button,
  Card,
  Checkbox,
  Icon,
  iconNames,
  ProgressBar,
  Screen,
  SectionLabel,
  SelectField,
  Segmented,
  StakeChips,
  StakeStepper,
  StatusBadge,
  StepTracker,
  Text,
  TextField,
  UploadDropzone,
  type SegmentOption,
} from '@/components/ui';
import { STAKE_PRESETS_CENTS } from '@/lib/shared/rules';
import type { Pact, PactUiStatus, ProofMethod } from '@/lib/shared/types';
import { colors } from '@/lib/theme';

const now = Date.now();
const samplePact: Pact = {
  id: 'kit',
  title: 'Finish the proposal',
  stakeCents: 2000,
  dueAt: now + 45 * 60 * 1000,
  status: 'progress',
  rawStatus: 'ACTIVE',
  methods: ['photo', 'location', 'witness'],
  focusTotalSec: 2700,
  focusRemainingSec: 2700,
  stepIndex: 1,
};

const tabs: SegmentOption<'today' | 'upcoming' | 'completed'>[] = [
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
];

const statuses: PactUiStatus[] = ['scheduled', 'progress', 'pending', 'verified', 'missed'];
const expressions: PaxExpression[] = ['idle', 'happy', 'talking', 'worried', 'sleeping'];
const swatches = [
  ['forest', colors.forest],
  ['mint', colors.mint],
  ['aqua', colors.aqua],
  ['amber', colors.amber],
  ['bg', colors.bg],
  ['border', colors.border],
  ['verified', colors.status.verified],
  ['missed', colors.status.missed],
] as const;

// Galería de componentes (equivalente al UI Component Library del diseño). Ruta: /kit
export default function Kit() {
  const router = useRouter();
  const [task, setTask] = useState('Finish the proposal');
  const [deadline, setDeadline] = useState('Today, 6:00 PM');
  const [stake, setStake] = useState<number>(STAKE_PRESETS_CENTS[1]);
  const [methods, setMethods] = useState<ProofMethod[]>(['photo']);
  const [tab, setTab] = useState<'today' | 'upcoming' | 'completed'>('today');
  const [agreed, setAgreed] = useState(true);
  const [banner, setBanner] = useState(true);

  return (
    <Screen contentStyle={styles.page}>
      <View style={styles.hero}>
        <PactaLogo size={52} tagline="UI component library" />
        <Text variant="title" color="muted">Calm control, in every interaction.</Text>
        <Button label="Back to the app" variant="link" fullWidth={false} style={styles.back} onPress={() => router.replace('/')} />
      </View>

      <Block title="Colors">
        <View style={styles.swatches}>
          {swatches.map(([name, value]) => (
            <View key={name} style={styles.swatch}>
              <View style={[styles.chip, { backgroundColor: value }]} />
              <Text variant="caption" color="muted">{name}</Text>
            </View>
          ))}
        </View>
      </Block>

      <Block title="Icon library">
        <View style={styles.icons}>
          {iconNames.map((name) => (
            <View key={name} style={styles.icon}>
              <Icon name={name} size={24} />
              <Text variant="caption" color="muted">{name}</Text>
            </View>
          ))}
        </View>
      </Block>

      <Block title="Pax, the companion">
        <View style={styles.pax}>
          {expressions.map((expression) => (
            <View key={expression} style={styles.paxItem}>
              <Pax expression={expression} size={96} />
              <Text variant="caption" color="muted">{expression}</Text>
            </View>
          ))}
          <View style={styles.paxItem}>
            <Pax expression="idle" waving size={96} />
            <Text variant="caption" color="muted">waving</Text>
          </View>
        </View>
      </Block>

      <Block title="Actions & inputs">
        <Button label="Create a pact" icon="arrowRight" />
        <Button label="Start 15 min" variant="mint" />
        <Button label="Add proof" variant="outline" />
        <Button label="View details" variant="link" icon="arrowRight" fullWidth={false} />
        <Button label="Continue" disabled />
        <TextField label="Task" value={task} onChangeText={setTask} placeholder="Finish the proposal" />
        <SelectField label="Deadline" value={deadline} options={['Today, 6:00 PM', 'Today, 9:00 PM', 'Tomorrow, 9:00 AM']} onChange={setDeadline} />
        <StakeStepper cents={stake} onChange={setStake} />
        <StakeChips presets={STAKE_PRESETS_CENTS} cents={stake} onChange={setStake} />
        <ProofMethodPicker value={methods} onChange={setMethods} />
        <Checkbox label="Lock the stake in my Vault if I miss the deadline." caption="Proof must be approved by 6:00 PM." checked={agreed} onChange={setAgreed} />
      </Block>

      <Block title="Pact cards">
        <PactCard pact={samplePact} />
        <FocusSessionCard remainingSec={2700} stakeCents={2000} dueLabel="Today, 6:00 PM" maxMinutes={30} />
        <FocusSessionCard title="Finish the proposal" badge="In progress" remainingSec={2700} stakeCents={2000} dueLabel="6:00 PM" maxMinutes={60} running onToggle={() => undefined} />
        <StepTracker steps={['Outline', 'Draft', 'Review']} current={1} />
      </Block>

      <Block title="Pax">
        <CopilotCard />
        <CopilotPlanner />
      </Block>

      <Block title="Status & feedback">
        <View style={styles.badges}>
          {statuses.map((status) => <StatusBadge key={status} status={status} />)}
        </View>
        {banner ? <Banner title="Proof uploaded" subtitle="2 minutes ago" onDismiss={() => setBanner(false)} /> : null}
        <Banner title="Reminder set" subtitle="Today at 5:45 PM" icon="notifications" tone="info" />
        <ProgressBar step={2} total={3} />
      </Block>

      <Block title="Navigation">
        <AppHeader title="My pacts" />
        <Segmented options={tabs} value={tab} onChange={setTab} />
      </Block>

      <Block title="Material & micro-UI">
        <UploadDropzone />
        <Banner title="Pact kept." subtitle="Great work! You stayed consistent." icon="check" />
      </Block>

      <Block title="Results">
        <PactResultCard pact={{ ...samplePact, status: 'verified', completedAt: now }} onPlanNext={() => undefined} />
        <PactResultCard pact={{ ...samplePact, status: 'missed' }} onViewDetails={() => undefined} />
      </Block>
    </Screen>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.block}>
      <SectionLabel>{title}</SectionLabel>
      <Card style={styles.card}>{children}</Card>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { maxWidth: 720, width: '100%', alignSelf: 'center' },
  hero: { gap: 10, paddingTop: 8 },
  back: { alignSelf: 'flex-start' },
  block: { gap: 10 },
  card: { gap: 14 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  swatch: { alignItems: 'center', gap: 4 },
  chip: { width: 52, height: 52, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  icon: { width: 78, alignItems: 'center', gap: 4 },
  pax: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  paxItem: { alignItems: 'center', gap: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
