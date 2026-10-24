import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PactaLogo } from '@/components/brand/PactaLogo';
import { Banner, Button, Card, Screen, TextField, Text } from '@/components/ui';
import { colors, radii } from '@/lib/theme';

type Verdict = 'APPROVE' | 'REJECT' | 'CHEAT';

interface RoundCase {
  id: string;
  title: string;
  dayCode: string;
  overwhelmed: boolean;
  photoUrl: string;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

const OPTIONS: { verdict: Verdict; label: string }[] = [
  { verdict: 'APPROVE', label: 'Real' },
  { verdict: 'REJECT', label: 'Not done' },
  { verdict: 'CHEAT', label: 'Fake' },
];

// Ronda 1 de calibración: es el `task_url` del estudio de Terac. Un juez revisa las 12 fotos
// y las envía de una vez; Terac añade ?teracSubmissionId=…&taskId=… a la URL.
export default function JuryRound1() {
  const { teracSubmissionId, taskId } = useLocalSearchParams<{ teracSubmissionId?: string; taskId?: string }>();
  const [cases, setCases] = useState<RoundCase[] | null>(null);
  const [votes, setVotes] = useState<Record<string, { verdict?: Verdict; reason?: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/jury/round1`)
      .then((res) => (res.ok ? (res.json() as Promise<{ cases: RoundCase[] }>) : Promise.reject(new Error(String(res.status)))))
      .then((data) => setCases(data.cases))
      .catch(() => setError('Could not load the photos.'));
  }, []);

  const set = (id: string, patch: { verdict?: Verdict; reason?: string }) =>
    setVotes((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  const missing = cases ? cases.filter((c) => !votes[c.id]?.verdict).length : 0;

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/jury/round1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ votes, teracSubmissionId, taskId }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const { completionUrl } = (await res.json()) as { completionUrl: string | null };
      setSent(true);
      // Devuelve al juez a Terac para que su respuesta pase a revisión y se le pague.
      if (completionUrl) await Linking.openURL(completionUrl);
    } catch {
      setError('Your answers could not be saved. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen>
      <View style={styles.brand}>
        <PactaLogo size={30} />
        <Text variant="eyebrow" color="muted">Jury review</Text>
      </View>

      {sent ? (
        <Banner tone="success" icon="check" title="Answers saved" subtitle="You can close this tab. Thank you!" />
      ) : (
        <>
          <Card style={styles.card}>
            <Text variant="title">Did they really do it?</Text>
            <Text variant="body" color="muted">
              People staked money on a habit and sent a photo as proof. For each photo, say if it is real, if the habit was not done, or if it is a fake. A real proof is an original photo that shows the habit and the handwritten code of the day.
            </Text>
          </Card>

          {cases?.map((c, index) => (
            <Card key={c.id} style={styles.card}>
              <Text variant="eyebrow" color="muted">Photo {index + 1} of {cases.length}</Text>
              <Text variant="bodyStrong">{c.title}</Text>
              <Text variant="body" color="muted">
                Expected handwritten code: <Text variant="bodyStrong">{c.dayCode}</Text>
              </Text>
              {c.overwhelmed ? (
                <Text variant="body" color="muted">
                  The user says they feel overwhelmed. If you answer “Not done”, suggest a 10-minute task they could do instead.
                </Text>
              ) : null}
              <View style={styles.photo}>
                <Image source={{ uri: `${API_URL}${c.photoUrl}` }} style={StyleSheet.absoluteFill} contentFit="contain" />
              </View>
              <View style={styles.decide}>
                {OPTIONS.map((option) => (
                  <Button
                    key={option.verdict}
                    label={option.label}
                    variant={votes[c.id]?.verdict === option.verdict ? 'primary' : 'outline'}
                    fullWidth={false}
                    onPress={() => set(c.id, { verdict: option.verdict })}
                    style={styles.flex}
                  />
                ))}
              </View>
              <TextField label="Why? (optional)" value={votes[c.id]?.reason ?? ''} onChangeText={(reason) => set(c.id, { reason })} placeholder="e.g. photo of a screen" />
            </Card>
          ))}

          {cases ? (
            <Button label={missing ? `${missing} photos left to answer` : 'Submit answers'} disabled={missing > 0 || sending} onPress={submit} />
          ) : (
            <Text variant="body" color="muted">{error ?? 'Loading…'}</Text>
          )}
          {cases && error ? <Text variant="caption" color="muted">{error}</Text> : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: { gap: 12 },
  photo: { height: 360, overflow: 'hidden', borderRadius: radii.md, backgroundColor: colors.subtle },
  decide: { flexDirection: 'row', gap: 8 },
});
