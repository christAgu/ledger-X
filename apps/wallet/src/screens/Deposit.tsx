import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Check, ChevronRight, Smartphone, Wallet } from 'lucide-react-native';
import { requestMomoDeposit, confirmMomoDeposit } from '@/services/rails/momo';
import { createMockHash } from '@/services/ledgerx/mockClient';
import { useWalletStore } from '@/state/wallet';
import { formatAmount } from '@/utils/format';
import { wait } from '@/utils/wait';
import { fonts, radius, spacing, type Palette } from '@/theme/tokens';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { Button, Card, Header, Input, PageTitle, PressableScale, Screen, SuccessView, TextLabel } from '@/components/ui';
import { OrbitLoader, ProcessingOverlay } from '@/components/OrbitLoader';

type DepositStep = 'method' | 'amount' | 'review' | 'pending' | 'success';

export default function Deposit() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const disabledTextColor = colors.text === '#FFFFFF' ? colors.textDim : colors.textMuted;
  const [step, setStep] = useState<DepositStep>('method');
  const [amount, setAmount] = useState('10 000');
  const [phone, setPhone] = useState(useWalletStore.getState().phone);
  const [requestId, setRequestId] = useState('');
  const [loading, setLoading] = useState(false);
  const updateBalance = useWalletStore((state) => state.updateBalance);
  const addTransaction = useWalletStore((state) => state.addTransaction);
  const value = Number(amount.replace(/\s/g, '').replace(',', '.')) || 0;
  const createRequest = async () => {
    setLoading(true);
    const [request] = await Promise.all([requestMomoDeposit(value, phone), wait(1600)]);
    setRequestId(request.id);
    setLoading(false);
    setStep('pending');
  };
  const finish = async () => {
    setLoading(true);
    await Promise.all([confirmMomoDeposit(requestId), wait(1600)]);
    updateBalance('aXOF', value);
    addTransaction({
      type: 'deposit',
      title: 'Dépôt MTN MoMo',
      detail: `MTN MoMo · ${phone}`,
      amount: value,
      denom: 'aXOF',
      status: 'success',
      hash: createMockHash(`deposit:${Date.now()}`),
      fee: 0,
    });
    setLoading(false);
    setStep('success');
  };

  if (step === 'success') {
    return <Screen><Header title="Dépôt terminé" /><SuccessView title="Dépôt réussi !" subtitle={`${formatAmount(value, 'aXOF')} ajoutés à votre solde.`} onDone={() => router.replace('/home')} /></Screen>;
  }
  if (step === 'pending') {
    return (
      <Screen style={styles.pendingScreen}>
        <Header title="Paiement en attente" />
        <View style={styles.pendingContent}>
          <OrbitLoader size={200} />
          <TextLabel size={23} weight={fonts.displayBold} style={styles.center}>Validez le paiement sur votre téléphone</TextLabel>
          <TextLabel size={14} color={colors.textMuted} style={styles.center}>Une demande MTN MoMo a été envoyée au {phone}.</TextLabel>
          <Card style={styles.instruction}><Smartphone size={19} color={colors.warning} /><TextLabel size={13} color={colors.textMuted} style={{ flex: 1 }}>Validez sur votre téléphone avec le code USSD *880#.</TextLabel></Card>
          <TextLabel size={12} color={colors.textDim}>Montant demandé · {formatAmount(value, 'aXOF')}</TextLabel>
        </View>
        <Button disabled={loading} onPress={finish}>{loading ? 'Vérification…' : 'J’ai validé le paiement'}</Button>
        <PressableScale onPress={() => setStep('review')} style={styles.cancel}><TextLabel size={13} color={colors.textDim}>Annuler le paiement</TextLabel></PressableScale>
        <ProcessingOverlay visible={loading} title="Vérification du paiement…" subtitle="Émission de aXOF · MsgMint" />
      </Screen>
    );
  }

  return (
    <Screen scroll style={styles.content}>
      <Header title="Recharger" />
      {step === 'method' ? (
        <>
          <PageTitle title="Choisissez un moyen" subtitle="Rechargez votre wallet en quelques secondes." />
          <PressableScale onPress={() => setStep('amount')} style={styles.methodRow}>
            <View style={styles.operatorIcon}><TextLabel size={13} weight={fonts.bodyBold} color="#191600">MTN</TextLabel></View>
            <View style={{ flex: 1, gap: 4 }}><TextLabel size={15} weight={fonts.bodySemi}>MTN MoMo</TextLabel><TextLabel size={12} color={colors.textDim}>Instantané · frais 0 XOF</TextLabel></View>
            <ChevronRight size={18} color={colors.textDim} />
          </PressableScale>
          <View style={[styles.methodRow, styles.methodDisabled]}><View style={[styles.operatorIcon, styles.moovIcon]}><TextLabel size={12} weight={fonts.bodyBold} color={colors.onPrimary}>Moov</TextLabel></View><View style={{ flex: 1 }}><TextLabel size={15} weight={fonts.bodySemi}>Moov Money</TextLabel><TextLabel size={12} color={disabledTextColor}>Bientôt disponible</TextLabel></View><TextLabel size={10} color={disabledTextColor}>BIENTÔT</TextLabel></View>
          <View style={[styles.methodRow, styles.methodDisabled]}><View style={[styles.operatorIcon, styles.celtiisIcon]}><TextLabel size={12} weight={fonts.bodyBold} color={colors.onPrimary}>C</TextLabel></View><View style={{ flex: 1 }}><TextLabel size={15} weight={fonts.bodySemi}>Celtiis Cash</TextLabel><TextLabel size={12} color={disabledTextColor}>Bientôt disponible</TextLabel></View><TextLabel size={10} color={disabledTextColor}>BIENTÔT</TextLabel></View>
          <Card style={styles.secureNote}><Wallet size={17} color={colors.accent} /><TextLabel size={12} color={colors.textMuted}>Votre argent est crédité en aXOF sur votre smart account Cosmos.</TextLabel></Card>
        </>
      ) : step === 'amount' ? (
        <>
          <PageTitle title="Montant du dépôt" subtitle="Combien souhaitez-vous recharger ?" />
          <Card style={styles.amountCard}><TextLabel size={12} color={colors.textDim}>MONTANT</TextLabel><Input value={amount} onChangeText={setAmount} keyboardType="number-pad" prefix="XOF" placeholder="0" style={styles.amountInput} /></Card>
          <View style={styles.chips}>{[5000, 10000, 25000, 50000].map((chip) => <PressableScale key={chip} onPress={() => setAmount(chip.toLocaleString('fr-FR'))} style={styles.chip}><TextLabel size={12} color={colors.textMuted}>{chip.toLocaleString('fr-FR')}</TextLabel></PressableScale>)}</View>
          <TextLabel size={12} color={colors.textDim}>Numéro MTN MoMo</TextLabel>
          <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Card style={styles.feeRow}><TextLabel size={13} color={colors.textMuted}>Frais</TextLabel><TextLabel size={13} color={colors.success} weight={fonts.bodySemi}>0 XOF · Offerts</TextLabel></Card>
          <View style={{ marginTop: 'auto' }}><Button disabled={value < 500} onPress={() => setStep('review')}>Continuer</Button></View>
        </>
      ) : (
        <>
          <PageTitle title="Vérifiez votre dépôt" subtitle="Confirmez les détails avant de continuer." />
          <Card style={styles.reviewCard}>
            <ReviewLine label="Moyen de paiement" value="MTN MoMo" />
            <ReviewLine label="Numéro" value={phone} />
            <View style={styles.divider} />
            <ReviewLine label="Vous payez" value={formatAmount(value, 'aXOF')} />
            <ReviewLine label="Frais" value="0 XOF" green />
            <ReviewLine label="Vous recevez" value={formatAmount(value, 'aXOF')} bold />
          </Card>
          <Card style={styles.disclaimer}><Check size={16} color={colors.success} /><TextLabel size={12} color={colors.success}>Aucun frais réseau · crédité en aXOF</TextLabel></Card>
          <View style={{ marginTop: 'auto' }}><Button disabled={loading} onPress={createRequest}>{loading ? 'Envoi de la demande…' : 'Confirmer et payer'}</Button></View>
        </>
      )}
      <ProcessingOverlay visible={loading} title="Envoi de la demande MoMo…" subtitle="Connexion à MTN MoMo" />
    </Screen>
  );
}

function ReviewLine({ label, value, green = false, bold = false }: { label: string; value: string; green?: boolean; bold?: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return <View style={styles.reviewLine}><TextLabel size={13} color={colors.textMuted}>{label}</TextLabel><TextLabel size={13} weight={bold ? fonts.bodyBold : fonts.bodySemi} color={green ? colors.success : colors.text}>{value}</TextLabel></View>;
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  content: { paddingTop: spacing(1), gap: spacing(3) },
  methodRow: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingHorizontal: spacing(3), borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  methodDisabled: { opacity: colors.text === '#FFFFFF' ? 0.58 : 1, backgroundColor: colors.text === '#FFFFFF' ? colors.surface : colors.surfaceAlt },
  operatorIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFCC00' },
  moovIcon: { backgroundColor: '#0EA4E9' },
  celtiisIcon: { backgroundColor: colors.primary },
  secureNote: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  amountCard: { gap: spacing(2) },
  amountInput: { fontFamily: fonts.displayBold, fontSize: 25 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  reviewCard: { gap: spacing(3) },
  reviewLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  divider: { height: 1, backgroundColor: colors.border },
  disclaimer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing(3) },
  pendingScreen: { paddingBottom: spacing(3) },
  pendingContent: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing(3), paddingHorizontal: spacing(2) },
  center: { textAlign: 'center' },
  instruction: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  cancel: { alignItems: 'center', padding: spacing(3) },
});
