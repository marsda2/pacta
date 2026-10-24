import { StyleSheet, Text, View } from 'react-native';

import { TRUST_START_SCORE, VAULT_APY_SIMULATED } from '@/lib/shared/rules';

const CARDS = [
  { title: 'Active Stake', body: 'Sin pactos activos' },
  {
    title: 'Frozen Redemption Vault',
    body: `$0.00 · rendimiento simulado ${(VAULT_APY_SIMULATED * 100).toFixed(2)}% APY`,
  },
  { title: 'Trust Score', body: `${TRUST_START_SCORE} / 100` },
];

export default function Dashboard() {
  return (
    <View style={styles.screen}>
      <Text style={styles.brand}>PACTA</Text>
      {CARDS.map((card) => (
        <View key={card.title} style={styles.card}>
          <Text style={styles.cardTitle}>{card.title}</Text>
          <Text style={styles.cardBody}>{card.body}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 16,
    gap: 12,
    paddingTop: 64,
    backgroundColor: '#0B0B0F',
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  card: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#17171F',
  },
  cardTitle: {
    color: '#9A9AAE',
    fontSize: 14,
    marginBottom: 6,
  },
  cardBody: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
