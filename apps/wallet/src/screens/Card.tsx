import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Copy, CreditCard, Globe, LockKeyhole, Nfc, ShieldCheck, Snowflake, type LucideIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { authenticate } from '@/services/auth';
import { colors, fonts, radius, spacing } from '@/theme/tokens';
import { useWalletStore, verifyPin } from '@/state/wallet';
import { Button, Card as Surface, Header, PinPad, PressableScale, Screen, Sheet, TextLabel, Toast } from '@/components/ui';

const limits = [100_000, 250_000, 500_000, 1_000_000];

export default function CardScreen() {
  const card = useWalletStore((state) => state.card);
  const updateCard = useWalletStore((state) => state.updateCard);
  const [revealed, setRevealed] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Numéro de carte copié');
  const rotation = useSharedValue(0);
  const animatedCard = useAnimatedStyle(() => ({ transform: [{ perspective: 1000 }, { rotateY: `${rotation.value}deg` }] }));

  useEffect(() => {
    if (!revealed) return;
    const timer = setTimeout(() => setRevealed(false), 30_000);
    return () => clearTimeout(timer);
  }, [revealed]);

  const showDetails = async () => {
    if (await authenticate('Afficher les détails de votre carte')) { setRevealed(true); return; }
    setPinOpen(true);
  };
  const toggleDetails = async () => {
    if (revealed) { setRevealed(false); return; }
    await showDetails();
  };
  const checkCode = async (code: string) => {
    if (await verifyPin(code)) { setPinOpen(false); setPin(''); setRevealed(true); setError(false); }
    else { setPin(''); setError(true); }
  };
  const flip = () => {
    setFlipped((value) => !value);
    rotation.value = withTiming(flipped ? 0 : 180, { duration: 480 });
  };
  const copyPan = async () => {
    await Clipboard.setStringAsync(card.pan.replace(/\s/g, ''));
    showToast('Numéro de carte copié');
  };
  const showToast = (message: string) => {
    setToastMessage(message);
    setToast(true);
    setTimeout(() => setToast(false), 1600);
  };
  const updateCardOption = (patch: Parameters<typeof updateCard>[0], message: string) => {
    updateCard(patch);
    void Haptics.selectionAsync();
    showToast(message);
  };

  return (
    <Screen scroll tabBarClearance style={styles.content} overlay={<Toast message={toastMessage} visible={toast} style={styles.toastAboveTab} />}>
      <Header title="Ma carte" back={false} right={<PressableScale><TextLabel size={20} color={colors.textMuted}>···</TextLabel></PressableScale>} />
      <Animated.View style={[styles.cardShell, animatedCard]}>
        <LinearGradient colors={card.frozen ? ['#28374D', '#19283D'] : ['#4F7BFF', '#2458ED', '#1B3FB8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bankCard, flipped && styles.reverseFace]}>
          <View style={styles.cardGlowTop} />
          <View style={styles.cardGlowBottom} />
          <Image source={require('@/assets/brand/acxa-mark.png')} style={styles.cardWatermark} resizeMode="contain" />
          {!flipped ? (
            <>
              <View style={styles.cardTop}><TextLabel size={17} weight={fonts.displayBold}>Ledger <TextLabel size={17} weight={fonts.displayBold} color={colors.accent}>X</TextLabel></TextLabel><TextLabel size={9} color={colors.textMuted} weight={fonts.bodySemi}>VIRTUAL</TextLabel></View>
              <View style={styles.cardChip}><View /><View /><View /><View /></View>
              {revealed ? (
                <View style={styles.panRow}>
                  <TextLabel size={19} weight={fonts.display} style={styles.panText}>{card.pan}</TextLabel>
                  <PressableScale accessibilityRole="button" accessibilityLabel="Copier le numéro de carte" onPress={copyPan} style={styles.copyButton}><Copy size={15} color={colors.text} /><TextLabel size={10} weight={fonts.bodySemi}>Copier</TextLabel></PressableScale>
                </View>
              ) : <TextLabel size={19} weight={fonts.display} style={styles.panText}>••••  ••••  ••••  4821</TextLabel>}
              <View style={styles.cardBottom}>
                <View><TextLabel size={8} color={colors.textMuted}>TITULAIRE</TextLabel><TextLabel size={11} weight={fonts.bodySemi}>{card.holder}</TextLabel></View>
                <View><TextLabel size={8} color={colors.textMuted}>EXP</TextLabel><TextLabel size={11} weight={fonts.bodySemi}>{revealed ? card.expiry : '••/••'}</TextLabel></View>
                <TextLabel size={22} weight={fonts.displayBold}>VISA</TextLabel>
              </View>
            </>
          ) : (
            <View style={styles.cardBack}>
              <View style={styles.magnetic} />
              <View style={styles.cvvLine}><TextLabel size={10} color={colors.textMuted}>CVV</TextLabel><TextLabel size={13} weight={fonts.bodyBold}>{revealed ? card.cvv : '•••'}</TextLabel></View>
              <TextLabel size={12} color={colors.textMuted}>Votre carte Ledger X · {card.holder}</TextLabel>
              <TextLabel size={19} weight={fonts.displayBold} style={styles.visaBack}>VISA</TextLabel>
            </View>
          )}
          {card.frozen ? <View style={styles.frozenOverlay}><LockKeyhole size={18} color={colors.text} /><TextLabel size={14} weight={fonts.bodyBold}>Gelée</TextLabel></View> : null}
        </LinearGradient>
      </Animated.View>
      <View style={styles.cardActions}>
        <CardAction icon={ShieldCheck} label={revealed ? 'Masquer' : 'Détails'} onPress={toggleDetails} />
        <CardAction icon={CreditCard} label={flipped ? 'Recto' : 'Verso'} onPress={flip} />
        <CardAction icon={Snowflake} label={card.frozen ? 'Dégeler' : 'Geler'} active={card.frozen} checked={card.frozen} toggle onPress={() => updateCardOption({ frozen: !card.frozen }, card.frozen ? 'Carte dégelée' : 'Carte gelée')} />
        <CardAction icon={Nfc} label="Sans contact" active={card.contactless} checked={card.contactless} toggle onPress={() => updateCardOption({ contactless: !card.contactless }, card.contactless ? 'Sans contact désactivé' : 'Sans contact activé')} />
        <CardAction icon={Globe} label="En ligne" active={card.onlinePayments} checked={card.onlinePayments} toggle onPress={() => updateCardOption({ onlinePayments: !card.onlinePayments }, card.onlinePayments ? 'Paiements en ligne désactivés' : 'Paiements en ligne activés')} />
      </View>

      <Surface style={styles.limitCard}>
        <View style={styles.rowBetween}><View><TextLabel size={15} weight={fonts.bodySemi}>Plafond mensuel</TextLabel><TextLabel size={12} color={colors.textDim}>Dépensé 132 500 XOF</TextLabel></View><TextLabel size={14} color={colors.accent} weight={fonts.bodySemi}>{(card.limitMonthly / 1000).toFixed(0)}k</TextLabel></View>
        <View style={styles.progress}><View style={[styles.progressFill, { width: `${Math.min(100, (132_500 / card.limitMonthly) * 100)}%` }]} /></View>
        <View style={styles.limitChips}>{limits.map((limit) => <PressableScale key={limit} onPress={() => updateCard({ limitMonthly: limit })} style={[styles.limitChip, card.limitMonthly === limit && styles.limitChipActive]}><TextLabel size={11} color={card.limitMonthly === limit ? colors.text : colors.textDim}>{limit >= 1_000_000 ? '1M' : `${limit / 1000}k`}</TextLabel></PressableScale>)}</View>
      </Surface>

      <Button kind="secondary" onPress={() => setReplaceOpen(true)}>Remplacer la carte</Button>
      <View style={styles.sectionHead}><TextLabel size={18} weight={fonts.display}>Paiements récents</TextLabel></View>
      {[
        ['Café Cotonou', 'Aujourd’hui · 11:32', '−4 500 XOF'],
        ['Uber BV', 'Hier · 19:08', '−8 200 XOF'],
      ].map(([title, subtitle, amount]) => (
        <View key={title} style={styles.purchaseRow}><View style={styles.purchaseIcon}><CreditCard size={17} color={colors.accent} /></View><View style={{ flex: 1, gap: 3 }}><TextLabel size={13} weight={fonts.bodySemi}>{title}</TextLabel><TextLabel size={11} color={colors.textDim}>{subtitle}</TextLabel></View><TextLabel size={13} weight={fonts.bodySemi}>{amount}</TextLabel></View>
      ))}
      <Sheet visible={pinOpen} title="Confirmez avec votre code" onClose={() => setPinOpen(false)}>
        <TextLabel size={13} color={colors.textMuted} style={styles.center}>Saisissez votre code secret pour afficher la carte.</TextLabel>
        <PinPad value={pin} onChange={(next) => { setPin(next); setError(false); }} onComplete={checkCode} error={error} />
        {error ? <TextLabel size={12} color={colors.danger} style={styles.center}>Code incorrect. Réessayez.</TextLabel> : null}
      </Sheet>
      <Sheet visible={replaceOpen} title="Remplacer la carte" onClose={() => setReplaceOpen(false)}>
        <TextLabel size={14} color={colors.textMuted}>Une nouvelle carte virtuelle sera créée. Cette action est simulée dans la démo.</TextLabel>
        <Button onPress={() => { setReplaceOpen(false); updateCard({ pan: '4532 1045 8892 6214' }); }}>Confirmer le remplacement</Button>
      </Sheet>
    </Screen>
  );
}

function CardAction({ icon: Icon, label, onPress, active = false, toggle = false, checked = false }: { icon: LucideIcon; label: string; onPress: () => void; active?: boolean; toggle?: boolean; checked?: boolean }) {
  return (
    <PressableScale
      haptic={!toggle}
      accessibilityRole={toggle ? 'switch' : 'button'}
      accessibilityLabel={label}
      accessibilityState={toggle ? { checked } : undefined}
      aria-checked={toggle ? checked : undefined}
      onPress={onPress}
      style={styles.detailButton}>
      <View style={[styles.actionIcon, active && styles.actionIconActive]}><Icon size={20} color={active ? colors.text : colors.textDim} /></View>
      <TextLabel size={11} weight={fonts.bodySemi} numberOfLines={1}>{label}</TextLabel>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing(1), gap: spacing(3) },
  cardShell: { width: '100%', aspectRatio: 1.586, backfaceVisibility: 'hidden' },
  bankCard: { flex: 1, borderRadius: radius.lg, padding: spacing(4), overflow: 'hidden', justifyContent: 'space-between' },
  cardGlowTop: { position: 'absolute', width: 180, height: 180, borderRadius: 90, top: -94, right: -70, backgroundColor: 'rgba(255,255,255,0.1)', pointerEvents: 'none' },
  cardGlowBottom: { position: 'absolute', width: 140, height: 140, borderRadius: 70, bottom: -84, left: -54, backgroundColor: 'rgba(255,255,255,0.06)', pointerEvents: 'none' },
  reverseFace: { transform: [{ rotateY: '180deg' }] },
  cardWatermark: { position: 'absolute', right: -20, bottom: -50, width: 210, height: 235, opacity: 0.08 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardChip: { width: 34, height: 26, borderRadius: 5, borderWidth: 1, borderColor: '#A9C8F6', flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden', opacity: 0.9 },
  panText: { letterSpacing: 1.2 },
  cardBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  panRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(2) },
  copyButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.14)' },
  frozenOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(5,17,42,.58)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  cardBack: { flex: 1, justifyContent: 'space-between' },
  magnetic: { height: 42, backgroundColor: '#020917', marginHorizontal: -spacing(4), marginTop: spacing(3) },
  cvvLine: { backgroundColor: colors.paper, height: 32, borderRadius: 4, paddingHorizontal: spacing(2), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  visaBack: { alignSelf: 'flex-end' },
  cardActions: { flexDirection: 'row', width: '100%', marginHorizontal: -spacing(4) },
  detailButton: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 5 },
  actionIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  actionIconActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toastAboveTab: { bottom: 130 },
  limitCard: { gap: spacing(3) },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progress: { height: 6, borderRadius: 3, backgroundColor: colors.bgElevated, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  limitChips: { flexDirection: 'row', justifyContent: 'space-between' },
  limitChip: { paddingHorizontal: spacing(3), paddingVertical: spacing(1.5), borderRadius: radius.pill, backgroundColor: colors.bgElevated },
  limitChipActive: { backgroundColor: colors.primary },
  sectionHead: { marginTop: spacing(1) },
  purchaseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingVertical: spacing(2), borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  purchaseIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  center: { textAlign: 'center', marginBottom: spacing(3) },
});
