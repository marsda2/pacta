import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Icon, Text } from '@/components/ui';
import { formatUsd, VAULT_APY_SIMULATED } from '@/lib/shared/rules';
import type { VaultDto } from '@/lib/shared/types';
import { formatYieldUsd, unlockHint } from '@/lib/shared/vault';
import { colors, radii } from '@/lib/theme';

interface VaultCardProps {
  vault?: VaultDto;
  // Saldo del resumen de pactos mientras llega /api/vault/summary.
  fallbackCents: number;
  onPress: () => void;
}

// Tarjeta "Frozen Redemption Vault" (docs/01): saldo, rendimiento simulado y lo que falta para
// desbloquear el siguiente tramo. Abre la pantalla del Vault.
export function VaultCard({ vault, fallbackCents, onPress }: VaultCardProps) {
  const balance = vault?.balanceCents ?? fallbackCents;
  const hint = vault
    ? balance > 0
      ? `You haven’t lost your ${formatUsd(balance)}. ${unlockHint(vault.unlock, formatUsd)}`
      : 'Empty. A missed stake waits here instead of disappearing.'
    : `${(VAULT_APY_SIMULATED * 100).toFixed(2)}% APY simulated`;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Open your Redemption Vault" onPress={onPress}>
      <Card padding={18} style={styles.card}>
        <View style={styles.row}>
          <View style={styles.icon}>
            <Icon name="wallet" size={20} />
          </View>
          <View style={styles.flex}>
            <Text variant="caption" color="muted">Frozen Redemption Vault</Text>
            <Text variant="title">
              {formatUsd(balance)}
              {vault && vault.yieldCents > 0 ? <Text variant="small" color="verified">{`  + ${formatYieldUsd(vault.yieldCents)} yield`}</Text> : null}
            </Text>
          </View>
          <Icon name="chevronRight" size={20} color={colors.muted} />
        </View>
        <Text variant="small" color="muted">{hint}</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mintSoft,
  },
  flex: { flex: 1 },
});
