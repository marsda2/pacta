import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DesktopLanding } from '@/components/landing/DesktopLanding';
import { DesktopPreviewContext } from '@/components/landing/DesktopPreviewContext';
import { isDesktopPath, useIsDesktopWeb } from '@/lib/device';
import { PactsProvider } from '@/lib/store/pacts';
import { colors } from '@/lib/theme';

const PREVIEW_KEY = 'pacta.desktop-preview';

function readPreview() {
  try {
    return globalThis.sessionStorage?.getItem(PREVIEW_KEY) === '1';
  } catch {
    return false;
  }
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const desktop = useIsDesktopWeb();
  const pathname = usePathname();
  const [preview, setPreview] = useState(readPreview);

  const startPreview = () => {
    try {
      globalThis.sessionStorage?.setItem(PREVIEW_KEY, '1');
    } catch {
      // Sin almacenamiento: la vista previa dura hasta recargar.
    }
    setPreview(true);
  };

  const showLanding = desktop && !preview && !isDesktopPath(pathname);
  if (showLanding) {
    return (
      <DesktopPreviewContext.Provider value={startPreview}>
        <DesktopLanding onPreview={startPreview} />
      </DesktopPreviewContext.Provider>
    );
  }

  const stack = <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;

  // The public landing doesn't need to load the user's pacts or call the API.
  if (pathname === '/landing') {
    return <DesktopPreviewContext.Provider value={startPreview}>{stack}</DesktopPreviewContext.Provider>;
  }

  return (
    <DesktopPreviewContext.Provider value={startPreview}>
      <QueryClientProvider client={queryClient}>
        <PactsProvider>
          <StatusBar style="dark" />
          {desktop && !isDesktopPath(pathname) ? (
            // Vista previa en escritorio: la app dentro de un marco con ancho de móvil.
            <View style={styles.backdrop}>
              <View style={styles.frame}>{stack}</View>
            </View>
          ) : (
            stack
          )}
        </PactsProvider>
      </QueryClientProvider>
    </DesktopPreviewContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', backgroundColor: colors.mintSoft },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.bg,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
});
