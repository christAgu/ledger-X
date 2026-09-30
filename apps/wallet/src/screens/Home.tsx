import { useCallback, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ArrowDownToLine, ArrowLeftRight, Bell, ChevronRight, QrCode, Send, Wallet } from 'lucide-react-native';
import { fonts, radius, spacing, type Palette, withAlpha } from '@/theme/tokens';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { useWalletStore } from '@/state/wallet';
import { ledgerx } from '@/services/ledgerx';
import { valueInXof } from '@/services/rates';
import type { Denom } from '@/services/ledgerx/types';
import { formatAmount, formatXof } from '@/utils/format';
import { AnimatedGradientBackdrop } from '@/components/AnimatedGradient';
import { TransactionRow } from '@/components/TransactionRow';
import { WalletCard } from '@/components/WalletCard';
import { AmountText, AssetRow, Button, Card, EyeToggle, PressableScale, QuickAction, Screen, Sheet, TextLabel } from '@/components/ui';

const denoms: Denom[] = ['aXOF', 'aEUR', 'aUSD', 'USDC', 'USDT', 'BTC', 'SOL'];

export default function Home() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [newCardOpen, setNewCardOpen] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  const balances = useWalletStore((state) => state.balances);
  const transactions = useWalletStore((state) => state.transactions);
  const virtualCard = useWalletStore((state) => state.card);
  const accountAddress = useWalletStore((state) => state.account?.address);
  const syncBalances = useWalletStore((state) => state.syncBalances);
  const { hideBalances, displayCurrency } = useWalletStore((state) => state.settings);
  const updateSettings = useWalletStore((state) => state.updateSettings);
  const tag = useWalletStore((state) => state.tag);
  const total = useMemo(() => denoms.reduce((sum, denom) => sum + valueInXof(balances[denom], denom), 0), [balances]);
  const cardWidth = Math.min(260, screenWidth * 0.64);
  const displayDenom: Denom = displayCurrency === 'EUR' ? 'aEUR' : displayCurrency === 'USD' ? 'aUSD' : 'aXOF';
  const displayTotal = displayCurrency === 'EUR' ? total / 655.957 : displayCurrency === 'USD' ? total / 600 : total;
  useFocusEffect(useCallback(() => {
    if (!accountAddress) return;
    let active = true;
    void ledgerx.getBalances(accountAddress)
      .then((partial) => { if (active) syncBalances(partial); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [accountAddress, syncBalances]));
  return (
    <Screen scroll gradient tabBarClearance style={styles.content}>
      <AnimatedGradientBackdrop height={380} />
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
        <TextLabel size={13} color={colors.textMuted}>
          {hideBalances ? '••••••' : displayCurrency === 'XOF' ? `≈ ${formatAmount(total / 655.957, 'aEUR')}` : `≈ ${formatXof(total)}`}
        </TextLabel>
        <View style={styles.gasBadge}><View style={styles.gasDot} /><TextLabel size={11} color={colors.success} weight={fonts.bodySemi}>Gasless · frais offerts</TextLabel></View>
      </View>

      <View style={styles.quickActions}>
        <QuickAction label="Recharger" icon={ArrowDownToLine} onPress={() => router.push('/deposit')} />
        <QuickAction label="Envoyer" icon={Send} onPress={() => router.push('/send')} />
        <QuickAction label="Recevoir" icon={QrCode} onPress={() => router.push('/receive')} />
        <QuickAction label="Retirer" icon={Wallet} onPress={() => router.push('/cashout')} />
        <QuickAction label="Convertir" icon={ArrowLeftRight} primary onPress={() => router.push('/convert')} />
      </View>

      <View style={styles.cardsSection}>
        <View style={styles.sectionHead}>
          <TextLabel size={18} weight={fonts.display}>Mes cartes</TextLabel>
          <PressableScale onPress={() => setNewCardOpen(true)} style={styles.addCardButton}>
            <TextLabel size={12} weight={fonts.bodySemi} color={colors.accent}>+ Ajouter</TextLabel>
          </PressableScale>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsScrollContent}
          style={styles.cardsScroll}
          snapToInterval={cardWidth + spacing(3)}
          snapToAlignment="start"
          decelerationRate="fast">
          <WalletCard
            variant="blue"
            label="Virtuelle"
            balance={hideBalances ? '••••••' : formatAmount(balances.aEUR, 'aEUR')}
            last4={virtualCard.pan.replace(/\D/g, '').slice(-4)}
            expiry={virtualCard.expiry}
            frozen={virtualCard.frozen}
            onPress={() => router.push('/card')}
            width={cardWidth}
          />
          <WalletCard
            variant="navy"
            label="Ajouter une carte"
            balance=""
            last4=""
            expiry=""
            empty
            onPress={() => setNewCardOpen(true)}
            width={cardWidth}
          />
        </ScrollView>
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
      <View style={styles.recentList}>
        {transactions.slice(0, 3).map((transaction, index) => (
          <TransactionRow key={transaction.id} item={transaction} index={index} />
        ))}
      </View>
      <Sheet visible={newCardOpen} title="Nouvelle carte" onClose={() => setNewCardOpen(false)}>
        <TextLabel size={13} color={colors.textMuted} style={styles.cardSheetText}>Cartes USD et carte physique : bientôt disponibles.</TextLabel>
        <Button onPress={() => setNewCardOpen(false)}>Compris</Button>
      </Sheet>
    </Screen>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  content: { paddingTop: spacing(1), gap: spacing(3) },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), zIndex: 1 },
  profileButton: { borderWidth: 1, borderColor: colors.border, padding: 2, borderRadius: 24 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  topIcon: { width: 38, height: 38, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  balanceHero: { paddingTop: spacing(4), paddingBottom: spacing(4), gap: spacing(1), zIndex: 1 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gasBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, backgroundColor: withAlpha(colors.success, 0.1), paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, marginTop: spacing(2) },
  gasDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing(1), zIndex: 1 },
  cardsSection: { gap: spacing(2) },
  addCardButton: { backgroundColor: colors.bgElevated, borderRadius: radius.pill, paddingHorizontal: spacing(3), paddingVertical: spacing(1.5) },
  cardsScroll: { marginHorizontal: -spacing(5) },
  cardsScrollContent: { paddingHorizontal: spacing(5), gap: spacing(3) },
  promo: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing(3), gap: spacing(2) },
  promoIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  promoCopy: { flex: 1, gap: 3 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing(1) },
  assetCard: { padding: spacing(2), paddingHorizontal: spacing(3) },
  recentList: { gap: 8 },
  cardSheetText: { marginBottom: spacing(3) },
});
