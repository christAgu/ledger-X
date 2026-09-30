import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Copy, CreditCard, LockKeyhole, ShieldCheck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { authenticate } from '@/services/auth';
import { colors, fonts, radius, spacing } from '@/theme/tokens';
import { useWalletStore, verifyPin } from '@/state/wallet';
import { Button, Card as Surface, Header, PinPad, PressableScale, Screen, Sheet, SwitchRow, TextLabel, Toast } from '@/components/ui';

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
    setToast(true);
    setTimeout(() => setToast(false), 1600);
  };

  return (
    <Screen scroll style={styles.content}>
      <Header title="Ma carte" back={false} right={<PressableScale><TextLabel size={20} color={colors.textMuted}>···</TextLabel></PressableScale>} />
      <Animated.View style={[styles.cardShell, animatedCard]}>
        <LinearGradient colors={card.frozen ? ['#28374D', '#19283D'] : ['#16458A', '#0C2B5A', '#071632']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bankCard, flipped && styles.reverseFace]}>
          <Image source={require('@/assets/brand/acxa-mark.png')} style={styles.cardWatermark} resizeMode="contain" />
          {!flipped ? (
            <>
              <View style={styles.cardTop}><TextLabel size={17} weight={fonts.displayBold}>Ledger <TextLabel size={17} weight={fonts.displayBold} color={colors.accent}>X</TextLabel></TextLabel><TextLabel size={9} color={colors.textMuted} weight={fonts.bodySemi}>VIRTUAL</TextLabel></View>
              <View style={styles.cardChip}><View /><View /><View /><View /></View>
              <TextLabel size={19} weight={fonts.display} style={styles.panText}>{revealed ? card.pan : '••••  ••••  ••••  4821'}</TextLabel>
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
        <PressableScale onPress={showDetails} style={styles.detailButton}><ShieldCheck size={18} color={colors.accent} /><TextLabel size={13} weight={fonts.bodySemi}>{revealed ? 'Détails affichés' : 'Afficher les détails'}</TextLabel></PressableScale>
        {revealed ? <PressableScale onPress={copyPan} style={styles.detailButton}><Copy size={16} color={colors.accent} /><TextLabel size={13} weight={fonts.bodySemi}>Copier le numéro</TextLabel></PressableScale> : null}
        <PressableScale onPress={flip} style={styles.detailButton}><CreditCard size={17} color={colors.accent} /><TextLabel size={13} weight={fonts.bodySemi}>{flipped ? 'Voir le recto' : 'Voir le verso'}</TextLabel></PressableScale>
      </View>

      <Surface style={styles.controlCard}>
        <SwitchRow title="Geler la carte" subtitle="Bloquer temporairement tous les paiements" value={card.frozen} onValueChange={(frozen) => updateCard({ frozen })} />
        <SwitchRow title="Paiements en ligne" value={card.onlinePayments} onValueChange={(onlinePayments) => updateCard({ onlinePayments })} />
        <SwitchRow title="Sans contact" value={card.contactless} onValueChange={(contactless) => updateCard({ contactless })} />
      </Surface>

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
      <Toast message="Numéro de carte copié" visible={toast} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing(1), gap: spacing(3) },
  cardShell: { width: '100%', aspectRatio: 1.586, backfaceVisibility: 'hidden' },
  bankCard: { flex: 1, borderRadius: radius.lg, padding: spacing(4), overflow: 'hidden', justifyContent: 'space-between' },
  reverseFace: { transform: [{ rotateY: '180deg' }] },
  cardWatermark: { position: 'absolute', right: -20, bottom: -50, width: 210, height: 235, opacity: 0.08 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardChip: { width: 34, height: 26, borderRadius: 5, borderWidth: 1, borderColor: '#A9C8F6', flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden', opacity: 0.9 },
  panText: { letterSpacing: 1.2 },
  cardBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  frozenOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(5,17,42,.58)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  cardBack: { flex: 1, justifyContent: 'space-between' },
  magnetic: { height: 42, backgroundColor: '#020917', marginHorizontal: -spacing(4), marginTop: spacing(3) },
  cvvLine: { backgroundColor: colors.paper, height: 32, borderRadius: 4, paddingHorizontal: spacing(2), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  visaBack: { alignSelf: 'flex-end' },
  cardActions: { flexDirection: 'row', justifyContent: 'space-around' },
  detailButton: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 5 },
  controlCard: { paddingHorizontal: spacing(3), paddingVertical: spacing(1) },
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
