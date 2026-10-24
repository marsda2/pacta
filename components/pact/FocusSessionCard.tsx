import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { formatUsd } from '@/lib/shared/rules';
import { formatCountdown } from '@/lib/shared/time';
import { colors, radii, shadows } from '@/lib/theme';

interface FocusSessionCardProps {
  remainingSec: number;
  stakeCents: number;
  dueLabel: string;
  running?: boolean;
  onToggle?: () => void;
  // Escala de la regla vertical: 30 min en la tarjeta compacta, 60 en la pantalla del pacto.
  maxMinutes?: 30 | 60;
  badge?: string;
  title?: string;
}

const RULER_HEIGHT = 132;
const TICKS = 31;

function Ruler({ remainingSec, maxMinutes }: { remainingSec: number; maxMinutes: 30 | 60 }) {
  const minutes = Math.min(maxMinutes, remainingSec / 60);
  const markerTop = (1 - minutes / maxMinutes) * RULER_HEIGHT;
  const labelStep = maxMinutes / 5;
  const labels = Array.from({ length: 5 }, (_, i) => maxMinutes - i * labelStep);

  return (
    <View style={styles.ruler}>
      <View style={styles.labels}>
        {labels.map((value) => (
          <Text key={value} variant="caption" color={colors.dark.textMuted} style={styles.label}>{value}</Text>
        ))}
        <Text variant="caption" color={colors.dark.textMuted} style={styles.label}>mins</Text>
      </View>
      <View style={styles.ticks}>
        {Array.from({ length: TICKS }, (_, i) => (
          <View key={i} style={[styles.tick, i % 6 === 0 && styles.tickMajor]} />
        ))}
      </View>
      <View style={styles.axis} />
      <View style={[styles.marker, { top: markerTop - 6 }]} />
    </View>
  );
}

export function FocusSessionCard({
  remainingSec,
  stakeCents,
  dueLabel,
  running,
  onToggle,
  maxMinutes = 30,
  badge,
  title = 'Focus session',
}: FocusSessionCardProps) {
  return (
    <View style={styles.card}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(246,170,56,0.28)', 'rgba(246,170,56,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.glow}
      />
      <View style={styles.header}>
        <Text variant="small" color="white">{title}</Text>
        {badge ? (
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text variant="caption" color="white">{badge}</Text>
          </View>
        ) : (
          <Text variant="small" color={colors.dark.textMuted}>{dueLabel}</Text>
        )}
      </View>
      <View style={styles.body}>
        <Ruler remainingSec={remainingSec} maxMinutes={maxMinutes} />
        <View style={styles.readout}>
          <Text
            variant="timer"
            color={colors.amber}
            numberOfLines={1}
            style={[styles.time, onToggle && styles.timeCompact]}
          >
            {formatCountdown(remainingSec)}
          </Text>
          <Text variant="heading" color={colors.amber}>
            {formatUsd(stakeCents)} <Text variant="body" color="white">at stake</Text>
          </Text>
          {badge ? <Text variant="small" color={colors.dark.textMuted}>Due {dueLabel}</Text> : null}
        </View>
        {onToggle ? (
          <Pressable accessibilityLabel={running ? 'Pause focus' : 'Resume focus'} onPress={onToggle} style={styles.toggle}>
            <Icon name={running ? 'pause' : 'play'} size={22} color={colors.white} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    padding: 20,
    gap: 16,
    borderRadius: radii.lg,
    backgroundColor: colors.dark.bg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    boxShadow: shadows.raised,
  },
  glow: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '55%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 56 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  badgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.amber },
  body: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  readout: { flex: 1, gap: 4 },
  time: { includeFontPadding: false },
  timeCompact: { fontSize: 34, lineHeight: 40 },
  toggle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  ruler: { width: 44, height: RULER_HEIGHT, flexDirection: 'row' },
  labels: { width: 26, justifyContent: 'space-between' },
  label: { fontSize: 10, lineHeight: 12, textAlign: 'left' },
  ticks: { position: 'absolute', right: 8, top: 0, bottom: 0, justifyContent: 'space-between', alignItems: 'flex-end' },
  tick: { width: 5, height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  tickMajor: { width: 9, backgroundColor: 'rgba(255,255,255,0.45)' },
  axis: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 2, backgroundColor: colors.amber, opacity: 0.85 },
  marker: {
    position: 'absolute',
    right: -5,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.amber,
    boxShadow: shadows.amberGlow,
  },
});
