import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PactaMark } from '@/components/brand/PactaLogo';
import { Icon, Text } from '@/components/ui';
import { colors, radii } from '@/lib/theme';
import { useAuth } from '@/lib/auth/session';
import { routes } from '@/lib/routes';

interface AppHeaderProps {
  title: string;
  onBellPress?: () => void;
  initial?: string;
}

export function AppHeader({ title, onBellPress, initial }: AppHeaderProps) {
  const router = useRouter();
  const { user } = useAuth();
  const letter = initial || user?.name?.trim().charAt(0).toUpperCase() || 'P';
  return (
    <View style={styles.bar}>
      <PactaMark size={34} />
      <Text variant="heading" style={styles.title}>{title}</Text>
      <Pressable accessibilityLabel="Notifications" onPress={onBellPress} hitSlop={8}>
        <Icon name="notifications" size={22} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Open your profile" onPress={() => router.push(routes.profile)} style={styles.avatar} hitSlop={8}>
        <Text variant="small" style={{ fontWeight: '800' }}>{letter}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 14,
    paddingRight: 10,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { flex: 1 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.subtle,
  },
});
