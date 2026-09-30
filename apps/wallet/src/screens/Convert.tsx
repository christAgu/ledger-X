import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ArrowDownUp, Check, ChevronDown, ShieldCheck } from 'lucide-react-native';
import { authenticate } from '@/services/auth';
import { ledgerx } from '@/services/ledgerx';
import type { Denom } from '@/services/ledgerx/types';
import { getQuote } from '@/services/rates';
import { useWalletStore, verifyPin } from '@/state/wallet';
import { formatAmount } from '@/utils/format';
import { wait } from '@/utils/wait';
import { AmountText, AssetIcon, Button, Card, Header, Input, PageTitle, PinPad, PressableScale, Screen, Sheet, SuccessView, TextLabel } from '@/components/ui';
import { fonts, radius, spacing, type Palette, withAlpha } from '@/theme/tokens';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { ProcessingOverlay } from '@/components/OrbitLoader';

const denoms: Denom[] = ['EURC', 'USD', 'USDC', 'USDT', 'BTC', 'SOL'];

export default function Convert() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const balances = useWalletStore((state) => state.balances);
  const updateBalance = useWalletStore((state) => state.updateBalance);
  const addTransaction = useWalletStore((state) => state.addTransaction);
  const [from, setFrom] = useState<Denom>('EURC');
  const [to, setTo] = useState<Denom>('USDC');
  const [amount, setAmount] = useState('10');
  const [picker, setPicker] = useState<'from' | 'to' | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [txShort, setTxShort] = useState('');
  const rotation = useSharedValue(0);
  const swapStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  const value = Number(amount.replace(/\s/g, '').replace(',', '.')) || 0;
  const quote = useMemo(() => getQuote(from, to, value), [from, to, value]);
  const names: Record<Denom, string> = { EURC: 'Euro · EURC', USD: 'Dollar US', USDC: 'USD Coin', USDT: 'Tether', BTC: 'Bitcoin', SOL: 'Solana' };
  const switchTokens = () => {
    rotation.value = withTiming(rotation.value + 180, { duration: 380 });
    setFrom(to);
    setTo(from);
  };
  const startConvert = async () => {
    if (value <= 0 || value > balances[from]) return;
    if (await authenticate('Confirmer votre conversion')) await convert();
    else {
      setReviewOpen(false);
      setPinOpen(true);
    }
  };
  const convert = async () => {
    setPinOpen(false);
    setReviewOpen(false);
    setLoading(true);
    const [result] = await Promise.all([ledgerx.signAndBroadcast({ type: 'MsgSwap', fromDenom: from, toDenom: to, amount: value, minOut: quote.minOut }), wait(1600)]);
    updateBalance(from, -value);
    updateBalance(to, quote.out);
    addTransaction({ type: 'convert', title: `Conversion ${from} → ${to}`, detail: 'Taux garanti · frais 0,5 %', amount: -value, denom: from, status: 'success', hash: result.txHash, fee: quote.fee });
    setTxShort(`${result.txHash.slice(0, 8)}…${result.txHash.slice(-6)}`);
    setLoading(false);
    setPinOpen(false);
    setReviewOpen(false);
    setSuccess(true);
  };
  const submitPin = async (code: string) => {
    if (await verifyPin(code)) { setError(false); await convert(); }
    else { setPin(''); setError(true); }
  };

  if (success) return <Screen><Header title="Conversion réussie" /><SuccessView title="Conversion réussie" subtitle={`${formatAmount(quote.out, to)} ajoutés à votre solde · Frais offerts`} detail={`Tx ${txShort}`} onDone={() => setSuccess(false)} /></Screen>;

  return (
    <Screen scroll tabBarClearance style={styles.content}>
      <Header title="Échanger" back={false} right={<View style={styles.gasIcon}><ShieldCheck size={17} color={colors.success} /></View>} />
      <PageTitle title="Convertissez vos devises" subtitle="Des taux transparents, sans frais cachés." />
      <View style={styles.tokenStack}>
        <TokenPanel title="Vous envoyez" denom={from} amount={amount} balance={balances[from]} onAmountChange={setAmount} onPress={() => setPicker('from')} onMax={() => setAmount(String(balances[from]))} />
        <Animated.View style={swapStyle}><PressableScale onPress={switchTokens} style={styles.swapButton}><ArrowDownUp size={19} color={colors.onPrimary} /></PressableScale></Animated.View>
        <TokenPanel title="Vous recevez" denom={to} amount={quote.out.toFixed(2)} readOnly onPress={() => setPicker('to')} />
      </View>
      <Card style={styles.quoteCard}>
        <QuoteRow label="Taux du marché" value={`1 ${from} = ${quote.rate.toFixed(4)} ${to}`} />
        <QuoteRow label="Frais de conversion" value="0,5 %" />
        <QuoteRow label="Frais réseau" value="Offerts" success />
        <View style={styles.divider} />
        <QuoteRow label="Montant minimum reçu" value={formatAmount(quote.minOut, to)} />
      </Card>
      <View style={{ marginTop: 'auto' }}><Button disabled={value <= 0 || value > balances[from]} onPress={() => setReviewOpen(true)}>Continuer</Button></View>
      <Sheet visible={picker !== null} title="Choisir une devise" onClose={() => setPicker(null)}>
        <ScrollView>
          {denoms.map((denom) => (
            <PressableScale key={denom} onPress={() => { if (picker === 'from') { setFrom(denom); if (to === denom) setTo(from); } else { setTo(denom); if (from === denom) setFrom(to); } setPicker(null); }} style={styles.denomRow}>
              <AssetIcon denom={denom} size={38} /><View style={{ flex: 1 }}><TextLabel size={14} weight={fonts.bodySemi}>{names[denom]}</TextLabel><TextLabel size={11} color={colors.textDim}>{denom}</TextLabel></View>
              <TextLabel size={12} color={colors.textMuted}>{formatAmount(balances[denom], denom)}</TextLabel>
            </PressableScale>
          ))}
        </ScrollView>
      </Sheet>
      <Sheet visible={reviewOpen} title="Confirmer la conversion" onClose={() => setReviewOpen(false)}>
        <View style={styles.reviewAmount}><TextLabel size={12} color={colors.textDim}>Vous envoyez</TextLabel><AmountText value={value} denom={from} size={20} /><TextLabel size={12} color={colors.textDim} style={{ marginTop: 14 }}>Vous recevez</TextLabel><AmountText value={quote.out} denom={to} size={22} /></View>
        <QuoteRow label="Taux" value={`1 ${from} = ${quote.rate.toFixed(4)} ${to}`} />
        <QuoteRow label="Frais (0,5 %)" value={formatAmount(quote.fee, from)} />
        <View style={styles.reviewFee}><Check color={colors.success} size={16} /><TextLabel size={12} color={colors.success}>Frais réseau offerts par le Trésor</TextLabel></View>
        <Button disabled={loading} onPress={startConvert}>{loading ? 'Confirmation…' : 'Confirmer et échanger'}</Button>
      </Sheet>
      <Sheet visible={pinOpen} title="Confirmez avec votre code" onClose={() => setPinOpen(false)}>
        <TextLabel size={13} color={colors.textMuted} style={styles.center}>Saisissez votre code secret pour valider cette transaction.</TextLabel>
        <PinPad value={pin} onChange={(next) => { setPin(next); setError(false); }} onComplete={submitPin} error={error} />
        {error ? <TextLabel size={12} color={colors.danger} style={styles.center}>Code incorrect. Réessayez.</TextLabel> : null}
      </Sheet>
      <ProcessingOverlay visible={loading} title="Échange en cours…" subtitle="MsgSwap · CosmWasm AMM" />
    </Screen>
  );
}

function TokenPanel({ title, denom, amount, balance, onAmountChange, onPress, onMax, readOnly = false }: { title: string; denom: Denom; amount: string; balance?: number; onAmountChange?: (value: string) => void; onPress: () => void; onMax?: () => void; readOnly?: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Card style={styles.tokenPanel}>
      <View style={styles.rowBetween}><TextLabel size={12} color={colors.textMuted}>{title}</TextLabel>{balance !== undefined ? <TextLabel size={11} color={colors.textDim}>Disponible {formatAmount(balance, denom)}</TextLabel> : null}</View>
      <View style={styles.tokenMain}>
        {readOnly ? <TextLabel size={25} weight={fonts.displayBold}>{amount}</TextLabel> : <Input value={amount} onChangeText={onAmountChange} keyboardType="decimal-pad" placeholder="0" style={styles.amountInput} containerStyle={styles.amountInputContainer} />}
        <PressableScale onPress={onPress} style={styles.denomSelect}><AssetIcon denom={denom} size={26} /><TextLabel size={12} weight={fonts.bodySemi}>{denom}</TextLabel><ChevronDown size={14} color={colors.textMuted} /></PressableScale>
      </View>
      {onMax ? <PressableScale onPress={onMax} style={styles.maxButton}><TextLabel size={11} color={colors.accent} weight={fonts.bodySemi}>MAX</TextLabel></PressableScale> : null}
    </Card>
  );
}

function QuoteRow({ label, value, success = false }: { label: string; value: string; success?: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return <View style={styles.rowBetween}><TextLabel size={12} color={colors.textMuted}>{label}</TextLabel><TextLabel size={12} color={success ? colors.success : colors.text} weight={fonts.bodySemi}>{value}</TextLabel></View>;
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  content: { paddingTop: spacing(1), gap: spacing(3) },
  gasIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: withAlpha(colors.success, 0.1) },
  tokenStack: { gap: spacing(2), position: 'relative' },
  tokenPanel: { gap: spacing(2), padding: spacing(3) },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tokenMain: { flexDirection: 'row', alignItems: 'center', minHeight: 42, gap: 6 },
  amountInputContainer: { flex: 1, minWidth: 0 },
  amountInput: { flex: 1, minWidth: 0, borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 0, fontFamily: fonts.displayBold, fontSize: 24 },
  denomSelect: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.bgElevated, borderRadius: radius.pill, padding: 6, paddingRight: 9 },
  maxButton: { alignSelf: 'flex-start', paddingVertical: 3 },
  swapButton: { alignSelf: 'center', marginVertical: -25, zIndex: 2, width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.primary, borderWidth: 4, borderColor: colors.bg },
  quoteCard: { gap: spacing(3) },
  divider: { height: 1, backgroundColor: colors.border },
  denomRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingVertical: spacing(2), borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  reviewAmount: { alignItems: 'center', paddingVertical: spacing(2) },
  reviewFee: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: withAlpha(colors.success, 0.09), padding: spacing(2), borderRadius: radius.md },
  center: { textAlign: 'center', marginBottom: spacing(3) },
  txText: { textAlign: 'center' },
});
