import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { PaxSays } from '@/components/companion/Pax';
import { AppHeader } from '@/components/nav/AppHeader';
import { PactCard } from '@/components/pact/PactCard';
import { Button, ErrorBanner, LoadingBlock, Screen, Segmented, type SegmentOption } from '@/components/ui';
import { routes } from '@/lib/routes';
import type { PactUiStatus } from '@/lib/shared/types';
import { usePacts } from '@/lib/store/pacts';

type Tab = 'today' | 'upcoming' | 'completed';

const tabs: SegmentOption<Tab>[] = [
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
];

const byTab: Record<Tab, PactUiStatus[]> = {
  today: ['progress', 'pending'],
  upcoming: ['scheduled'],
  completed: ['verified', 'missed'],
};

const emptyCopy: Record<Tab, string> = {
  today: 'Nothing due today. A small pact is a good place to start.',
  upcoming: 'No pacts scheduled yet.',
  completed: 'Your finished pacts will show up here.',
};

export default function Pacts() {
  const router = useRouter();
  const { pacts, loading, error, refetch } = usePacts();
  const [tab, setTab] = useState<Tab>('today');
  const list = pacts.filter((pact) => byTab[tab].includes(pact.status));

  return (
    <Screen withTabBar>
      <AppHeader title="My pacts" />
      <Segmented options={tabs} value={tab} onChange={setTab} />

      {error ? <ErrorBanner error={error} onRetry={refetch} /> : null}
      {loading ? <LoadingBlock /> : null}
      {!loading && !error && list.length === 0 ? <PaxSays message={emptyCopy[tab]} expression="idle" /> : null}
      {list.map((pact) => (
        <PactCard
          key={pact.id}
          pact={pact}
          onPress={() => router.push(pact.status === 'verified' || pact.status === 'missed' ? routes.result(pact.id) : routes.pact(pact.id))}
        />
      ))}

      <View>
        <Button label="Create a pact" icon="arrowRight" onPress={() => router.push(routes.newPact)} />
      </View>
    </Screen>
  );
}
