import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { LoadingBlock, Screen } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth/session';
import { isDesktopPath, useIsDesktopWeb } from '@/lib/device';
import { PactsProvider } from '@/lib/store/pacts';
import { colors } from '@/lib/theme';

// Each account gets its own data layer. Late responses only update the discarded cache.
function AccountData({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));
  useEffect(() => () => { void client.cancelQueries(); client.clear(); }, [client]);
  return <QueryClientProvider client={client}><PactsProvider>{children}</PactsProvider></QueryClientProvider>;
}

function Navigator() {
  const { user, loading } = useAuth();
  const desktop = useIsDesktopWeb();
  const pathname = usePathname();
  if (loading) return <Screen><LoadingBlock label="Opening PACTA…" /></Screen>;

  const stack = (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="auth/callback" />
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="pact" />
        <Stack.Screen name="vault" />
        <Stack.Screen name="wallet" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="experiences/[experienceId]" />
      </Stack.Protected>
    </Stack>
  );
  return (
    <AccountData key={user?.id ?? 'guest'}>
      <StatusBar style="dark" />
      {desktop && !isDesktopPath(pathname) ? <View style={styles.backdrop}><View style={styles.frame}>{stack}</View></View> : stack}
    </AccountData>
  );
}

export default function RootLayout() {
  return <AuthProvider><Navigator /></AuthProvider>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', backgroundColor: colors.mintSoft },
  frame: { flex: 1, width: '100%', maxWidth: 440, backgroundColor: colors.bg, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
});
