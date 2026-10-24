import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, GlassCard, Icon, Text } from '@/components/ui';
import { colors } from '@/lib/theme';

export interface CopilotStep {
  id: string;
  title: string;
  done: boolean;
}

interface StepListProps {
  steps: CopilotStep[];
  onToggle: (id: string) => void;
}

// Lista de micro-pasos con conector vertical; el paso hecho se tacha.
export function StepList({ steps, onToggle }: StepListProps) {
  return (
    <View style={styles.list}>
      {steps.map((step, index) => (
        <Pressable key={step.id} accessibilityRole="checkbox" accessibilityState={{ checked: step.done }} onPress={() => onToggle(step.id)} style={styles.step}>
          <View style={styles.rail}>
            <View style={[styles.node, step.done && styles.nodeDone]}>
              {step.done ? <Icon name="check" size={14} color={colors.white} strokeWidth={3} /> : null}
            </View>
            {index < steps.length - 1 ? <View style={styles.connector} /> : null}
          </View>
          <Text variant="body" color={step.done ? 'muted' : 'text'} style={[styles.stepText, step.done && styles.struck]}>
            {step.title}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const defaultSteps: CopilotStep[] = [
  { id: '1', title: 'Open your document', done: true },
  { id: '2', title: 'Write three bullet points', done: false },
  { id: '3', title: 'Work for 15 minutes', done: false },
];

interface CopilotCardProps {
  onStartFocus?: () => void;
}

// Tarjeta del Home: un paso pequeño para arrancar.
export function CopilotCard({ onStartFocus }: CopilotCardProps) {
  const [steps, setSteps] = useState(defaultSteps);
  const toggle = (id: string) => setSteps((list) => list.map((s) => (s.id === id ? { ...s, done: !s.done } : s)));

  return (
    <GlassCard>
      <View style={styles.tiles} pointerEvents="none">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={[styles.tile, tileStyle[i]]} />
        ))}
      </View>
      <View style={styles.eyebrow}>
        <Icon name="copilot" size={16} />
        <Text variant="eyebrow" style={{ color: colors.forest }}>Pax</Text>
      </View>
      <Text variant="title" style={styles.title}>Let’s make it easier.</Text>
      <Text variant="body" color="muted" style={styles.subtitle}>Start with one small step.</Text>
      <StepList steps={steps} onToggle={toggle} />
      <Button label="Start focus" icon="arrowRight" onPress={onStartFocus} style={styles.cta} />
    </GlassCard>
  );
}

const tileStyle = [
  { right: 70, top: 14, backgroundColor: 'rgba(128,217,231,0.22)' },
  { right: 14, top: 14, backgroundColor: 'rgba(128,217,231,0.30)' },
  { right: 14, top: 84, backgroundColor: 'rgba(188,233,213,0.75)' },
  { right: 70, top: 84, backgroundColor: 'rgba(188,233,213,0.45)' },
  { right: 14, top: 154, backgroundColor: 'rgba(128,217,231,0.38)' },
  { right: 70, top: 154, backgroundColor: 'rgba(188,233,213,0.30)' },
] as const;

const styles = StyleSheet.create({
  tiles: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  tile: { position: 'absolute', width: 52, height: 62, borderRadius: 14 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  title: { marginBottom: 2 },
  subtitle: { marginBottom: 18 },
  cta: { marginTop: 22 },
  list: { gap: 0 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 52 },
  rail: { alignItems: 'center', alignSelf: 'stretch' },
  node: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  nodeDone: { backgroundColor: colors.forest, borderColor: colors.forest },
  connector: { flex: 1, width: 2, marginVertical: 2, backgroundColor: colors.border },
  stepText: { flex: 1, paddingTop: 3 },
  struck: { textDecorationLine: 'line-through' },
});
