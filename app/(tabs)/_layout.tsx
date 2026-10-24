import { Tabs } from 'expo-router/js-tabs';

import { BottomTabBar } from '@/components/nav/BottomTabBar';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <BottomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="pacts" options={{ title: 'Pacts' }} />
      <Tabs.Screen name="copilot" options={{ title: 'Pax' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
    </Tabs>
  );
}
