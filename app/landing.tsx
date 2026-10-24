import { Redirect, useRouter } from 'expo-router';
import { Platform } from 'react-native';

import { DesktopLanding } from '@/components/landing/DesktopLanding';
import { useDesktopPreview } from '@/components/landing/DesktopPreviewContext';

export default function LandingPage() {
  const router = useRouter();
  const startPreview = useDesktopPreview();

  if (Platform.OS !== 'web') return <Redirect href="/" />;

  return (
    <DesktopLanding onPreview={() => {
      startPreview();
      router.replace('/');
    }} />
  );
}
