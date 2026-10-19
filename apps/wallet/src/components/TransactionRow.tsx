import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { ArrowDownToLine, ArrowLeftRight, ArrowUpRight, CreditCard, QrCode, type LucideIcon } from 'lucide-react-native';
import type { Merchant, MerchantBrand, MerchantCategory, TransactionType, WalletTransaction } from '@/state/wallet';
import { fonts, radius, type Palette, withAlpha } from '@/theme/tokens';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { formatAmount } from '@/utils/format';
import { PressableScale, TextLabel } from '@/components/ui';

const icons: Record<TransactionType, LucideIcon> = {
  deposit: ArrowDownToLine,
  send: ArrowUpRight,
  receive: QrCode,
  cashout: ArrowUpRight,
  convert: ArrowLeftRight,
  card: CreditCard,
};

export function getTransactionAppearance(type: TransactionType, colors: Palette) {
  const cardTint = colors.text === '#FFFFFF' ? '#9FC4FF' : colors.accent;
  const tones: Record<TransactionType, { tint: string; background: string }> = {
    deposit: { tint: colors.success, background: withAlpha(colors.success, 0.14) },
    send: { tint: colors.accent, background: withAlpha(colors.primary, 0.22) },
    receive: { tint: colors.success, background: withAlpha(colors.success, 0.14) },
    cashout: { tint: colors.warning, background: withAlpha(colors.warning, 0.14) },
    convert: { tint: '#A99BFF', background: withAlpha('#A99BFF', 0.14) },
    card: { tint: cardTint, background: withAlpha(cardTint, 0.14) },
  };
  return { icon: icons[type], ...tones[type] };
}

const brandLogos: Record<MerchantBrand, ImageSourcePropType> = {
  netflix: require('../../assets/merchants/netflix.png'),
  airbnb: require('../../assets/merchants/airbnb.png'),
  booking: require('../../assets/merchants/booking.png'),
  airfrance: require('../../assets/merchants/airfrance.png'),
  uber: require('../../assets/merchants/uber.png'),
  spotify: require('../../assets/merchants/spotify.png'),
  orange: require('../../assets/merchants/orange.png'),
  shell: require('../../assets/merchants/shell.png'),
};

const categoryIcons: Record<MerchantCategory, { emoji: string; tint: string }> = {
  restaurant: { emoji: '🍍', tint: '#F4B942' },
  cafe: { emoji: '☕', tint: '#C98A5B' },
  shopping: { emoji: '🛍️', tint: '#E86FA4' },
  market: { emoji: '🥭', tint: '#F08A3C' },
  pharmacy: { emoji: '💊', tint: '#4FC3A1' },
  taxi: { emoji: '🚕', tint: '#F5C84B' },
  fuel: { emoji: '⛽', tint: '#7FA7FF' },
  telecom: { emoji: '📱', tint: '#8AB4FF' },
  travel: { emoji: '✈️', tint: '#6FB7FF' },
};

const titleMatchers: [RegExp, Merchant][] = [
  [/netflix/i, 'netflix'],
  [/airbnb/i, 'airbnb'],
  [/booking/i, 'booking'],
  [/air ?france/i, 'airfrance'],
  [/uber/i, 'uber'],
  [/spotify/i, 'spotify'],
  [/orange/i, 'orange'],
  [/shell/i, 'shell'],
  [/caf[ée]|coffee/i, 'cafe'],
  [/maquis|restau|resto|grill|chez /i, 'restaurant'],
  [/march[ée]|épicerie|epicerie/i, 'market'],
  [/pharma/i, 'pharmacy'],
  [/taxi|zem|vtc/i, 'taxi'],
  [/station|total|carburant/i, 'fuel'],
  [/mtn|moov|celtiis|recharge mobile/i, 'telecom'],
  [/boutique|shop|store/i, 'shopping'],
  [/vol |hôtel|hotel|voyage/i, 'travel'],
];

export function merchantFor(item: Pick<WalletTransaction, 'type' | 'title' | 'merchant'>): Merchant | null {
  if (item.merchant) return item.merchant;
  if (item.type !== 'card') return null;
  return titleMatchers.find(([pattern]) => pattern.test(item.title))?.[1] ?? null;
}

function isBrand(merchant: Merchant): merchant is MerchantBrand {
  return merchant in brandLogos;
}

export function TransactionIcon({ item, size = 44 }: { item: WalletTransaction; size?: number }) {
  const { colors } = useTheme();
  const merchant = merchantFor(item);
  const shape = { width: size, height: size, borderRadius: size / 2 };
  if (merchant && isBrand(merchant)) {
    return <Image source={brandLogos[merchant]} style={[shape, { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }]} accessibilityIgnoresInvertColors />;
  }
  if (merchant) {
    const { emoji, tint } = categoryIcons[merchant];
    return (
      <View style={[shape, { backgroundColor: withAlpha(tint, 0.18), alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: size * 0.46, lineHeight: size * 0.62 }}>{emoji}</Text>
      </View>
    );
  }
  const { icon: Icon, tint, background } = getTransactionAppearance(item.type, colors);
  return (
    <View style={[shape, { backgroundColor: background, alignItems: 'center', justifyContent: 'center' }]}>
      <Icon size={Math.round(size * 0.45)} color={tint} />
    </View>
  );
}

export function TransactionStatusPill({ status, successLabel = 'Terminé' }: { status: WalletTransaction['status']; successLabel?: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const tone = status === 'pending'
    ? { label: 'En attente', color: colors.warning, background: withAlpha(colors.warning, 0.14) }
    : status === 'failed'
      ? { label: 'Échoué', color: colors.danger, background: withAlpha(colors.danger, 0.14) }
      : { label: successLabel, color: colors.success, background: withAlpha(colors.success, 0.14) };
  return (
    <View style={[styles.statusPill, { backgroundColor: tone.background }]}>
      <TextLabel size={10} weight={fonts.bodySemi} color={tone.color}>{tone.label}</TextLabel>
    </View>
  );
}

export function TransactionRow({ item, onPress, index }: { item: WalletTransaction; onPress?: () => void; index?: number }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const incoming = item.amount > 0;
  const time = new Date(item.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const content = (
    <>
      <TransactionIcon item={item} />
      <View style={styles.middle}>
        <TextLabel size={15} weight={fonts.bodySemi} numberOfLines={1}>{item.title}</TextLabel>
        <TextLabel size={12} color={colors.textDim} numberOfLines={1}>{time} · {item.detail}</TextLabel>
      </View>
      <View style={styles.right}>
        <TextLabel size={15} weight={fonts.display} color={incoming ? colors.success : colors.text} style={styles.tabularAmount} numberOfLines={1}>
          {incoming ? '+' : '−'}{formatAmount(Math.abs(item.amount), item.denom)}
        </TextLabel>
        {item.status !== 'success' ? <TransactionStatusPill status={item.status} /> : null}
      </View>
    </>
  );
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index ?? 0, 10) * 45).duration(320)} layout={LinearTransition}>
      {onPress ? (
        <PressableScale accessibilityRole="button" onPress={onPress} style={styles.tile}>{content}</PressableScale>
      ) : (
        <View style={styles.tile}>{content}</View>
      )}
    </Animated.View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  tile: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 14, borderRadius: radius.lg, backgroundColor: colors.listTile },
  middle: { flex: 1, minWidth: 0, gap: 4 },
  right: { alignItems: 'flex-end', gap: 5 },
  tabularAmount: { fontVariant: ['tabular-nums'] },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
});
