import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii } from '@/lib/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

interface BannerProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  tone?: 'success' | 'info' | 'danger';
  onDismiss?: () => void;
}

const tones = {
  success: { bg: colors.mintSoft, border: colors.mint, circle: colors.forest },
  info: { bg: colors.surface, border: colors.border, circle: colors.subtle },
  danger: { bg: colors.dangerSoft, border: '#F6CACA', circle: colors.danger },
} as const;

// Toast / banner de feedback ("Proof uploaded", "Reminder set").
export function Banner({ title, subtitle, icon = 'check', tone = 'success', onDismiss }: BannerProps) {
  const t = tones[tone];
  const onCircle = tone === 'info' ? colors.forest : colors.white;

  return (
    <View style={[styles.banner, { backgroundColor: t.bg, borderColor: t.border }]}>
      <View style={[styles.circle, { backgroundColor: t.circle }]}>
        <Icon name={icon} size={18} color={onCircle} strokeWidth={2.4} />
      </View>
      <View style={styles.flex}>
        <Text variant="bodyStrong">{title}</Text>
        {subtitle ? <Text variant="caption" color="muted">{subtitle}</Text> : null}
      </View>
      {onDismiss ? (
        <Pressable accessibilityLabel="Dismiss" hitSlop={10} onPress={onDismiss}>
          <Icon name="close" size={18} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

interface ProgressBarProps {
  step: number;
  total: number;
}

export function ProgressBar({ step, total }: ProgressBarProps) {
  const pct = Math.round((step / total) * 100);
  return (
    <View style={styles.progressRow}>
      <Text variant="small" color="muted">Step {step} of {total}</Text>
      <View style={styles.track}>
        <LinearGradient colors={[colors.mint, '#5FD0A5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      <Text variant="small" color="muted">{pct}%</Text>
    </View>
  );
}

interface StepTrackerProps {
  steps: readonly string[];
  current: number;
}

// Outline → Draft → Review: hecho (mint + check), actual (bosque), pendiente (vacío).
export function StepTracker({ steps, current }: StepTrackerProps) {
  return (
    <View style={styles.tracker}>
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <View key={label} style={styles.trackerItem}>
            <View style={styles.trackerHead}>
              <View style={[styles.line, index === 0 && styles.lineHidden, done || active ? styles.lineOn : null]} />
              <View style={[styles.node, done && styles.nodeDone, active && styles.nodeActive]}>
                {done ? <Icon name="check" size={14} strokeWidth={3} /> : null}
                {active ? <View style={styles.nodeCore} /> : null}
              </View>
              <View style={[styles.line, index === steps.length - 1 && styles.lineHidden, done ? styles.lineOn : null]} />
            </View>
            <Text variant="small" color={active ? 'text' : 'muted'} style={active && { fontWeight: '700' }}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  circle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.disabledBg, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  tracker: { flexDirection: 'row' },
  trackerItem: { flex: 1, alignItems: 'center', gap: 6 },
  trackerHead: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  line: { flex: 1, height: 2, backgroundColor: colors.border },
  lineOn: { backgroundColor: colors.mint },
  lineHidden: { opacity: 0 },
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
  nodeDone: { backgroundColor: colors.mint, borderColor: colors.mint },
  nodeActive: { borderColor: colors.forest },
  nodeCore: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.forest },
});
