import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PactaLogo } from '@/components/brand/PactaLogo';
import { Button, Card, ErrorBanner, Icon, LoadingBlock, Screen, Text } from '@/components/ui';
import { routes } from '@/lib/routes';
import { formatDeadline } from '@/lib/shared/time';
import { usePacts } from '@/lib/store/pacts';
import { colors, radii } from '@/lib/theme';

// Flujo 05 · Witness review. Pantalla de invitado: no requiere cuenta.
export default function WitnessReview() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPact, resolvePact, loading } = usePacts();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const pact = getPact(id);

  const decide = async (kept: boolean) => {
    if (!pact) return;
    setBusy(true);
    setError(null);
    try {
      await resolvePact(pact.id, kept, 'witness');
      router.replace(routes.result(pact.id));
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.brand}>
        <PactaLogo size={30} />
        <Text variant="eyebrow" color="muted">Guest review</Text>
      </View>

      {loading && !pact ? <LoadingBlock /> : null}
      <Card style={styles.card}>
        <Text variant="title">Did Alex keep this pact?</Text>
        <Text variant="body" color="muted">{pact?.title ?? 'Unknown pact'}</Text>

        <View style={styles.row}>
          <View style={styles.photo}>
            {pact?.proofUri ? (
              <Image source={{ uri: pact.proofUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <LinearGradient colors={[colors.mint, colors.aqua]} style={[StyleSheet.absoluteFill, styles.photoEmpty]}>
                <Icon name="camera" size={28} />
              </LinearGradient>
            )}
            <View style={styles.stamp}>
              <Icon name="timer" size={12} color={colors.white} />
              <Text variant="caption" color="white">{pact?.proofAt ? formatDeadline(pact.proofAt) : 'Just now'}</Text>
            </View>
          </View>
          <View style={styles.side}>
            <Text variant="body" color="muted">Review the proof before deciding.</Text>
            <View style={styles.decide}>
              <Button label="Approve" leadingIcon="check" fullWidth={false} disabled={busy || !pact} onPress={() => decide(true)} style={styles.flex} />
              <Button label="Reject" variant="outline" leadingIcon="close" fullWidth={false} disabled={busy || !pact} onPress={() => decide(false)} style={styles.flex} />
            </View>
          </View>
        </View>

        {error ? <ErrorBanner error={error} /> : null}
        <View style={styles.foot}>
          <Text variant="caption" color="muted">No account needed.</Text>
          <Button label="View pact details" variant="link" icon="arrowRight" fullWidth={false} onPress={() => pact && router.push(routes.pact(pact.id))} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: { gap: 14 },
  row: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  photo: { width: 150, height: 130, overflow: 'hidden', borderRadius: radii.md, backgroundColor: colors.subtle },
  photoEmpty: { alignItems: 'center', justifyContent: 'center' },
  stamp: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(10,28,24,0.7)',
  },
  side: { flex: 1, minWidth: 180, gap: 10 },
  decide: { flexDirection: 'row', gap: 10 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.subtle, paddingTop: 8 },
});
