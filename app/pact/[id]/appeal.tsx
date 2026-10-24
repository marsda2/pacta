import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PaxSays } from '@/components/companion/Pax';
import { LiveCapture, type Capture } from '@/components/pact/LiveCapture';
import { Button, Card, ErrorBanner, Icon, LoadingBlock, Screen, ScreenTitle, SectionLabel, Text, TextField } from '@/components/ui';
import { routes } from '@/lib/routes';
import { APPEAL_MAX_EXTRA_PHOTOS, APPEAL_NOTE_MAX_CHARS, APPEAL_PANEL_SIZE, formatUsd } from '@/lib/shared/rules';
import { usePacts } from '@/lib/store/pacts';
import { colors, radii } from '@/lib/theme';

// Apelación con fianza: el usuario que cree haber cumplido pide un panel de jueces humanos.
export default function AppealPact() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPact, appealPact, loading } = usePacts();
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [shooting, setShooting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const pact = getPact(id);

  if (!pact && loading) {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  }
  if (!pact) {
    return (
      <Screen>
        <ScreenTitle title="Pact not found" onBack={() => router.replace(routes.home)} />
      </Screen>
    );
  }

  const bond = pact.review?.appealBondCents;
  const canAppeal = pact.review?.canAppeal === true;

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      await appealPact(pact.id, { note: note.trim() || undefined, imageUris: photos });
      router.replace(routes.result(pact.id));
    } catch (e) {
      setError(e);
      setSending(false);
    }
  };

  const onCapture = (capture: Capture | null) => {
    setShooting(false);
    if (capture?.uri) setPhotos((current) => [...current, capture.uri!].slice(0, APPEAL_MAX_EXTRA_PHOTOS));
  };

  return (
    <Screen>
      <ScreenTitle title="Appeal to a human panel." subtitle={pact.title} onBack={() => router.back()} />

      <PaxSays message={`${APPEAL_PANEL_SIZE} people will look at your proof and decide by majority.`} expression="talking" />

      <Card style={styles.card}>
        <SectionLabel>How it works</SectionLabel>
        <Text variant="small" color="muted">
          {bond
            ? `If they rule for you, you get your full stake back. If they rule against you, ${formatUsd(bond)} of your stake is kept to pay the reviewers and the rest goes to your Vault.`
            : 'This appeal is included in your High-Yield Pass: nothing is at risk.'}
        </Text>
      </Card>

      <Card style={styles.card}>
        <SectionLabel>Show more (optional)</SectionLabel>
        <TextField
          label={`A note for the reviewers (max ${APPEAL_NOTE_MAX_CHARS} characters)`}
          value={note}
          onChangeText={(value) => setNote(value.slice(0, APPEAL_NOTE_MAX_CHARS))}
          placeholder="e.g. the code is on the paper at the left"
        />
        {photos.length > 0 ? (
          <View style={styles.thumbs}>
            {photos.map((uri, index) => (
              <View key={uri} style={styles.thumb}>
                <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                <Pressable accessibilityLabel="Remove photo" style={styles.remove} onPress={() => setPhotos((current) => current.filter((_, i) => i !== index))}>
                  <Icon name="close" size={14} color={colors.white} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        {shooting ? (
          <LiveCapture capture={null} onChange={onCapture} />
        ) : photos.length < APPEAL_MAX_EXTRA_PHOTOS ? (
          <Button label={`Add a live photo (${photos.length}/${APPEAL_MAX_EXTRA_PHOTOS})`} icon="camera" variant="mint" onPress={() => setShooting(true)} />
        ) : null}
      </Card>

      {error ? <ErrorBanner error={error} /> : null}
      <Button
        label={sending ? 'Sending…' : bond ? `Appeal · ${formatUsd(bond)} at stake` : 'Appeal'}
        icon="arrowRight"
        disabled={!canAppeal || sending}
        onPress={submit}
      />
      {!canAppeal ? <Text variant="caption" color="muted" style={styles.next}>This proof can’t be appealed right now.</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  thumbs: { flexDirection: 'row', gap: 10 },
  thumb: { width: 96, height: 96, borderRadius: radii.md, overflow: 'hidden', backgroundColor: colors.subtle },
  remove: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,28,24,0.7)' },
  next: { textAlign: 'center' },
});
