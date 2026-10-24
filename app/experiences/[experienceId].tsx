import { Redirect } from 'expo-router';
import { useState } from 'react';

import { LoadingBlock, Screen } from '@/components/ui';
import { routes } from '@/lib/routes';
import { usePacts } from '@/lib/store/pacts';
import { rememberInsideWhop } from '@/lib/whop';

// Entrada desde Whop: la vista de experiencia de la app apunta a /experiences/[experienceId]
// (docs/03 §2). El usuario llega con su token de Whop; si aún no tiene pactos, al onboarding.
export default function WhopExperience() {
  useState(rememberInsideWhop);
  const { pacts, loading } = usePacts();

  if (loading) {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  }
  return <Redirect href={pacts.length === 0 ? routes.onboarding : routes.home} />;
}
