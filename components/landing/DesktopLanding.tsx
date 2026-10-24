import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { PactaLogo } from '@/components/brand/PactaLogo';
import { Pax } from '@/components/companion/Pax';
import { Icon, Text, type IconName } from '@/components/ui';
import { colors, radii, shadows } from '@/lib/theme';

const features: { icon: IconName; title: string; body: string }[] = [
  { icon: 'pacts', title: 'Make a pact', body: 'Pick a task, set a deadline and put a stake on it. Keep your word and the stake comes back.' },
  { icon: 'camera', title: 'Prove it live', body: 'A live photo, your location or a witness. No gallery uploads, so the proof is real.' },
  { icon: 'witness', title: 'Fair play', body: 'When a proof is questioned, a Terac jury of real people reviews it and decides.' },
];

interface DesktopLandingProps {
  onPreview: () => void;
}

// Landing para escritorio: la app se usa en el móvil, así que aquí se explica y se lleva al teléfono.
export function DesktopLanding({ onPreview }: DesktopLandingProps) {
  const url = `${typeof window !== 'undefined' ? window.location.origin : 'https://pacta-theta.vercel.app'}/onboarding`;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.page}>
        <View style={styles.top}>
          <PactaLogo size={30} />
          <Pressable accessibilityRole="button" onPress={onPreview} hitSlop={8}>
            <Text variant="small" color="muted" style={styles.underline}>Preview the app here</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.copy}>
            <Text variant="eyebrow" color="muted">Built for your phone</Text>
            <Text variant="display" style={styles.headline}>One task. One deadline. Pax keeps you company.</Text>
            <Text variant="body" color="muted" style={styles.lead}>
              Put a stake on a task, prove you did it with a live photo and keep your word. Miss it and your stake waits in the
              Vault until you earn it back.
            </Text>
            <View style={styles.note}>
              <Icon name="camera" size={18} />
              <Text variant="small" style={styles.noteText}>
                Pacts are made and proved on your phone. PACTA needs your camera and location to check that you really did it.
              </Text>
            </View>
          </View>

          <View style={styles.stage}>
            <Pax expression="idle" waving size={150} />
            <View style={styles.qrCard}>
              <View style={styles.qr}>
                <QRCode value={url} size={148} color={colors.forest} backgroundColor={colors.surface} />
              </View>
              <Text variant="heading" style={styles.center}>Open PACTA on your phone</Text>
              <Text variant="small" color="muted" style={styles.center}>Point your camera at the code.</Text>
              <Text variant="caption" color="muted" style={styles.center} selectable>{url}</Text>
            </View>
          </View>
        </View>

        <View style={styles.features}>
          {features.map((feature) => (
            <View key={feature.title} style={styles.feature}>
              <View style={styles.featureIcon}>
                <Icon name={feature.icon} size={22} />
              </View>
              <Text variant="heading">{feature.title}</Text>
              <Text variant="body" color="muted">{feature.body}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 40, paddingVertical: 32 },
  page: { width: '100%', maxWidth: 1080, gap: 48 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  underline: { textDecorationLine: 'underline' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 56 },
  copy: { flex: 1, gap: 16 },
  headline: { fontSize: 52, lineHeight: 56, letterSpacing: -1.8 },
  lead: { fontSize: 18, lineHeight: 28, maxWidth: 520 },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    maxWidth: 520,
    padding: 14,
    borderRadius: radii.md,
    backgroundColor: colors.mintWash,
    borderWidth: 1,
    borderColor: colors.mint,
  },
  noteText: { flex: 1 },
  stage: { width: 340, alignItems: 'center', gap: 16 },
  qrCard: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
    padding: 24,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadows.raised,
  },
  qr: { marginBottom: 10 },
  center: { textAlign: 'center' },
  features: { flexDirection: 'row', gap: 20 },
  feature: {
    flex: 1,
    gap: 8,
    padding: 22,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mintSoft,
    marginBottom: 4,
  },
});
