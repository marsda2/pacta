import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button, ErrorBanner, LoadingBlock, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth/session';
import { routes } from '@/lib/routes';

export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; state?: string; error?: string }>();
  const { completeLogin } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<unknown>(null);
  const { code, state, error: oauthError } = params;

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ code: code || '', state: state || '', ...(oauthError ? { error: oauthError } : {}) });
    void completeLogin(`pacta://auth/callback?${query}`).then(() => {
      if (active) router.replace(routes.home);
    }).catch((e) => { if (active) setError(e); });
    return () => { active = false; };
  }, [code, state, oauthError, completeLogin, router]);

  return <Screen>{error ? <><ErrorBanner error={error} /><Button label="Back to welcome" onPress={() => router.replace(routes.onboarding)} /></> : <LoadingBlock label="Signing you in with Whop…" />}</Screen>;
}
