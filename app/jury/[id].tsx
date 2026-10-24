import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PactaLogo } from '@/components/brand/PactaLogo';
import { Banner, Button, Card, Screen, TextField, Text } from '@/components/ui';
import { colors, radii } from '@/lib/theme';

type Verdict = 'APPROVE' | 'REJECT' | 'CHEAT';

interface JuryCase {
  title: string;
  dayCode: string;
  photoUrl: string;
  // Apelación: el usuario cree que se equivocaron y añade pruebas y una nota.
  appeal: boolean;
  note: string | null;
  evidence: string[];
}

const absolute = (url: string) => (url.startsWith('/') ? `${API_URL}${url}` : url);

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

// Página de jurado: es el `task_url` de la tarea de Terac. Terac añade
// ?teracSubmissionId=…&taskId=… y el voto vuelve a nuestra API, no a Terac.
export default function JuryReview() {
  const { id, teracSubmissionId, taskId } = useLocalSearchParams<{ id: string; teracSubmissionId?: string; taskId?: string }>();
  const [item, setItem] = useState<JuryCase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/jury/${id}`)
      .then((res) => (res.ok ? (res.json() as Promise<JuryCase>) : Promise.reject(new Error(String(res.status)))))
      .then(setItem)
      .catch(() => setError('Could not load this case.'));
  }, [id]);

  const vote = async (verdict: Verdict) => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/jury/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verdict, reason: reason.trim() || undefined, teracSubmissionId, taskId }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const { completionUrl } = (await res.json()) as { completionUrl: string | null };
      setSent(true);
      // Devuelve al juez a Terac para que su respuesta pase a revisión y se le pague.
      if (completionUrl) await Linking.openURL(completionUrl);
    } catch {
      setError('Your vote could not be saved. Please try again.');
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
        <Banner tone="success" icon="check" title="Vote saved" subtitle="You can close this tab. Thank you!" />
      ) : (
        <Card style={styles.card}>
          <Text variant="title">Did they really do it?</Text>
          {item ? (
            <>
              <Text variant="body" color="muted">Task: {item.title}</Text>
              <Text variant="body" color="muted">
                The photo should show the handwritten code <Text variant="bodyStrong">{item.dayCode}</Text>.
              </Text>
              <View style={styles.photo}>
                <Image source={{ uri: absolute(item.photoUrl) }} style={StyleSheet.absoluteFill} contentFit="contain" />
              </View>
              {item.appeal ? (
                <>
                  <Text variant="small" color="muted">
                    This is an appeal: the person thinks the first review was wrong and added more evidence.
                  </Text>
                  {item.note ? <Text variant="body">“{item.note}”</Text> : null}
                  {item.evidence.map((url) => (
                    <View key={url} style={styles.photo}>
                      <Image source={{ uri: absolute(url) }} style={StyleSheet.absoluteFill} contentFit="contain" />
                    </View>
                  ))}
                </>
              ) : null}
              <TextField label="Why? (optional)" value={reason} onChangeText={setReason} placeholder="e.g. photo of a screen" />
              <View style={styles.decide}>
                <Button label="Real" leadingIcon="check" fullWidth={false} disabled={sending} onPress={() => vote('APPROVE')} style={styles.flex} />
                <Button label="Not done" variant="outline" leadingIcon="close" fullWidth={false} disabled={sending} onPress={() => vote('REJECT')} style={styles.flex} />
              </View>
              <Button label="It is a fake / cheat" variant="link" disabled={sending} onPress={() => vote('CHEAT')} />
            </>
          ) : (
            <Text variant="body" color="muted">{error ?? 'Loading…'}</Text>
          )}
          {item && error ? <Text variant="caption" color="muted">{error}</Text> : null}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: { gap: 14 },
  photo: { height: 320, overflow: 'hidden', borderRadius: radii.md, backgroundColor: colors.subtle },
  decide: { flexDirection: 'row', gap: 10 },
});
