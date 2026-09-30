import { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Activity, ArrowDownToLine, ArrowLeftRight, Bell, ChevronRight, QrCode, Send, Wallet } from 'lucide-react-native';
import { colors, fonts, radius, spacing } from '@/theme/tokens';
import { useWalletStore } from '@/state/wallet';
import { valueInXof } from '@/services/rates';
import type { Denom } from '@/services/ledgerx/types';
import { formatAmount, formatXof } from '@/utils/format';
import { AmountText, AssetRow, Card, EyeToggle, PressableScale, QuickAction, Screen, TextLabel } from '@/components/ui';

const denoms: Denom[] = ['aXOF', 'aEUR', 'aUSD', 'USDC', 'USDT', 'BTC', 'SOL'];

export default function Home() {
  const balances = useWalletStore((state) => state.balances);
  const transactions = useWalletStore((state) => state.transactions);
  const { hideBalances, displayCurrency } = useWalletStore((state) => state.settings);
  const updateSettings = useWalletStore((state) => state.updateSettings);
  const tag = useWalletStore((state) => state.tag);
  const total = useMemo(() => denoms.reduce((sum, denom) => sum + valueInXof(balances[denom], denom), 0), [balances]);
  const displayDenom: Denom = displayCurrency === 'EUR' ? 'aEUR' : displayCurrency === 'USD' ? 'aUSD' : 'aXOF';
  const displayTotal = displayCurrency === 'EUR' ? total / 655.957 : displayCurrency === 'USD' ? total / 600 : total;
  return (
    <Screen scroll gradient style={styles.content}>
      <View style={styles.header}>
        <PressableScale onPress={() => router.push('/profile')} style={styles.profileButton}>
          <Image source={require('@/assets/brand/avatar-acxa-preview.png')} style={styles.avatar} />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <TextLabel size={11} color={colors.textDim}>BONJOUR,</TextLabel>
          <TextLabel size={14} weight={fonts.bodySemi}>@{tag || 'amina'}</TextLabel>
        </View>
        <PressableScale onPress={() => router.push({ pathname: '/receive', params: { rail: 'Ledger X' } })} style={styles.topIcon}><QrCode color={colors.textMuted} size={19} /></PressableScale>
        <PressableScale style={styles.topIcon}><Bell color={colors.textMuted} size={19} /></PressableScale>
      </View>

      <View style={styles.balanceHero}>
        <View style={styles.heroTop}>
          <TextLabel size={13} color={colors.textMuted}>Solde total estimé</TextLabel>
          <EyeToggle hidden={hideBalances} onPress={() => updateSettings({ hideBalances: !hideBalances })} />
        </View>
        <AmountText value={displayTotal} denom={displayDenom} hidden={hideBalances} size={34} />
        <TextLabel size={13} color={colors.textMuted}>{hideBalances ? '••••••' : `≈ ${formatXof(total)}`} en XOF</TextLabel>
        <View style={styles.gasBadge}><View style={styles.gasDot} /><TextLabel size={11} color={colors.success} weight={fonts.bodySemi}>Gasless · frais offerts</TextLabel></View>
      </View>

      <View style={styles.quickActions}>
        <QuickAction label="Recharger" icon={ArrowDownToLine} onPress={() => router.push('/deposit')} />
        <QuickAction label="Envoyer" icon={Send} onPress={() => router.push('/send')} />
        <QuickAction label="Recevoir" icon={QrCode} onPress={() => router.push('/receive')} />
        <QuickAction label="Retirer" icon={Wallet} onPress={() => router.push('/cashout')} />
        <QuickAction label="Convertir" icon={ArrowLeftRight} primary onPress={() => router.push('/convert')} />
      </View>

      <PressableScale onPress={() => router.push('/receive')} style={styles.promo}>
        <View style={styles.promoIcon}><TextLabel size={20} weight={fonts.displayBold} color={colors.accent}>€$</TextLabel></View>
        <View style={styles.promoCopy}>
          <TextLabel size={14} weight={fonts.bodySemi}>Recevez des euros et dollars</TextLabel>
          <TextLabel size={12} color={colors.textMuted}>Vos coordonnées bancaires internationales</TextLabel>
        </View>
        <ChevronRight color={colors.accent} size={20} />
      </PressableScale>

      <View style={styles.sectionHead}>
        <TextLabel size={18} weight={fonts.display}>Mes actifs</TextLabel>
        <PressableScale onPress={() => router.push('/activity')}><TextLabel size={12} color={colors.accent}>Voir tout</TextLabel></PressableScale>
      </View>
      <Card style={styles.assetCard}>
        {denoms.map((denom, index) => (
          <AssetRow
            key={denom}
            index={index}
            denom={denom}
            balance={balances[denom]}
            fiat={`≈ ${formatXof(valueInXof(balances[denom], denom))}`}
            hidden={hideBalances}
            onPress={() => router.push('/activity')}
          />
        ))}
      </Card>

      <View style={styles.sectionHead}>
        <TextLabel size={18} weight={fonts.display}>Activité récente</TextLabel>
        <PressableScale onPress={() => router.push('/activity')}><TextLabel size={12} color={colors.accent}>Tout voir</TextLabel></PressableScale>
      </View>
      <Card style={styles.recentCard}>
        {transactions.slice(0, 3).map((transaction) => (
          <View key={transaction.id} style={styles.recentRow}>
            <View style={styles.recentIcon}><Activity size={17} color={colors.accent} /></View>
            <View style={{ flex: 1, gap: 4 }}>
              <TextLabel size={13} weight={fonts.bodySemi}>{transaction.title}</TextLabel>
              <TextLabel size={11} color={colors.textDim}>{new Date(transaction.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</TextLabel>
            </View>
            <TextLabel size={13} weight={fonts.bodySemi} color={transaction.amount > 0 ? colors.success : colors.text}>
              {transaction.amount > 0 ? '+' : ''}{formatAmount(transaction.amount, transaction.denom)}
            </TextLabel>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing(1), gap: spacing(3) },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  profileButton: { borderWidth: 1, borderColor: colors.border, padding: 2, borderRadius: 24 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  topIcon: { width: 38, height: 38, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(14,34,70,.75)' },
  balanceHero: { paddingTop: spacing(4), paddingBottom: spacing(4), gap: spacing(1) },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gasBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, backgroundColor: 'rgba(61,220,151,.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, marginTop: spacing(2) },
  gasDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing(1) },
  promo: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing(3), gap: spacing(2) },
  promoIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  promoCopy: { flex: 1, gap: 3 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing(1) },
  assetCard: { padding: spacing(2), paddingHorizontal: spacing(3) },
  recentCard: { padding: spacing(3) },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingVertical: spacing(2), borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  recentIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
