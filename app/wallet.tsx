import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, Card, ErrorBanner, GlassCard, Icon, LoadingBlock, Screen, ScreenTitle, SectionLabel, StakeChips, Text, type IconName } from '@/components/ui';
import { routes } from '@/lib/routes';
import { CREDIT_STAKE_MIN_CENTS, formatUsd, TOPUP_PRESETS_CENTS } from '@/lib/shared/rules';
import type { WalletEntryDto, WithdrawResultDto } from '@/lib/shared/types';
import { useWallet } from '@/lib/store/wallet';
import { colors } from '@/lib/theme';

const ENTRY: Record<WalletEntryDto['type'], { icon: IconName; label: (e: WalletEntryDto) => string; sign: '+' | '−' }> = {
  topup: { icon: 'wallet', label: () => 'Top-up through Whop', sign: '+' },
  hold: { icon: 'lock', label: (e) => (e.pactTitle ? `Staked on “${e.pactTitle}”` : 'Staked on a pact'), sign: '−' },
  release: { icon: 'check', label: (e) => (e.pactTitle ? `Kept “${e.pactTitle}”` : 'Pact kept'), sign: '+' },
  vault_unlock: { icon: 'progress', label: () => 'Unlocked from your Vault', sign: '+' },
  withdraw: { icon: 'arrowRight', label: () => 'Withdrawn to your card', sign: '−' },
};

// Saldo prepagado (docs/01): recargas una vez en Whop y pagas los pactos desde $1, sin comisión por
// pacto. Un pacto cumplido devuelve el stake aquí al momento.
export default function Wallet() {
  const router = useRouter();
  const { wallet, loading, error, refetch, topup, withdraw } = useWallet();
  const [amount, setAmount] = useState<number>(TOPUP_PRESETS_CENTS[1]);
  const [opened, setOpened] = useState(false);
  const [withdrawn, setWithdrawn] = useState<WithdrawResultDto | null>(null);

  const back = () => (router.canGoBack() ? router.back() : router.replace(routes.home));

  if (!wallet) {
    return (
      <Screen>
        <ScreenTitle title="Balance" onBack={back} />
        {loading ? <LoadingBlock /> : <ErrorBanner error={error} onRetry={refetch} />}
      </Screen>
    );
  }

  // Los errores los muestran topup.error y withdraw.error.
  const addFunds = () => topup.mutate(amount, { onSuccess: (outcome) => setOpened(outcome !== 'cancelled') });
  const cashOut = () => {
    setWithdrawn(null);
    withdraw.mutate(undefined, { onSuccess: setWithdrawn });
  };

  return (
    <Screen>
      <ScreenTitle title="Balance" subtitle={`Stake from ${formatUsd(CREDIT_STAKE_MIN_CENTS)}. No fee per pact.`} onBack={back} />

      <GlassCard style={styles.block}>
        <SectionLabel>Available</SectionLabel>
        <Text variant="display">{formatUsd(wallet.balanceCents)}</Text>
        {wallet.heldCents > 0 ? (
          <Text variant="small" color="muted">{formatUsd(wallet.heldCents)} staked on open pacts comes back here when you keep them.</Text>
        ) : (
          <Text variant="small" color="muted">Keep a pact and its stake comes back here instantly.</Text>
        )}
      </GlassCard>

      <Card style={styles.block}>
        <SectionLabel>Add funds</SectionLabel>
        <StakeChips presets={TOPUP_PRESETS_CENTS} cents={amount} onChange={setAmount} />
        {topup.error ? <ErrorBanner error={topup.error} /> : null}
        {opened ? (
          <Banner tone="info" icon="wallet" title="Finish the payment in Whop" subtitle="Your balance updates as soon as Whop confirms it." />
        ) : null}
        <Button
          label={topup.isPending ? 'Opening Whop…' : `Add ${formatUsd(amount)}`}
          icon="arrowRight"
          disabled={topup.isPending}
          onPress={addFunds}
        />
        <Text variant="caption" color="muted" style={styles.center}>
          One Whop payment for many pacts, instead of one per pact.
        </Text>
      </Card>

      <Card style={styles.block}>
        <SectionLabel>Withdraw</SectionLabel>
        {withdraw.error ? <ErrorBanner error={withdraw.error} /> : null}
        {withdrawn ? (
          <Banner
            title={`${formatUsd(withdrawn.withdrawnCents)} withdrawn`}
            subtitle={withdrawn.method === 'whop' ? 'Refunded through Whop to the card you topped up with.' : 'Recorded in your ledger (demo top-ups had no Whop payment).'}
          />
        ) : null}
        <Button
          label={withdraw.isPending ? 'Withdrawing…' : `Withdraw ${formatUsd(wallet.balanceCents)}`}
          variant="outline"
          disabled={wallet.balanceCents <= 0 || withdraw.isPending}
          onPress={cashOut}
        />
        <Text variant="caption" color="muted" style={styles.center}>
          Your full balance goes back to the card you topped up with.
        </Text>
      </Card>

      <View style={styles.block}>
        <SectionLabel>History</SectionLabel>
        {wallet.entries.length === 0 ? (
          <Text variant="small" color="muted">No movements yet. Add funds to stake from {formatUsd(CREDIT_STAKE_MIN_CENTS)}.</Text>
        ) : (
          wallet.entries.map((entry) => {
            const meta = ENTRY[entry.type];
            return (
              <Card key={entry.id} padding={14} style={styles.entry}>
                <Icon name={meta.icon} size={18} color={colors.muted} />
                <View style={styles.flex}>
                  <Text variant="bodyStrong">{meta.label(entry)}</Text>
                  <Text variant="caption" color="muted">{new Date(entry.at).toLocaleDateString()}</Text>
                </View>
                <Text variant="bodyStrong" color={meta.sign === '+' ? 'text' : 'muted'}>
                  {meta.sign}
                  {formatUsd(entry.amountCents)}
                </Text>
              </Card>
            );
          })
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  block: { gap: 10 },
  center: { textAlign: 'center' },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
