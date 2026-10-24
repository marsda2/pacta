import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PactaLogo } from '@/components/brand/PactaLogo';
import { Pax, type PaxExpression } from '@/components/companion/Pax';
import { Button, Icon, Screen, Text, type IconName } from '@/components/ui';
import { apiFetch } from '@/lib/api/client';
import { routes } from '@/lib/routes';
import { colors, radii } from '@/lib/theme';

interface Step {
  eyebrow: string;
  title: string;
  body: string;
  expression: PaxExpression;
  waving?: boolean;
  proofs?: { icon: IconName; label: string }[];
}

const steps: Step[] = [
  {
    eyebrow: 'Welcome',
    title: 'Meet Pax',
    body: 'One task. One deadline. Pax keeps you company.',
    expression: 'idle',
    waving: true,
  },
  {
    eyebrow: 'How it works',
    title: 'Make a pact',
    body: 'Pick a task, set a deadline and put a stake on it. Keep your word and the stake comes back. Miss it and the stake moves to the Vault.',
    expression: 'talking',
  },
  {
    eyebrow: 'Proof',
    title: 'Prove it',
    body: 'Show you did it with a live photo, your location, or a witness who confirms it.',
    expression: 'idle',
    proofs: [
      { icon: 'camera', label: 'Photo' },
      { icon: 'location', label: 'Location' },
      { icon: 'witness', label: 'Witness' },
    ],
  },
  {
    eyebrow: 'Fair play',
    title: 'Disputes go to a jury',
    body: 'When a proof is questioned, a Terac jury of real people reviews it and decides.',
    expression: 'worried',
  },
  {
    eyebrow: 'Ready',
    title: 'Let’s make your first pact',
    body: 'It takes less than a minute to set up.',
    expression: 'happy',
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const last = index === steps.length - 1;
  const [trying, setTrying] = useState(false);

  // Pacto de ejemplo sin dinero: arriesgas 30 puntos de reputación y ves cómo funciona.
  const tryExample = async () => {
    setTrying(true);
    try {
      const { pact } = await apiFetch<{ pact: { id: string } }>('/api/pacts', {
        method: 'POST',
        body: { title: 'Example: read 10 pages', stakeCents: 0, dueAt: Date.now() + 60 * 60_000, methods: ['photo'], reputationOnly: true },
      });
      router.replace(routes.pact(pact.id));
    } catch {
      router.replace(routes.newPact);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.top}>
        <PactaLogo size={26} />
        {last ? null : (
          <Pressable accessibilityRole="button" onPress={() => router.replace(routes.home)} hitSlop={8}>
            <Text variant="small" color="muted">Skip</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.stage}>
        <Pax expression={step.expression} waving={step.waving} size={190} />
      </View>

      <View style={styles.copy}>
        <Text variant="eyebrow" color="muted">{step.eyebrow}</Text>
        <Text variant="display">{step.title}</Text>
        <Text variant="body" color="muted">{step.body}</Text>
        {step.proofs ? (
          <View style={styles.chips}>
            {step.proofs.map((proof) => (
              <View key={proof.label} style={styles.chip}>
                <Icon name={proof.icon} size={16} />
                <Text variant="small">{proof.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.dots} accessibilityLabel={`Step ${index + 1} of ${steps.length}`}>
        {steps.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotOn]} />
        ))}
      </View>

      {last ? (
        <View style={styles.actions}>
          <Button label="Create my first pact" icon="arrowRight" onPress={() => router.replace(routes.newPact)} />
          <Button label="Try a free example pact" variant="outline" disabled={trying} onPress={tryExample} />
          <Button label="Maybe later" variant="link" onPress={() => router.replace(routes.home)} />
        </View>
      ) : (
        <View style={styles.actions}>
          <Button label="Next" icon="arrowRight" onPress={() => setIndex(index + 1)} />
          <View style={styles.backSlot}>
            {index > 0 ? <Button label="Back" variant="link" onPress={() => setIndex(index - 1)} /> : null}
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'space-between', gap: 24 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderRadius: radii.xl,
    backgroundColor: colors.mintWash,
    borderWidth: 1,
    borderColor: colors.mint,
  },
  copy: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotOn: { width: 24, backgroundColor: colors.forest },
  actions: { gap: 8 },
  // Reserva el hueco del "Back" para que los botones no salten entre pasos.
  backSlot: { minHeight: 36, alignItems: 'center', justifyContent: 'center' },
});
