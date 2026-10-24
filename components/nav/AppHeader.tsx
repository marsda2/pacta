import { Pressable, StyleSheet, View } from 'react-native';

import { PactaMark } from '@/components/brand/PactaLogo';
import { Icon, Text } from '@/components/ui';
import { colors, radii } from '@/lib/theme';

interface AppHeaderProps {
  title: string;
  onBellPress?: () => void;
  initial?: string;
}

export function AppHeader({ title, onBellPress, initial = 'M' }: AppHeaderProps) {
  return (
    <View style={styles.bar}>
      <PactaMark size={34} />
      <Text variant="heading" style={styles.title}>{title}</Text>
      <Pressable accessibilityLabel="Notifications" onPress={onBellPress} hitSlop={8}>
        <Icon name="notifications" size={22} />
      </Pressable>
      <View style={styles.avatar}>
        <Text variant="small" style={{ fontWeight: '800' }}>{initial}</Text>
      </View>
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
