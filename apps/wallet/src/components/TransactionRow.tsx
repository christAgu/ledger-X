import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { ArrowDownToLine, ArrowLeftRight, ArrowUpRight, CreditCard, QrCode, type LucideIcon } from 'lucide-react-native';
import type { TransactionType, WalletTransaction } from '@/state/wallet';
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
  const { icon: Icon, tint, background } = getTransactionAppearance(item.type, colors);
  const incoming = item.amount > 0;
  const time = new Date(item.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const content = (
    <>
      <View style={[styles.icon, { backgroundColor: background }]}><Icon size={20} color={tint} /></View>
      <View style={styles.middle}>
        <TextLabel size={14} weight={fonts.bodySemi} numberOfLines={1}>{item.title}</TextLabel>
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
  tile: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.lg, backgroundColor: colors.surface },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1, minWidth: 0, gap: 4 },
  right: { alignItems: 'flex-end', gap: 5 },
  tabularAmount: { fontVariant: ['tabular-nums'] },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
});
