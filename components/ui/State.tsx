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
  image_too_large: 'That photo is too large. Try again.',
  unsupported_image: 'That image format isn’t supported.',
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
