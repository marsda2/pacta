import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, GlassCard, Icon, Text } from '@/components/ui';
import { apiFetch } from '@/lib/api/client';
import { formatCountdown } from '@/lib/shared/time';
import { colors, radii } from '@/lib/theme';

import { StepList, type CopilotStep } from './CopilotCard';

export type Blocker = 'big' | 'distracted' | 'clarity';

const blockers: { value: Blocker; label: string }[] = [
  { value: 'big', label: 'Too big' },
  { value: 'distracted', label: 'Distracted' },
  { value: 'clarity', label: 'Need clarity' },
];

// Pasos de respaldo por bloqueo: se muestran si Gemini no responde (sin red, sin clave o error).
const plans: Record<Blocker, string[]> = {
  big: ['Open the document', 'Write three bullet points', 'Focus for 15 minutes'],
  distracted: ['Put your phone out of reach', 'Close every unrelated tab', 'Focus for one short block'],
  clarity: ['Write the goal in one sentence', 'List what “done” looks like', 'Pick the very first action'],
};

const durations = [5, 15, 25] as const;

interface CopilotPlannerProps {
  onStart?: (minutes: number) => void;
}

export function CopilotPlanner({ onStart }: CopilotPlannerProps) {
  const [blocker, setBlocker] = useState<Blocker>('big');
  const [minutes, setMinutes] = useState<(typeof durations)[number]>(15);
  const [done, setDone] = useState<string[]>([]);
  // Pasos que ya ha generado Pax por bloqueo; se piden una vez por bloqueo.
  const [generated, setGenerated] = useState<Partial<Record<Blocker, string[]>>>({});

  useEffect(() => {
    if (generated[blocker]) return;
    let active = true;
    apiFetch<{ steps: string[] }>('/api/copilot/steps', { method: 'POST', body: { blocker } })
      .then(({ steps }) => {
        if (active) setGenerated((prev) => ({ ...prev, [blocker]: steps }));
      })
      .catch(() => undefined); // Sin respuesta se quedan los pasos de respaldo.
    return () => {
      active = false;
    };
  }, [blocker, generated]);

  const steps = useMemo<CopilotStep[]>(
    () => (generated[blocker] ?? plans[blocker]).map((title, index) => ({ id: `${blocker}-${index}`, title, done: done.includes(`${blocker}-${index}`) })),
    [blocker, done, generated],
  );
  const toggle = (id: string) => setDone((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  return (
    <GlassCard padding={20}>
      <View style={styles.eyebrow}>
        <Icon name="copilot" size={16} />
        <Text variant="eyebrow">Pax</Text>
      </View>
      <Text variant="title">Let’s find your next step.</Text>

      <View style={styles.chips}>
        {blockers.map((item) => {
          const selected = item.value === blocker;
          return (
            <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setBlocker(item.value)} style={[styles.chip, selected && styles.chipOn]}>
              <Text variant="small" color={selected ? 'white' : 'text'} style={{ fontWeight: '700' }}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.note}>
        <Text variant="bodyStrong">You don’t need to finish everything now.</Text>
        <Text variant="small" color="muted">Let’s break this down into a few small steps.</Text>
      </View>

      <View style={styles.planRow}>
        <View style={styles.flex}>
          <StepList steps={steps} onToggle={toggle} />
        </View>
        <View style={styles.timer}>
          <Icon name="timer" size={18} />
          <Text variant="heading" style={{ fontVariant: ['tabular-nums'] }}>{formatCountdown(minutes * 60).slice(3)}</Text>
          <View style={styles.durations}>
            {durations.map((value) => (
              <Pressable key={value} onPress={() => setMinutes(value)} style={[styles.duration, value === minutes && styles.durationOn]}>
                <Text variant="caption" color={value === minutes ? 'white' : 'muted'} style={{ fontWeight: '700' }}>{value}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <Button label="Start first step" icon="arrowRight" onPress={() => onStart?.(minutes)} />
      <Text variant="caption" color="muted" style={styles.footnote}>Your pact deadline stays the same.</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 14 },
  chip: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  note: {
    gap: 2,
    padding: 14,
    marginBottom: 14,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  planRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  timer: {
    width: 96,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignSelf: 'flex-start',
  },
  durations: { flexDirection: 'row', gap: 4 },
  duration: { minWidth: 26, alignItems: 'center', paddingVertical: 4, paddingHorizontal: 6, borderRadius: 8, backgroundColor: colors.subtle },
  durationOn: { backgroundColor: colors.forest },
  footnote: { textAlign: 'center', marginTop: 10 },
});
