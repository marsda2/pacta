import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LiveCapture, type Capture } from '@/components/pact/LiveCapture';
import { Button, Card, Checkbox, ErrorBanner, Icon, Screen, ScreenTitle, Text } from '@/components/ui';
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
  const [confirmedCode, setConfirmedCode] = useState(false);
  const [gps, setGps] = useState<GpsCheckin | null>(null);
  const [locating, setLocating] = useState(false);
  const [gpsNote, setGpsNote] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const pact = getPact(id);
  const needsLocation = Boolean(pact?.methods.includes('location'));
  const isLight = checkLevel(pact?.stakeCents ?? 0) === 'light';
  // Si el usuario verifica su GPS en vivo (p.ej. en el gimnasio), no le obligamos a llevar papel y boli con el código.
  const needsCode = !isLight && !gps;
  const code = needsCode ? pact?.dayCode : undefined;

  const updateCapture = (next: Capture | null) => {
    setCapture(next);
    if (!next) setConfirmedCode(false);
  };

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

  const canSubmit = (Boolean(capture) || (isLight && Boolean(gps))) && (!code || confirmedCode) && !sending;

  return (
    <Screen>
      <ScreenTitle title="Show your progress." subtitle={pact?.title} onBack={() => router.back()} />

      {code ? (
        <Card style={styles.codeCard}>
          <View style={styles.codeHeader}>
            <View style={styles.requiredPill}>
              <Icon name="lock" size={14} color={colors.white} />
              <Text variant="caption" color="white" style={styles.requiredLabel}>REQUIRED IN PHOTO</Text>
            </View>
            <Text variant="caption" color="muted">Anti-cheat verification</Text>
          </View>
          <View style={styles.codeMain}>
            <View style={styles.codeBox}>
              <Text variant="title" color="forest" style={styles.codeLetters}>{code}</Text>
            </View>
            <View style={styles.flex}>
              <Text variant="bodyStrong">Write &ldquo;{code}&rdquo; by hand on paper</Text>
              <Text variant="small" color="muted">
                Place the handwritten code next to your task or screen so it is clearly visible in the photo.
                {needsLocation ? ' Or verify your live GPS below to skip the paper code.' : ' Without it, the AI will reject the proof.'}
              </Text>
            </View>
          </View>
        </Card>
      ) : null}

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
                  ? isLight
                    ? `GPS verified (${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}) — you can complete your check-in right now without a photo, or attach a photo below.`
                    : `GPS verified (${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}) — no handwritten code or building sign needed! Just snap a live photo.`
                  : 'Verify your device GPS so we know you are at the location (skips the handwritten paper code and building sign).'}
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

      <LiveCapture capture={capture} onChange={updateCapture} dayCode={code} />

      {capture && code ? (
        <Card style={styles.confirmCard}>
          <Checkbox
            checked={confirmedCode}
            onChange={setConfirmedCode}
            label={`I confirm the handwritten code "${code}" is clearly visible in this photo.`}
            caption="Required to prove this photo is real and taken live right now."
          />
        </Card>
      ) : null}

      <View style={styles.actions}>
        {error ? <ErrorBanner error={error} /> : null}
        <Button
          label={sending ? 'Uploading…' : !capture && isLight && gps ? 'Complete GPS check-in' : 'Submit proof'}
          icon="arrowRight"
          disabled={!canSubmit}
          onPress={submit}
        />
        <Text variant="caption" color="muted" style={styles.next}>
          {capture && code && !confirmedCode
            ? `Check the confirmation box above to verify that "${code}" is visible in your photo.`
            : 'Next: AI review and verification.'}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  codeCard: {
    gap: 10,
    padding: 16,
    backgroundColor: colors.mintWash,
    borderWidth: 2,
    borderColor: colors.forest,
  },
  codeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  requiredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.forest,
  },
  requiredLabel: { fontWeight: '700', letterSpacing: 0.6 },
  codeMain: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  codeBox: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeLetters: { letterSpacing: 3, fontWeight: '800' },
  confirmCard: { padding: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.forest },
  locationCard: { gap: 10, padding: 14 },
  locationHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  flex: { flex: 1, gap: 2 },
  actions: { gap: 8 },
  next: { textAlign: 'center' },
});
