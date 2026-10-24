import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, Card, ErrorBanner, GlassCard, Icon, LoadingBlock, Screen, ScreenTitle, SectionLabel, Text, type IconName } from '@/components/ui';
import { routes } from '@/lib/routes';
import { formatUsd, VAULT_UNLOCK_MIN_TRUST, VAULT_UNLOCK_VERIFIED_STREAK } from '@/lib/shared/rules';
import type { RedeemResultDto, VaultEntryDto } from '@/lib/shared/types';
import { formatYieldUsd, PASS_PRICE_CENTS, unlockHint, VAULT_FREE_FEE_RATE } from '@/lib/shared/vault';
import { useVault } from '@/lib/store/vault';
import { colors, radii } from '@/lib/theme';

const ENTRY: Record<VaultEntryDto['type'], { icon: IconName; label: (e: VaultEntryDto) => string; sign: '+' | '−' }> = {
  lock: { icon: 'lock', label: (e) => (e.pactTitle ? `Locked from “${e.pactTitle}”` : 'Locked stake'), sign: '+' },
  unlock: { icon: 'wallet', label: (e) => (e.whopRef ? 'Returned to you · Whop refund' : 'Returned to you'), sign: '−' },
  fee: { icon: 'pacts', label: () => `PACTA fee (${VAULT_FREE_FEE_RATE * 100}%, Free plan)`, sign: '−' },
  yield: { icon: 'progress', label: () => 'Simulated yield credited', sign: '+' },
};

// Redemption Vault (docs/01): el dinero de los pactos fallados, su rendimiento simulado y el
// desbloqueo por tramos al recuperar la confianza.
export default function Vault() {
  const router = useRouter();
  const { vault, loading, error, refetch, redeem, pass } = useVault();
  const [redeemed, setRedeemed] = useState<RedeemResultDto | null>(null);
  const [passOpened, setPassOpened] = useState(false);

  const back = () => (router.canGoBack() ? router.back() : router.replace(routes.home));

  if (!vault) {
    return (
      <Screen>
        <ScreenTitle title="Redemption Vault" onBack={back} />
        {loading ? <LoadingBlock /> : <ErrorBanner error={error} onRetry={refetch} />}
      </Screen>
    );
  }

  const { unlock } = vault;
  const isPass = vault.tier === 'high_yield';

  // Los errores los muestran redeem.error y pass.error.
  const unlockTranche = () => {
    setRedeemed(null);
    redeem.mutate(undefined, { onSuccess: setRedeemed });
  };
  const buyPass = () => pass.mutate(undefined, { onSuccess: (outcome) => setPassOpened(outcome !== 'cancelled') });

  return (
    <Screen>
      <ScreenTitle title="Redemption Vault" subtitle="Your money isn’t lost. It waits for you." onBack={back} />

      <GlassCard style={styles.block}>
        <SectionLabel>Frozen balance</SectionLabel>
        <Text variant="display">{formatUsd(vault.balanceCents)}</Text>
        <Text variant="bodyStrong" color="verified">
          + {formatYieldUsd(vault.yieldCents)} yield · {(vault.apy * 100).toFixed(2)}% APY
        </Text>
        <Text variant="caption" color="muted">
          Simulated yield (+{formatYieldUsd(vault.dailyYieldCents)} a day). PACTA doesn’t invest your money.
        </Text>
      </GlassCard>

      <Card style={styles.block}>
        <SectionLabel>Next tranche</SectionLabel>
        <Progress
          label="Trust Score"
          value={vault.trustScore}
          goal={VAULT_UNLOCK_MIN_TRUST}
          done={unlock.trustNeeded === 0}
        />
        <Progress
          label="Verified pacts in a row"
          value={Math.min(vault.verifiedSinceReset, VAULT_UNLOCK_VERIFIED_STREAK)}
          goal={VAULT_UNLOCK_VERIFIED_STREAK}
          done={unlock.pactsNeeded === 0}
        />
        <Text variant="small" color="muted">{unlockHint(unlock, formatUsd)}</Text>

        {redeem.error ? <ErrorBanner error={redeem.error} /> : null}
        {redeemed ? (
          <Banner
            title={`${formatUsd(redeemed.payoutCents)} unlocked`}
            subtitle={
              redeemed.method === 'whop'
                ? 'Refunded through Whop to the card you paid with.'
                : 'Recorded in your Vault ledger (these stakes had no Whop payment).'
            }
          />
        ) : null}
        <Button
          label={redeem.isPending ? 'Unlocking…' : `Unlock ${formatUsd(unlock.eligible ? unlock.payoutCents : unlock.trancheCents)}`}
          icon="lock"
          disabled={!unlock.eligible || redeem.isPending}
          onPress={unlockTranche}
        />
        {unlock.trancheCents > 0 ? (
          <Text variant="caption" color="muted" style={styles.center}>
            {isPass
              ? `High-Yield Pass: you get 100%${unlock.yieldCents > 0 ? ` plus ${formatYieldUsd(unlock.yieldCents)} simulated yield` : ''}.`
              : `Free plan: you get ${formatUsd(unlock.payoutCents)}. PACTA keeps ${formatUsd(unlock.feeCents)} (${VAULT_FREE_FEE_RATE * 100}%).`}
          </Text>
        ) : null}
      </Card>

      <Card style={styles.block}>
        <SectionLabel>Your plan</SectionLabel>
        <PlanRow title="Free" detail={`Get back ${100 - VAULT_FREE_FEE_RATE * 100}% of each tranche. No yield.`} active={!isPass} />
        <PlanRow
          title={`High-Yield Pass · ${formatUsd(PASS_PRICE_CENTS)}/mo`}
          detail="Get back 100% plus the simulated yield. 2 human appeals a month."
          active={isPass}
        />
        {isPass ? null : (
          <>
            {pass.error ? <ErrorBanner error={pass.error} /> : null}
            {passOpened ? (
              <Banner tone="info" icon="wallet" title="Finish the payment in Whop" subtitle="Your plan switches as soon as Whop confirms it." />
            ) : null}
            <Button
              label={pass.isPending ? 'Opening Whop…' : `Get the Pass · ${formatUsd(PASS_PRICE_CENTS)}/mo`}
              variant="mint"
              icon="arrowRight"
              disabled={pass.isPending}
              onPress={buyPass}
            />
          </>
        )}
      </Card>

      <View style={styles.block}>
        <SectionLabel>History</SectionLabel>
        {vault.entries.length === 0 ? (
          <Text variant="small" color="muted">Nothing here yet. Missed stakes land here instead of disappearing.</Text>
        ) : (
          vault.entries.map((entry) => {
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
                  {entry.type === 'yield' ? formatYieldUsd(entry.amountCents) : formatUsd(entry.amountCents)}
                </Text>
              </Card>
            );
          })
        )}
      </View>
    </Screen>
  );
}

function Progress({ label, value, goal, done }: { label: string; value: number; goal: number; done: boolean }) {
  return (
    <View style={styles.progress}>
      <View style={styles.progressLabel}>
        <Text variant="small">{label}</Text>
        <Text variant="small" color={done ? 'verified' : 'muted'}>
          {value} / {goal}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(100, (value / goal) * 100)}%` }, done && styles.fillDone]} />
      </View>
    </View>
  );
}

function PlanRow({ title, detail, active }: { title: string; detail: string; active: boolean }) {
  return (
    <View style={[styles.plan, active && styles.planActive]}>
      <View style={styles.flex}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="caption" color="muted">{detail}</Text>
      </View>
      {active ? <Text variant="caption" color="verified">Current</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  block: { gap: 10 },
  center: { textAlign: 'center' },
  progress: { gap: 6 },
  progressLabel: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.disabledBg, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: colors.mint },
  fillDone: { backgroundColor: colors.status.verified },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planActive: { borderColor: colors.mint, backgroundColor: colors.mintWash },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
