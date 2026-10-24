import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, ErrorBanner, Icon, Screen, ScreenTitle, Text } from '@/components/ui';
import { useAuth } from '@/lib/auth/session';
import { routes } from '@/lib/routes';
import { colors } from '@/lib/theme';

export default function Profile() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const logout = async () => {
    setBusy(true);
    try { await signOut(); }
    catch (e) { setError(e); setBusy(false); }
  };
  return (
    <Screen>
      <ScreenTitle title="Your profile" onBack={() => router.canGoBack() ? router.back() : router.replace(routes.home)} />
      <Card style={styles.identity}>
        <View style={styles.avatar}><Icon name="user" size={28} /></View>
        <Text variant="title">{user?.name}</Text>
        {user?.email ? <Text variant="body" color="muted">{user.email}</Text> : null}
        <Text variant="caption" color="muted">Connected with Whop</Text>
      </Card>
      <Button label="Your balance" leadingIcon="wallet" variant="outline" onPress={() => router.push(routes.wallet)} />
      <Button label="How PACTA works" variant="link" onPress={() => router.push(routes.onboarding)} />
      <Text variant="small" color="muted">Your pacts, balance and Vault stay with your Whop account when you sign out.</Text>
      {error ? <ErrorBanner error={error} /> : null}
      <Button label={busy ? 'Signing out…' : 'Sign out'} variant="outline" disabled={busy} onPress={logout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  avatar: { height: 64, width: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mintWash },
});
