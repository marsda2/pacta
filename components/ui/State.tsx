import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '@/lib/theme';

import { Banner } from './Feedback';
import { Button } from './Button';
import { Text } from './Text';

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.forest} />
      <Text variant="small" color="muted">{label}</Text>
    </View>
  );
}

const messages: Record<string, string> = {
  network_error: 'Can’t reach the server. Check your connection.',
  not_found: 'We couldn’t find that.',
  not_active: 'This pact is no longer active.',
  deadline_passed: 'The deadline has already passed.',
  not_in_review: 'This pact isn’t waiting for a verdict.',
  not_appealable: 'This proof can’t be appealed right now.',
  appeal_requires_pass: 'Human appeals are included in the High-Yield Pass.',
  no_more_attempts: 'You’ve already used your second try for this pact.',
  review_expired: 'The time to retry this proof has run out.',
  image_too_large: 'That photo is too large. Try again.',
  unsupported_image: 'That image format isn’t supported.',
  vault_locked: 'This tranche isn’t unlocked yet.',
  withdrawals_locked: 'Withdrawals are paused for 7 days after a confirmed cheat.',
  payout_failed: 'Whop couldn’t send the refund. Try again later.',
  already_pass: 'Your High-Yield Pass is already active.',
  insufficient_balance: 'Not enough balance. Add funds or pay by card.',
  bad_topup: 'Pick one of the top-up amounts.',
  nothing_to_withdraw: 'There’s nothing to withdraw yet.',
  bad_stake: 'That stake isn’t allowed for this payment method.',
  payments_not_configured: 'Payments aren’t set up yet.',
  bad_user_token: 'Your session expired. Sign in with Whop again.',
  whop_login_required: 'Sign in with Whop to continue.',
  login_expired: 'This sign-in link expired. Please sign in with Whop again.',
  login_cancelled: 'Sign-in cancelled. You can try again whenever you’re ready.',
  auth_unavailable: 'Whop sign-in is temporarily unavailable. Please try again.',
  auth_not_configured: 'Whop sign-in isn’t set up yet.',
  bad_redirect: 'Sign-in isn’t available at this address yet.',
};

export function errorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : '';
  return messages[code] ?? 'Something went wrong. Please try again.';
}

export function ErrorBanner({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <View style={styles.error}>
      <Banner tone="danger" icon="close" title={errorMessage(error)} />
      {onRetry ? <Button label="Try again" variant="outline" leadingIcon="retry" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  error: { gap: 10 },
});
