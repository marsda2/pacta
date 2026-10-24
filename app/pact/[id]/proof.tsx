import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LiveCapture, type Capture } from '@/components/pact/LiveCapture';
import { Button, Card, ErrorBanner, Icon, Screen, ScreenTitle, Text } from '@/components/ui';
import { routes } from '@/lib/routes';
import { checkLevel } from '@/lib/shared/rules';
import { usePacts, type GpsCheckin } from '@/lib/store/pacts';
import { colors, radii } from '@/lib/theme';

// Flujo 03 · Live proof
export default function LiveProof() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPact, submitProof } = usePacts();
  const [capture, setCapture] = useState<Capture | null>(null);
  const [gps, setGps] = useState<GpsCheckin | null>(null);
  const [locating, setLocating] = useState(false);
  const [gpsNote, setGpsNote] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const pact = getPact(id);
  const needsLocation = Boolean(pact?.methods.includes('location'));
  const isLight = checkLevel(pact?.stakeCents ?? 0) === 'light';

  const checkInLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsNote('GPS not available on this device; your photo will still be reviewed.');
      return;
    }
    setLocating(true);
    setGpsNote(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setLocating(false);
      },
      () => {
        setGpsNote('Could not read GPS location. Check location permissions or submit with photo.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const submit = async () => {
    if (!pact) return;
    setSending(true);
    setError(null);
    try {
      await submitProof(pact.id, capture?.uri, gps ?? undefined);
      router.replace(routes.result(pact.id));
    } catch (e) {
      setError(e);
      setSending(false);
    }
  };

  return (
    <Screen>
      <ScreenTitle title="Show your progress." subtitle={pact?.title} onBack={() => router.back()} />

      <View style={styles.tagsRow}>
        <View style={styles.tag}>
          <Icon name="camera" size={18} />
          <Text variant="bodyStrong">Live photo</Text>
        </View>
        {pact?.dayCode ? (
          <View style={styles.codeBadge}>
            <Text variant="caption" color="muted">{isLight ? 'Code (optional):' : 'Write code:'}</Text>
            <Text variant="bodyStrong" color="forest">{pact.dayCode}</Text>
          </View>
        ) : null}
      </View>

      {needsLocation ? (
        <Card style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <Icon name="location" size={18} color={colors.forest} />
            <View style={styles.flex}>
              <Text variant="bodyStrong">
                {pact?.locationName ? `Location: ${pact.locationName}` : 'Location check-in'}
              </Text>
              <Text variant="caption" color="muted">
                {gps
                  ? `GPS verified (${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)})`
                  : 'Attach your current GPS location to verify where you took the photo.'}
              </Text>
              {gpsNote ? <Text variant="caption" color="danger">{gpsNote}</Text> : null}
            </View>
          </View>
          <Button
            label={gps ? 'Update GPS check-in' : locating ? 'Checking GPS…' : 'Verify GPS location'}
            variant={gps ? 'outline' : 'mint'}
            leadingIcon="location"
            disabled={locating}
            onPress={checkInLocation}
          />
        </Card>
      ) : null}

      <LiveCapture capture={capture} onChange={setCapture} />

      <View style={styles.actions}>
        {error ? <ErrorBanner error={error} /> : null}
        <Button label={sending ? 'Uploading…' : 'Use this photo'} icon="arrowRight" disabled={!capture || sending} onPress={submit} />
        <Text variant="caption" color="muted" style={styles.next}>Next: review and submit.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tagsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.mintSoft,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.mintWash,
    borderWidth: 1,
    borderColor: colors.mint,
  },
  locationCard: { gap: 10, padding: 14 },
  locationHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  flex: { flex: 1, gap: 2 },
  actions: { gap: 8 },
  next: { textAlign: 'center' },
});
