import { Redirect, useRouter } from 'expo-router';
import { Platform } from 'react-native';

import { DesktopLanding } from '@/components/landing/DesktopLanding';
import { useAuth } from '@/lib/auth/session';
import { routes } from '@/lib/routes';

export default function LandingPage() {
  const router = useRouter();
  const { user } = useAuth();

  if (Platform.OS !== 'web') return <Redirect href="/" />;

  return (
    <DesktopLanding onPreview={() => {
      router.replace(user ? routes.home : routes.onboarding);
    }} />
  );
}
