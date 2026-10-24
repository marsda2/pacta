import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Share, StyleSheet, View } from 'react-native';

import { PaxSays } from '@/components/companion/Pax';
import { PactResultCard } from '@/components/pact/PactResultCard';
import { Banner, Button, Card, ErrorBanner, LoadingBlock, Screen, ScreenTitle, SectionLabel, Text } from '@/components/ui';
import { apiFetch } from '@/lib/api/client';
import { routes } from '@/lib/routes';
import { formatUsd } from '@/lib/shared/rules';
import { usePacts } from '@/lib/store/pacts';

export default function PactResult() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPact, loading } = usePacts();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [witnessUrl, setWitnessUrl] = useState<string | null>(null);
  const pact = getPact(id);

  const inviteWitness = async () => {
    setBusy(true);
    setError(null);
    try {
      const { path } = await apiFetch<{ path: string }>(`/api/pacts/${id}/witness-link`, { method: 'POST' });
      setWitnessUrl(`${Platform.OS === 'web' ? window.location.origin : 'https://pacta-theta.vercel.app'}${path}`);
    } catch (e) { setError(e); }
    finally { setBusy(false); }
  };
  const share = async () => {
    if (!witnessUrl) return;
    try { await Share.share({ message: `Would you review my PACTA proof? ${witnessUrl}` }); }
    catch { /* The selectable link below also works on browsers without sharing. */ }
  };

  if (!pact && loading) return <Screen><LoadingBlock /></Screen>;
  if (!pact) return <Screen><ScreenTitle title="Pact not found" onBack={() => router.replace(routes.home)} /></Screen>;

  const reviewing = pact.status === 'pending' || pact.status === 'progress' || pact.status === 'scheduled';
  const review = pact.review;
  const doubt = !!review && review.aiReviewed && !review.juryOpen;
  const missingCode = Boolean(review?.missingDayCode);
  const targetDays = pact.targetDays ?? 1;
  const completedDays = pact.completedDays ?? 0;
  const message = review?.juryOpen
    ? 'Your proof is waiting for the Terac jury. We’ll update your pact when the review is complete.'
    : doubt
      ? missingCode && pact.dayCode
        ? `We couldn’t detect the handwritten code "${pact.dayCode}" in your photo! Write "${pact.dayCode}" on a piece of paper, place it next to your task in the frame, and try again.`
        : review?.aiReason
          ? `I’m not sure about this photo: "${review.aiReason}" You can retake it, ask a witness, or appeal to a human.`
          : 'I’m not sure about this photo. You can retake it, ask a witness, or appeal to a human.'
      : targetDays > 1 && completedDays > 0 && pact.status === 'progress'
        ? `Day ${completedDays} of ${targetDays} verified! Keep going to complete your weekly pact.`
        : 'Your pact is still in progress. Open its details to see the next step.';

  return (
    <Screen>
      <ScreenTitle title={reviewing ? 'Reviewing your proof.' : pact.title} subtitle={reviewing ? pact.title : undefined} onBack={() => router.replace(routes.home)} />
      {reviewing ? (
        <>
          {doubt && missingCode && pact.dayCode ? (
            <Banner
              tone="danger"
              icon="close"
              title={`Missing handwritten code: ${pact.dayCode}`}
              subtitle={`Your photo must clearly show the code "${pact.dayCode}" written by hand on paper to prove the photo is live.`}
            />
          ) : null}
          <PaxSays message={message} expression={doubt ? 'worried' : 'talking'} />
          {pact.rawStatus === 'AI_REVIEW' ? (
            <Card style={styles.options}>
              <SectionLabel>Your options</SectionLabel>
              {review?.hoursLeft !== undefined ? <Text variant="small" color="muted">If nothing changes in {review.hoursLeft}h, your stake moves to your Vault.</Text> : null}
              {review?.canRetry ? (
                <Button
                  label={missingCode && pact.dayCode ? `Retake photo with code ${pact.dayCode}` : 'Retake the photo'}
                  icon="camera"
                  onPress={() => router.push(routes.proof(pact.id))}
                />
              ) : null}
              <Button label={busy ? 'Preparing invitation…' : 'Ask a witness'} icon="arrowRight" variant="mint" disabled={busy} onPress={inviteWitness} />
              {witnessUrl ? <View style={styles.options}><Text variant="small" color="muted">Send this private link to someone who can review your proof. It expires with this review.</Text><Text variant="caption" selectable>{witnessUrl}</Text><Button label="Share invitation" variant="outline" onPress={share} /></View> : null}
              {review?.canAppeal ? <Button label={review.appealBondCents ? `Appeal to a human panel · ${formatUsd(review.appealBondCents)} at stake` : 'Appeal to a human panel'} variant="outline" onPress={() => router.push(routes.appeal(pact.id))} /> : null}
              {error ? <ErrorBanner error={error} /> : null}
            </Card>
          ) : null}
          <Button label="View pact details" variant="outline" onPress={() => router.push(routes.pact(pact.id))} />
        </>
      ) : (
        <View style={styles.result}>
          <PactResultCard pact={pact} onPlanNext={() => router.replace(routes.newPact)} onViewDetails={() => router.push(routes.pact(pact.id))} />
          <Button label="Back to my pacts" variant="link" onPress={() => router.replace(routes.pacts)} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ options: { gap: 12 }, result: { gap: 16 } });
