import { useRouter } from 'expo-router';

import { PaxSays } from '@/components/companion/Pax';
import { CopilotPlanner } from '@/components/copilot/CopilotPlanner';
import { AppHeader } from '@/components/nav/AppHeader';
import { Screen } from '@/components/ui';
import { routes } from '@/lib/routes';
import { usePacts } from '@/lib/store/pacts';

export default function Copilot() {
  const router = useRouter();
  const { pacts, setFocusRemaining } = usePacts();
  const active = pacts.find((pact) => pact.status === 'progress');

  const start = (minutes: number) => {
    if (!active) {
      router.push(routes.newPact);
      return;
    }
    setFocusRemaining(active.id, minutes * 60);
    router.push(routes.pact(active.id, '?autostart=1'));
  };

  return (
    <Screen withTabBar>
      <AppHeader title="Copilot" />
      <PaxSays message="Tell me what’s in the way. We’ll shrink it together." />
      <CopilotPlanner onStart={start} />
    </Screen>
  );
}
