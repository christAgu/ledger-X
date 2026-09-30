import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Activity, ShieldCheck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useWalletStore, type TransactionType, type WalletTransaction } from '@/state/wallet';
import { valueInXof } from '@/services/rates';
import { formatAmount, formatXof } from '@/utils/format';
import { colors, fonts, radius, spacing } from '@/theme/tokens';
import { Card, Header, PressableScale, Screen, Sheet, TextLabel, Toast } from '@/components/ui';
import { getTransactionAppearance, TransactionRow, TransactionStatusPill } from '@/components/TransactionRow';

const filters = ['Tout', 'Dépôts', 'Envois', 'Reçus', 'Retraits', 'Conversions', 'Carte'];
const filterTypes: Record<string, TransactionType | null> = {
  Tout: null, Dépôts: 'deposit', Envois: 'send', Reçus: 'receive', Retraits: 'cashout', Conversions: 'convert', Carte: 'card',
};
const typeLabels: Record<TransactionType, string> = {
  deposit: 'Dépôt', send: 'Envoi', receive: 'Réception', cashout: 'Retrait', convert: 'Conversion', card: 'Carte',
};
const weekdayLabels = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

type ActivityGroup = { key: string; label: string; items: WalletTransaction[]; netXof: number };

export default function ActivityScreen() {
  const transactions = useWalletStore((state) => state.transactions);
  const [filter, setFilter] = useState('Tout');
  const [selected, setSelected] = useState<WalletTransaction | null>(null);
  const [toast, setToast] = useState(false);
  const [now] = useState(() => Date.now());
  const monthStart = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime();
  const todayStart = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), new Date(now).getDate()).getTime();
  const visible = useMemo(
    () => transactions
      .filter((item) => !filterTypes[filter] || item.type === filterTypes[filter])
      .sort((left, right) => right.date - left.date),
    [filter, transactions],
  );
  const monthTransactions = useMemo(() => transactions.filter((item) => item.date >= monthStart), [monthStart, transactions]);
  const totals = useMemo(() => monthTransactions.reduce((result, item) => {
    const amount = valueInXof(item.amount, item.denom);
    if (amount > 0) result.incoming += amount;
    if (amount < 0) result.outgoing += Math.abs(amount);
    return result;
  }, { incoming: 0, outgoing: 0 }), [monthTransactions]);
  const dailyOutgoing = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(todayStart);
    date.setDate(date.getDate() - 6 + index);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const start = date.getTime();
    const end = nextDay.getTime();
    const amount = transactions
      .filter((item) => item.date >= start && item.date < end && item.amount < 0)
      .reduce((sum, item) => sum + Math.abs(valueInXof(item.amount, item.denom)), 0);
    return { key: start, label: weekdayLabels[date.getDay()], amount, today: index === 6 };
  }), [todayStart, transactions]);
  const maxDailyOutgoing = Math.max(...dailyOutgoing.map((day) => day.amount), 1);
  const groups = useMemo(() => groupTransactionsByDay(visible, todayStart), [todayStart, visible]);
  const copy = async (value: string) => {
    await Clipboard.setStringAsync(value);
    setToast(true);
    setTimeout(() => setToast(false), 1800);
  };

  return (
    <Screen scroll tabBarClearance style={styles.content}>
      <Header title="Activité" back={false} />
      <LinearGradient colors={['#2458ED', '#1B3FB8', '#0E2246']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summaryCard}>
        <TextLabel size={13} color="rgba(255,255,255,0.78)" weight={fonts.bodySemi}>Ce mois-ci</TextLabel>
        <View style={styles.summaryTotals}>
          <View style={styles.summaryColumn}>
            <TextLabel size={12} color="rgba(255,255,255,0.7)">Entrées</TextLabel>
            <TextLabel size={16} weight={fonts.display} color={colors.success} numberOfLines={1}>+{formatXof(totals.incoming)}</TextLabel>
          </View>
          <View style={styles.summaryColumn}>
            <TextLabel size={12} color="rgba(255,255,255,0.7)">Sorties</TextLabel>
            <TextLabel size={16} weight={fonts.display} numberOfLines={1}>−{formatXof(totals.outgoing)}</TextLabel>
          </View>
        </View>
        <TextLabel size={11} color="rgba(255,255,255,0.72)">Sorties sur 7 jours</TextLabel>
        <View style={styles.chart}>
          {dailyOutgoing.map((day, index) => (
            <ChartBar key={day.key} label={day.label} amount={day.amount} maxAmount={maxDailyOutgoing} today={day.today} index={index} />
          ))}
        </View>
      </LinearGradient>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {filters.map((item) => (
          <PressableScale key={item} onPress={() => setFilter(item)} style={[styles.filterChip, filter === item && styles.filterActive]}>
            <TextLabel size={12} weight={filter === item ? fonts.bodySemi : fonts.body} color={filter === item ? colors.text : colors.textDim}>{item}</TextLabel>
          </PressableScale>
        ))}
      </ScrollView>
      {groups.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}><Activity size={22} color={colors.accent} /></View>
          <TextLabel size={14} color={colors.textMuted} style={styles.center}>Aucune activité dans cette catégorie.</TextLabel>
        </View>
      ) : (
        <View key={filter} style={styles.transactionGroups}>
          {groups.map((group, groupIndex) => (
            <View key={group.key} style={styles.group}>
              <View style={styles.groupHeader}>
                <TextLabel size={13} weight={fonts.bodySemi} color={colors.textMuted}>{group.label}</TextLabel>
                <TextLabel size={12} color={colors.textDim}>{formatSignedXof(group.netXof)}</TextLabel>
              </View>
              <View style={styles.transactionList}>
                {group.items.map((item, index) => (
                  <TransactionRow key={item.id} item={item} index={groupIndex * 4 + index} onPress={() => setSelected(item)} />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
      <Sheet visible={selected !== null} title="Détails de la transaction" onClose={() => setSelected(null)}>
        {selected ? (
          <TransactionDetails item={selected} onCopy={() => copy(selected.hash)} />
        ) : null}
      </Sheet>
      <Toast message="Copié" visible={toast} />
    </Screen>
  );
}

function ChartBar({ label, amount, maxAmount, today, index }: { label: string; amount: number; maxAmount: number; today: boolean; index: number }) {
  const targetHeight = amount > 0 ? Math.max(4, (amount / maxAmount) * 44) : 0;
  const height = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({ height: height.value }));
  useEffect(() => {
    height.set(0);
    height.set(withDelay(index * 40, withTiming(targetHeight, { duration: 500 })));
    return () => cancelAnimation(height);
  }, [height, index, targetHeight]);

  return (
    <View style={styles.chartColumn}>
      <View style={styles.chartTrack}>
        <Animated.View style={[styles.chartBar, { backgroundColor: today ? '#EAF1FF' : 'rgba(255,255,255,0.35)' }, animatedStyle]} />
      </View>
      <TextLabel size={10} color={today ? colors.text : 'rgba(255,255,255,0.66)'}>{label}</TextLabel>
    </View>
  );
}

function TransactionDetails({ item, onCopy }: { item: WalletTransaction; onCopy: () => void }) {
  const { icon: Icon, tint, background } = getTransactionAppearance(item.type);
  const incoming = item.amount > 0;
  const time = new Date(item.date).toLocaleString('fr-FR');
  return (
    <View style={styles.detailContent}>
      <View style={[styles.detailIcon, { backgroundColor: background }]}><Icon size={24} color={tint} /></View>
      <TextLabel size={18} weight={fonts.bodySemi} style={styles.center}>{item.title}</TextLabel>
      <TextLabel size={28} weight={fonts.displayBold} color={incoming ? colors.success : colors.text} style={styles.center}>
        {incoming ? '+' : '−'}{formatAmount(Math.abs(item.amount), item.denom)}
      </TextLabel>
      <View style={styles.statusCentered}><TransactionStatusPill status={item.status} /></View>
      <Card style={styles.detailCard}>
        <DetailRow label="Type" value={typeLabels[item.type]} />
        <DetailRow label="Date" value={time} />
        <DetailRow label="Détail" value={item.detail} />
        <DetailRow label="Frais" value={item.fee === 0 ? 'Offerts' : formatAmount(item.fee, item.denom)} />
      </Card>
      <View style={styles.timeline}>
        <TimelineRow label="Transaction initiée" done />
        <TimelineRow label="Confirmée sur Ledger X" done={item.status === 'success'} />
        <TimelineRow label="Terminée" done={item.status === 'success'} />
      </View>
      <View style={styles.hashBox}>
        <View style={styles.hashText}>
          <TextLabel size={11} color={colors.textDim}>HASH DE TRANSACTION</TextLabel>
          <TextLabel size={11} color={colors.accent} numberOfLines={1}>{item.hash.slice(0, 16)}…{item.hash.slice(-10)}</TextLabel>
        </View>
        <PressableScale accessibilityRole="button" onPress={onCopy}><TextLabel size={12} color={colors.accent}>Copier</TextLabel></PressableScale>
      </View>
      <View style={styles.feeNote}><ShieldCheck size={16} color={colors.success} /><TextLabel size={12} color={colors.success}>Frais offerts par le Trésor (x/feegrant)</TextLabel></View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <TextLabel size={12} color={colors.textMuted}>{label}</TextLabel>
      <TextLabel size={12} color={colors.text} weight={fonts.bodyMedium} style={styles.detailValue}>{value}</TextLabel>
    </View>
  );
}

function TimelineRow({ label, done }: { label: string; done: boolean }) {
  return <View style={styles.timelineRow}><View style={[styles.timelineDot, done && styles.timelineDone]} /><TextLabel size={12} color={done ? colors.text : colors.textDim}>{label}</TextLabel></View>;
}

function groupTransactionsByDay(items: WalletTransaction[], todayStart: number): ActivityGroup[] {
  const groups: ActivityGroup[] = [];
  const yesterday = new Date(todayStart);
  yesterday.setDate(yesterday.getDate() - 1);
  for (const item of items) {
    const date = new Date(item.date);
    date.setHours(0, 0, 0, 0);
    const key = date.getTime().toString();
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      const label = date.getTime() === todayStart
        ? 'Aujourd’hui'
        : date.getTime() === yesterday.getTime()
          ? 'Hier'
          : capitalize(date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }));
      group = { key, label, items: [], netXof: 0 };
      groups.push(group);
    }
    group.items.push(item);
    group.netXof += valueInXof(item.amount, item.denom);
  }
  return groups;
}

function capitalize(value: string) {
  return value.charAt(0).toLocaleUpperCase('fr-FR') + value.slice(1);
}

function formatSignedXof(value: number) {
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatXof(Math.abs(value))}`;
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing(1), gap: spacing(3) },
  summaryCard: { borderRadius: radius.lg, padding: spacing(4), gap: spacing(3), overflow: 'hidden' },
  summaryTotals: { flexDirection: 'row', gap: spacing(3) },
  summaryColumn: { flex: 1, minWidth: 0, gap: spacing(1) },
  chart: { flexDirection: 'row', gap: spacing(2), alignItems: 'flex-end' },
  chartColumn: { flex: 1, alignItems: 'center', gap: spacing(1) },
  chartTrack: { height: 48, justifyContent: 'flex-end', alignItems: 'center' },
  chartBar: { width: 13, borderTopLeftRadius: 7, borderTopRightRadius: 7 },
  filters: { gap: 8, paddingRight: 16 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  filterActive: { backgroundColor: colors.primary },
  emptyState: { alignItems: 'center', gap: spacing(2), paddingVertical: spacing(7) },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  transactionGroups: { gap: spacing(4) },
  group: { gap: spacing(2) },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  transactionList: { gap: 8 },
  detailContent: { alignItems: 'stretch', gap: spacing(2) },
  detailIcon: { width: 56, height: 56, borderRadius: 18, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  statusCentered: { alignSelf: 'center' },
  detailCard: { paddingVertical: spacing(1), paddingHorizontal: spacing(3), gap: spacing(2) },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing(2) },
  detailValue: { flex: 1, textAlign: 'right' },
  timeline: { gap: spacing(2), paddingVertical: spacing(2) },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: colors.border },
  timelineDone: { backgroundColor: colors.success, borderColor: colors.success },
  hashBox: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), padding: spacing(3), borderRadius: radius.md, backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1 },
  hashText: { flex: 1, minWidth: 0, gap: 4 },
  feeNote: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing(2), borderRadius: radius.md, backgroundColor: 'rgba(61,220,151,.08)' },
});
