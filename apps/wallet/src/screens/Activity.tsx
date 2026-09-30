import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { ArrowDownToLine, ArrowLeftRight, ArrowUpRight, CreditCard, QrCode, ShieldCheck } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useWalletStore, type TransactionType, type WalletTransaction } from '@/state/wallet';
import { formatAmount } from '@/utils/format';
import { colors, fonts, radius, spacing } from '@/theme/tokens';
import { Card, Header, PressableScale, Screen, Sheet, TextLabel, Toast } from '@/components/ui';

const filters = ['Tout', 'Dépôts', 'Envois', 'Reçus', 'Retraits', 'Conversions', 'Carte'];
const filterTypes: Record<string, TransactionType | null> = {
  Tout: null, Dépôts: 'deposit', Envois: 'send', Reçus: 'receive', Retraits: 'cashout', Conversions: 'convert', Carte: 'card',
};
const icons: Record<TransactionType, LucideIcon> = {
  deposit: ArrowDownToLine, send: ArrowUpRight, receive: QrCode, cashout: ArrowUpRight, convert: ArrowLeftRight, card: CreditCard,
};
const typeLabels: Record<TransactionType, string> = {
  deposit: 'Dépôt', send: 'Envoi', receive: 'Réception', cashout: 'Retrait', convert: 'Conversion', card: 'Carte',
};
const activityTime = Date.now();

export default function ActivityScreen() {
  const transactions = useWalletStore((state) => state.transactions);
  const [filter, setFilter] = useState('Tout');
  const [selected, setSelected] = useState<WalletTransaction | null>(null);
  const [toast, setToast] = useState(false);
  const visible = useMemo(() => transactions.filter((item) => !filterTypes[filter] || item.type === filterTypes[filter]), [filter, transactions]);
  const copy = async (value: string) => { await Clipboard.setStringAsync(value); setToast(true); setTimeout(() => setToast(false), 1800); };

  return (
    <Screen scroll tabBarClearance style={styles.content}>
      <Header title="Activité" back={false} right={<PressableScale><TextLabel size={20} color={colors.textMuted}>⌕</TextLabel></PressableScale>} />
      <TextLabel size={25} weight={fonts.displayBold}>Votre activité</TextLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {filters.map((item) => (
          <PressableScale key={item} onPress={() => setFilter(item)} style={[styles.filterChip, filter === item && styles.filterActive]}>
            <TextLabel size={12} weight={filter === item ? fonts.bodySemi : fonts.body} color={filter === item ? colors.text : colors.textDim}>{item}</TextLabel>
          </PressableScale>
        ))}
      </ScrollView>
      {visible.length === 0 ? (
        <Card style={styles.empty}><TextLabel size={14} color={colors.textMuted}>Aucune activité dans cette catégorie.</TextLabel></Card>
      ) : (
        <View style={{ gap: spacing(4) }}>
          <View>
            <TextLabel size={13} color={colors.textDim} style={styles.groupLabel}>AUJOURD’HUI</TextLabel>
            <Card style={styles.listCard}>
              {visible.filter((item) => activityTime - item.date < 86_400_000).map((item) => <ActivityRow key={item.id} item={item} onPress={() => setSelected(item)} />)}
            </Card>
          </View>
          {visible.some((item) => activityTime - item.date >= 86_400_000) ? (
            <View>
              <TextLabel size={13} color={colors.textDim} style={styles.groupLabel}>RÉCEMMENT</TextLabel>
              <Card style={styles.listCard}>
                {visible.filter((item) => activityTime - item.date >= 86_400_000).map((item) => <ActivityRow key={item.id} item={item} onPress={() => setSelected(item)} />)}
              </Card>
            </View>
          ) : null}
        </View>
      )}
      <Sheet visible={selected !== null} title="Détails de la transaction" onClose={() => setSelected(null)}>
        {selected ? (
          <View style={styles.detailContent}>
            <View style={styles.detailIcon}><ShieldCheck size={22} color={colors.success} /></View>
            <TextLabel size={20} weight={fonts.displayBold} style={styles.center}>{selected.title}</TextLabel>
            <TextLabel size={12} color={colors.textMuted} style={styles.center}>{typeLabels[selected.type]} · {new Date(selected.date).toLocaleString('fr-FR')}</TextLabel>
            <TextLabel size={28} weight={fonts.displayBold} style={styles.center}>{formatAmount(selected.amount, selected.denom)}</TextLabel>
            <View style={styles.timeline}>
              <TimelineRow label="Transaction initiée" done />
              <TimelineRow label="Confirmée sur Ledger X" done />
              <TimelineRow label="Terminée" done />
            </View>
            <View style={styles.hashBox}>
              <View style={{ flex: 1, gap: 4 }}><TextLabel size={11} color={colors.textDim}>HASH DE TRANSACTION</TextLabel><TextLabel size={11} color={colors.accent}>{selected.hash.slice(0, 16)}…{selected.hash.slice(-10)}</TextLabel></View>
              <PressableScale onPress={() => copy(selected.hash)}><TextLabel size={12} color={colors.accent}>Copier</TextLabel></PressableScale>
            </View>
            <View style={styles.feeNote}><ShieldCheck size={16} color={colors.success} /><TextLabel size={12} color={colors.success}>Frais offerts par le Trésor (x/feegrant)</TextLabel></View>
            <TextLabel size={12} color={colors.textDim}>{selected.detail}</TextLabel>
          </View>
        ) : null}
      </Sheet>
      <Toast message="Copié" visible={toast} />
    </Screen>
  );
}

function ActivityRow({ item, onPress }: { item: WalletTransaction; onPress: () => void }) {
  const Icon = icons[item.type];
  const incoming = item.amount > 0;
  return (
    <PressableScale onPress={onPress} style={styles.activityRow}>
      <View style={styles.activityIcon}><Icon size={18} color={item.type === 'deposit' || incoming ? colors.success : colors.accent} /></View>
      <View style={{ flex: 1, gap: 4 }}>
        <TextLabel size={13} weight={fonts.bodySemi}>{item.title}</TextLabel>
        <TextLabel size={11} color={colors.textDim}>{item.detail}</TextLabel>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <TextLabel size={12} weight={fonts.bodySemi} color={incoming ? colors.success : colors.text}>{incoming ? '+' : ''}{formatAmount(item.amount, item.denom)}</TextLabel>
        <TextLabel size={10} color={item.status === 'pending' ? colors.warning : colors.textDim}>{item.status === 'success' ? 'Terminé' : item.status === 'pending' ? 'En attente' : 'Échoué'}</TextLabel>
      </View>
    </PressableScale>
  );
}

function TimelineRow({ label, done }: { label: string; done: boolean }) {
  return <View style={styles.timelineRow}><View style={[styles.timelineDot, done && styles.timelineDone]} /><TextLabel size={12} color={done ? colors.text : colors.textDim}>{label}</TextLabel></View>;
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing(1), gap: spacing(3) },
  filters: { gap: 8, paddingRight: 16 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  filterActive: { backgroundColor: colors.primary },
  empty: { paddingVertical: spacing(5), alignItems: 'center' },
  groupLabel: { marginBottom: spacing(2) },
  listCard: { padding: spacing(2), paddingHorizontal: spacing(3) },
  activityRow: { minHeight: 67, flexDirection: 'row', alignItems: 'center', gap: spacing(2), borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  activityIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.primarySoft },
  detailContent: { alignItems: 'stretch', gap: spacing(2) },
  detailIcon: { width: 56, height: 56, borderRadius: 28, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(61,220,151,.12)' },
  center: { textAlign: 'center' },
  timeline: { gap: spacing(2), paddingVertical: spacing(2) },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: colors.border },
  timelineDone: { backgroundColor: colors.success, borderColor: colors.success },
  hashBox: { flexDirection: 'row', alignItems: 'center', padding: spacing(3), borderRadius: radius.md, backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1 },
  feeNote: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing(2), borderRadius: radius.md, backgroundColor: 'rgba(61,220,151,.08)' },
});
