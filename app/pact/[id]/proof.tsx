import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LiveCapture, type Capture } from '@/components/pact/LiveCapture';
import { Button, Icon, Screen, ScreenTitle, Text } from '@/components/ui';
import { routes } from '@/lib/routes';
import { usePacts } from '@/lib/store/pacts';
import { colors, radii } from '@/lib/theme';

// Flujo 03 · Live proof
export default function LiveProof() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPact, submitProof } = usePacts();
  const [capture, setCapture] = useState<Capture | null>(null);
  const pact = getPact(id);

  const submit = () => {
    if (!pact) return;
    submitProof(pact.id, capture?.uri);
    router.replace(routes.result(pact.id));
  };

  return (
    <Screen>
      <ScreenTitle title="Show your progress." subtitle={pact?.title} onBack={() => router.back()} />

      <View style={styles.tag}>
        <Icon name="camera" size={18} />
        <Text variant="bodyStrong">Live photo</Text>
      </View>

      <LiveCapture capture={capture} onChange={setCapture} />

      <View style={styles.actions}>
        <Button label="Use this photo" icon="arrowRight" disabled={!capture} onPress={submit} />
        <Text variant="caption" color="muted" style={styles.next}>Next: review and submit.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  actions: { gap: 8 },
  next: { textAlign: 'center' },
});
