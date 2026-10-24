import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PactaLogo } from '@/components/brand/PactaLogo';
import { Banner, Button, Card, ErrorBanner, LoadingBlock, Screen, Text } from '@/components/ui';
import { apiBase, apiFetch } from '@/lib/api/client';
import { routes } from '@/lib/routes';
import { colors, radii } from '@/lib/theme';

interface Review { title: string; dayCode: string; photoUrl?: string; closed: boolean }

// A signed, expiring invitation grants access only to this proof, without an account.
export default function WitnessReview() {
  const router = useRouter();
  const { id, token } = useLocalSearchParams<{ id: string; token?: string }>();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const review = useQuery({
    queryKey: ['witness', id, token],
    queryFn: () => apiFetch<Review>(`/api/pacts/${id}/witness?token=${encodeURIComponent(token || '')}`),
    enabled: !!token && !!id,
    retry: false,
  });
  const decide = async (kept: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/pacts/${id}/witness-vote`, { method: 'POST', body: { token, kept } });
      setSent(true);
    } catch (e) { setError(e); }
    finally { setBusy(false); }
  };

  return (
    <Screen>
      <View style={styles.brand}><PactaLogo size={30} /><Text variant="eyebrow" color="muted">Guest review</Text></View>
      {!token ? <ErrorBanner error={new Error('witness_link_required')} /> : null}
      {review.isLoading ? <LoadingBlock label="Opening the witness invitation…" /> : null}
      {review.error ? <ErrorBanner error={review.error} /> : null}
      {sent ? <Banner tone="success" icon="check" title="Review saved" subtitle="Thank you for being their witness. You can close this page." /> : review.data?.closed ? <Banner title="This review is closed" subtitle="The pact has already moved on. Your invitation can’t change its result." /> : review.data ? (
        <Card style={styles.card}>
          <Text variant="title">Did they keep this pact?</Text>
          <Text variant="bodyStrong">{review.data.title}</Text>
          <Text variant="body" color="muted">Look for the habit and this handwritten daily code: {review.data.dayCode}</Text>
          {review.data.photoUrl ? <View style={styles.photo}><Image source={{ uri: `${apiBase()}${review.data.photoUrl}` }} style={StyleSheet.absoluteFill} contentFit="contain" /></View> : <Text variant="body" color="muted">No photo is attached. Only approve if you personally witnessed the task.</Text>}
          <Text variant="small" color="muted">Your decision affects this pact’s stake and Trust Score. Review the evidence before deciding.</Text>
          <View style={styles.decide}>
            <Button label="Approve" leadingIcon="check" fullWidth={false} disabled={busy} onPress={() => decide(true)} style={styles.flex} />
            <Button label="Reject" variant="outline" leadingIcon="close" fullWidth={false} disabled={busy} onPress={() => decide(false)} style={styles.flex} />
          </View>
          {error ? <ErrorBanner error={error} /> : null}
          <Text variant="caption" color="muted">No account needed. This invitation only opens this proof.</Text>
        </Card>
      ) : null}
      <Button label="Discover PACTA" variant="link" onPress={() => router.push(routes.onboarding)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: { gap: 14 },
  photo: { height: 300, overflow: 'hidden', borderRadius: radii.md, backgroundColor: colors.subtle },
  decide: { flexDirection: 'row', gap: 10 },
});
