import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Building2, ChevronDown, CircleDollarSign, ShieldCheck, Smartphone, Users, type LucideIcon } from 'lucide-react-native';
import { authenticate } from '@/services/auth';
import { ledgerx } from '@/services/ledgerx';
import type { CashoutRail, Denom } from '@/services/ledgerx/types';
import { useWalletStore, verifyPin } from '@/state/wallet';
import { formatAmount, formatXof } from '@/utils/format';
import { eurToXof, valueInXof, xofToEur } from '@/services/rates';
import { wait } from '@/utils/wait';
import { fonts, radius, spacing, type Palette } from '@/theme/tokens';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { AssetIcon, Button, Card, Header, Input, PageTitle, PinPad, PressableScale, Screen, SegmentedControl, Sheet, StepIndicator, SuccessView, TextLabel } from '@/components/ui';
import { ProcessingOverlay } from '@/components/OrbitLoader';

type SendMode = '@tag Ledger X' | 'Mobile Money' | 'Compte bancaire';
const modes: SendMode[] = ['@tag Ledger X', 'Mobile Money', 'Compte bancaire'];
const denoms: Denom[] = ['EURC', 'USD', 'USDC', 'USDT', 'BTC', 'SOL'];

export function SendScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [mode, setMode] = useState<SendMode>('@tag Ledger X');
  const [step, setStep] = useState<'destination' | 'amount' | 'review' | 'success'>('destination');
  const [tag, setTag] = useState('fatou');
  const [tagLookup, setTagLookup] = useState<{ tag: string; recipient: { tag: string; address: string; displayName: string } | null } | null>(null);
  const [phone, setPhone] = useState('+229 96 12 34 56');
  const [operator, setOperator] = useState('MTN MoMo');
  const [country, setCountry] = useState('France');
  const [iban, setIban] = useState('');
  const [bankName, setBankName] = useState('');
  const [routing, setRouting] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('10');
  const [denom, setDenom] = useState<Denom>('EURC');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [txShort, setTxShort] = useState('');
  const balances = useWalletStore((state) => state.balances);
  const updateBalance = useWalletStore((state) => state.updateBalance);
  const syncBalances = useWalletStore((state) => state.syncBalances);
  const addTransaction = useWalletStore((state) => state.addTransaction);
  const value = Number(amount.replace(/\s/g, '').replace(',', '.')) || 0;
  const fee = mode === '@tag Ledger X' ? 0 : mode === 'Mobile Money' ? value * 0.01 : 500;
  const available = balances[denom];
  const amountIsValid = value > fee && value <= available;
  const normalizedTag = tag.trim().replace(/^@/, '').toLowerCase();
  const validTag = /^[a-z0-9_]{3,20}$/.test(normalizedTag);
  const resolved = tagLookup?.tag === normalizedTag ? tagLookup.recipient : null;

  useEffect(() => {
    if (mode !== '@tag Ledger X' || !validTag) return;
    let active = true;
    const timer = setTimeout(() => {
      ledgerx.resolveTag(normalizedTag).then((result) => { if (active) setTagLookup({ tag: normalizedTag, recipient: result }); });
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [mode, normalizedTag, validTag]);

  const next = () => {
    const valid =
      mode === '@tag Ledger X' ? !!resolved :
      mode === 'Mobile Money' ? phone.replace(/\D/g, '').length >= 8 :
      country === 'France' ? iban.replace(/\s/g, '').length >= 15 && bankName.length > 2 :
      routing.length === 9 && accountNumber.length >= 4 && bankName.length > 2;
    if (!valid) { setError('Vérifiez les informations du bénéficiaire.'); return; }
    setError('');
    setStep('amount');
  };
  const submit = async () => {
    if (!amountIsValid) { setError('Solde insuffisant ou montant trop faible.'); return; }
    if (await authenticate('Confirmer votre envoi')) await send();
    else setPinOpen(true);
  };
  const send = async () => {
    const destination = mode === '@tag Ledger X'
      ? resolved?.address ?? ''
      : mode === 'Mobile Money'
        ? phone
        : country === 'France' ? iban.replace(/\s/g, '') : `${routing}:${accountNumber}`;
    setPinOpen(false);
    setLoading(true);
    setError('');
    try {
      const [result] = await Promise.all([
        ledgerx.signAndBroadcast({ type: 'MsgSend', toAddress: destination, denom, amount: value, memo: mode }),
        wait(1600),
      ]);
      if (result.status !== 'success') {
        setError('Le transfert a échoué. Vérifiez votre solde et réessayez.');
        return;
      }
      setTxShort(`${result.txHash.slice(0, 8)}…${result.txHash.slice(-6)}`);
      const accountAddress = useWalletStore.getState().account?.address;
      const syncedBalances = accountAddress
        ? await ledgerx.getBalances(accountAddress).catch(() => ({}))
        : {};
      syncBalances(syncedBalances);
      if (Object.keys(syncedBalances).length === 0) updateBalance(denom, -value);
      addTransaction({
        type: 'send',
        title: mode === '@tag Ledger X' ? `Envoyé à @${tag}` : mode === 'Mobile Money' ? `Envoi ${operator}` : 'Virement bancaire',
        detail: mode === '@tag Ledger X' ? `${resolved?.displayName ?? tag} · Ledger X` : mode === 'Mobile Money' ? `${operator} · ${phone}` : `${country} · ${bankName}`,
        amount: -value,
        denom,
        status: 'success',
        hash: result.txHash,
        fee,
      });
      setStep('success');
    } catch {
      setError('Le transfert a échoué. Vérifiez votre connexion et réessayez.');
    } finally {
      setLoading(false);
    }
  };
  const submitPin = async (code: string) => {
    if (await verifyPin(code)) { setPinError(false); await send(); }
    else { setPin(''); setPinError(true); }
  };
  if (step === 'success') {
    return <Screen><Header title="Envoi confirmé" /><SuccessView title="Envoi effectué" subtitle={`${formatAmount(value, denom)} envoyés ${mode === '@tag Ledger X' ? `à @${tag}` : ''}.`} detail={`Tx ${txShort} · frais offerts par x/feegrant`} onDone={() => router.replace('/home')} /></Screen>;
  }
  return (
    <Screen scroll style={styles.content}>
      <Header title="Envoyer" />
      <StepIndicator step={step === 'destination' ? 0 : step === 'amount' ? 1 : 2} total={3} />
      {step === 'destination' ? (
        <>
          <PageTitle title="À qui envoyer ?" subtitle="Choisissez votre mode de transfert." />
          <SegmentedControl options={modes} selected={mode} onSelect={(value) => { setMode(value as SendMode); setError(''); }} />
          {mode === '@tag Ledger X' ? (
            <>
              <Input value={tag} onChangeText={setTag} prefix="@" placeholder="Rechercher un @tag" />
              <TextLabel size={11} color={resolved ? colors.success : colors.textDim}>{resolved ? `✓ ${resolved.displayName} · ${resolved.tag}` : 'Les tags Ledger X sont sans frais.'}</TextLabel>
              <TextLabel size={12} color={colors.textDim} style={styles.fieldLabel}>Contacts récents</TextLabel>
              {['fatou', 'moussa', 'koffi'].map((contact) => <PressableScale key={contact} onPress={() => setTag(contact)} style={styles.contactRow}><View style={styles.contactAvatar}><TextLabel size={13} weight={fonts.displayBold}>{contact[0]?.toUpperCase()}</TextLabel></View><View style={{ flex: 1 }}><TextLabel size={13} weight={fonts.bodySemi}>{contact[0]?.toUpperCase()}{contact.slice(1)} A.</TextLabel><TextLabel size={11} color={colors.textDim}>@{contact}</TextLabel></View><Users size={17} color={colors.textDim} /></PressableScale>)}
            </>
          ) : mode === 'Mobile Money' ? (
            <>
              <TextLabel size={12} color={colors.textDim}>Opérateur</TextLabel>
              <SegmentedControl options={['MTN MoMo', 'Moov Money']} selected={operator} onSelect={setOperator} />
              <TextLabel size={12} color={colors.textDim}>Numéro mobile money</TextLabel>
              <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <Card style={styles.feeHint}><TextLabel size={12} color={colors.textMuted}>Frais de transfert</TextLabel><TextLabel size={12} color={colors.text}>1 %</TextLabel></Card>
            </>
          ) : (
            <>
              <TextLabel size={12} color={colors.textDim}>Pays du compte</TextLabel>
              <SegmentedControl options={['France', 'États-Unis']} selected={country} onSelect={setCountry} />
              {country === 'France' ? <><TextLabel size={12} color={colors.textDim}>IBAN</TextLabel><Input value={iban} onChangeText={setIban} placeholder="FR76 3000 6000 0112 3456 7890 189" autoCapitalize="characters" /></> :
                <><TextLabel size={12} color={colors.textDim}>Routing number · 9 chiffres</TextLabel><Input value={routing} onChangeText={(text) => setRouting(text.replace(/\D/g, '').slice(0, 9))} keyboardType="number-pad" placeholder="021000021" /><TextLabel size={12} color={colors.textDim}>Account number</TextLabel><Input value={accountNumber} onChangeText={setAccountNumber} keyboardType="number-pad" placeholder="Votre numéro de compte" /></>}
              <TextLabel size={12} color={colors.textDim}>Nom du bénéficiaire</TextLabel><Input value={bankName} onChangeText={setBankName} placeholder="Nom complet" autoCapitalize="words" />
            </>
          )}
          {error ? <TextLabel size={12} color={colors.danger}>{error}</TextLabel> : null}
          <View style={{ marginTop: 'auto' }}><Button onPress={next}>Continuer</Button></View>
        </>
      ) : step === 'amount' ? (
        <>
          <PageTitle title="Montant à envoyer" subtitle={mode === '@tag Ledger X' ? `Vers @${tag}` : mode === 'Mobile Money' ? `Vers ${phone}` : `Vers ${bankName}`} />
          <Card style={styles.amountCard}>
            <View style={styles.rowBetween}><TextLabel size={12} color={colors.textDim}>Montant</TextLabel><PressableScale onPress={() => setPickerOpen(true)} style={styles.currencyButton}><AssetIcon denom={denom} size={24} /><TextLabel size={12} weight={fonts.bodySemi}>{denom}</TextLabel><ChevronDown size={14} color={colors.textDim} /></PressableScale></View>
            <Input value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" style={styles.amountInput} />
            <TextLabel size={11} color={colors.textDim}>≈ {formatXof(valueInXof(value, denom))}</TextLabel>
            <View style={styles.rowBetween}><TextLabel size={11} color={colors.textDim}>Disponible</TextLabel><PressableScale onPress={() => setAmount(String(available))}><TextLabel size={11} color={colors.accent}>{formatAmount(available, denom)} · MAX</TextLabel></PressableScale></View>
          </Card>
          <Card style={styles.feeCard}><ReviewLine label="Frais de transfert" value={fee === 0 ? '0 XOF · Gratuit' : formatAmount(fee, denom)} /><ReviewLine label="Le bénéficiaire reçoit" value={formatAmount(value - fee, denom)} green /></Card>
          <Card style={styles.feeHint}><ShieldCheck size={16} color={colors.success} /><TextLabel size={12} color={colors.success}>{mode === '@tag Ledger X' ? 'Transfert instantané, sans frais.' : 'Frais réseau offerts par le Trésor.'}</TextLabel></Card>
          {error ? <TextLabel size={12} color={colors.danger}>{error}</TextLabel> : null}
          <View style={{ marginTop: 'auto' }}><Button onPress={() => { if (!amountIsValid) setError('Solde insuffisant ou montant trop faible.'); else { setError(''); setStep('review'); } }}>Continuer</Button></View>
          <Sheet visible={pickerOpen} title="Choisir une devise" onClose={() => setPickerOpen(false)}>
            {denoms.map((item) => <PressableScale key={item} onPress={() => { setDenom(item); setPickerOpen(false); }} style={styles.denomRow}><AssetIcon denom={item} size={34} /><TextLabel size={13} weight={fonts.bodySemi} style={{ flex: 1 }}>{item}</TextLabel><TextLabel size={12} color={colors.textMuted}>{formatAmount(balances[item], item)}</TextLabel></PressableScale>)}
          </Sheet>
        </>
      ) : (
        <>
          <PageTitle title="Vérifiez votre envoi" subtitle="Vérifiez les informations avant de confirmer." />
          <Card style={styles.reviewCard}>
            <ReviewLine label="Destinataire" value={mode === '@tag Ledger X' ? `@${tag} · ${resolved?.displayName ?? 'Ledger X'}` : mode === 'Mobile Money' ? `${operator} · ${phone}` : `${country} · ${bankName}`} />
            <ReviewLine label="Montant" value={formatAmount(value, denom)} />
            <ReviewLine label="Frais" value={fee === 0 ? 'Offerts' : formatAmount(fee, denom)} green />
            <View style={styles.divider} />
            <ReviewLine label="Total débité" value={formatAmount(value, denom)} bold />
          </Card>
          <Card style={styles.feeHint}><ShieldCheck size={16} color={colors.success} /><TextLabel size={12} color={colors.success}>Transaction signée par votre smart account x/auth.</TextLabel></Card>
          {error ? <TextLabel size={12} color={colors.danger}>{error}</TextLabel> : null}
          <View style={{ marginTop: 'auto' }}><Button disabled={loading} onPress={submit}>{loading ? 'Confirmation…' : 'Confirmer l’envoi'}</Button></View>
        </>
      )}
      <Sheet visible={pinOpen} title="Confirmez avec votre code" onClose={() => setPinOpen(false)}>
        <TextLabel size={13} color={colors.textMuted} style={styles.center}>Saisissez votre code secret pour confirmer.</TextLabel>
        <PinPad value={pin} onChange={(next) => { setPin(next); setPinError(false); }} onComplete={submitPin} error={pinError} />
        {pinError ? <TextLabel size={12} color={colors.danger} style={styles.center}>Code incorrect. Réessayez.</TextLabel> : null}
      </Sheet>
      <ProcessingOverlay visible={loading} title="Envoi en cours…" subtitle="Signature du smart account · MsgSend" />
    </Screen>
  );
}

export function CashoutScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [rail, setRail] = useState<CashoutRail>('mtn-momo');
  const [step, setStep] = useState<'destination' | 'amount' | 'review' | 'success'>('destination');
  const [destination, setDestination] = useState(useWalletStore.getState().phone);
  const [amount, setAmount] = useState('25 000');
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txShort, setTxShort] = useState('');
  const balances = useWalletStore((state) => state.balances);
  const updateBalance = useWalletStore((state) => state.updateBalance);
  const syncBalances = useWalletStore((state) => state.syncBalances);
  const addTransaction = useWalletStore((state) => state.addTransaction);
  const value = Number(amount.replace(/\s/g, '').replace(',', '.')) || 0;
  const fee = value * 0.01;
  const availableXof = Math.floor(eurToXof(balances.EURC));
  const debitBaseUnits = xofToEurcDebitBaseUnits(value);
  const debitEurc = Number(debitBaseUnits) / 1_000_000;
  const railName = rail === 'mtn-momo' ? 'MTN MoMo' : rail === 'moov-money' ? 'Moov Money' : 'Compte bancaire';
  const submit = async () => {
    if (!Number.isSafeInteger(value) || value <= 0 || debitEurc > balances.EURC) { setError('Solde insuffisant pour ce retrait.'); return; }
    if (await authenticate('Confirmer votre retrait')) await cashout();
    else setPinOpen(true);
  };
  const cashout = async () => {
    setPinOpen(false);
    setLoading(true);
    setError('');
    try {
      const [result] = await Promise.all([
        ledgerx.signAndBroadcast({ type: 'MsgCashout', denom: 'EURC', amount: debitEurc, rail, destination }),
        wait(1600),
      ]);
      if (result.status !== 'success') {
        setError('Le retrait a échoué. Vérifiez votre solde et réessayez.');
        return;
      }
      setTxShort(`${result.txHash.slice(0, 8)}…${result.txHash.slice(-6)}`);
      const accountAddress = useWalletStore.getState().account?.address;
      const syncedBalances = accountAddress
        ? await ledgerx.getBalances(accountAddress).catch(() => ({}))
        : {};
      syncBalances(syncedBalances);
      if (Object.keys(syncedBalances).length === 0) updateBalance('EURC', -debitEurc);
      addTransaction({ type: 'cashout', title: `Retrait ${railName}`, detail: `${destination} · ${formatXof(value)}`, amount: -debitEurc, denom: 'EURC', status: 'success', hash: result.txHash, fee: xofToEur(fee) });
      setStep('success');
    } catch {
      setError('Le retrait a échoué. Vérifiez votre connexion et réessayez.');
    } finally {
      setLoading(false);
    }
  };
  const submitPin = async (code: string) => {
    if (await verifyPin(code)) { setPinError(false); await cashout(); }
    else { setPin(''); setPinError(true); }
  };
  if (step === 'success') return <Screen><Header title="Retrait confirmé" /><SuccessView title="Retrait effectué" subtitle={`${formatXof(value - fee)} envoyés sur ${railName}.`} detail={`Tx ${txShort} · frais réseau offerts`} onDone={() => router.replace('/home')} /></Screen>;
  return (
    <Screen scroll style={styles.content}>
      <Header title="Retirer" />
      <StepIndicator step={step === 'destination' ? 0 : step === 'amount' ? 1 : 2} total={3} />
      {step === 'destination' ? (
        <>
          <PageTitle title="Où retirer votre argent ?" subtitle="Choisissez une destination." />
          <View style={{ gap: spacing(2) }}>
            <DestinationCard active={rail === 'mtn-momo'} icon={Smartphone} title="MTN MoMo" subtitle="Bénin · Instantané" onPress={() => setRail('mtn-momo')} />
            <DestinationCard active={rail === 'moov-money'} icon={Smartphone} title="Moov Money" subtitle="Bénin · Instantané" onPress={() => setRail('moov-money')} />
            <DestinationCard active={rail === 'bank'} icon={Building2} title="Compte bancaire" subtitle="Virement sous 1–2 jours" onPress={() => setRail('bank')} />
          </View>
          <TextLabel size={12} color={colors.textDim}>Numéro mobile ou coordonnées de compte</TextLabel>
          <Input value={destination} onChangeText={setDestination} keyboardType={rail === 'bank' ? 'default' : 'phone-pad'} placeholder={rail === 'bank' ? 'IBAN / numéro de compte' : '+229 97 00 00 00'} />
          <Button onPress={() => { if (destination.length < 6) setError('Saisissez une destination valide.'); else { setError(''); setStep('amount'); } }}>Continuer</Button>
          {error ? <TextLabel size={12} color={colors.danger}>{error}</TextLabel> : null}
        </>
      ) : step === 'amount' ? (
        <>
          <PageTitle title="Montant du retrait" subtitle={`Vers ${railName} · ${destination}`} />
          <Card style={styles.amountCard}><TextLabel size={12} color={colors.textDim}>MONTANT EN XOF</TextLabel><Input value={amount} onChangeText={setAmount} keyboardType="number-pad" prefix="XOF" placeholder="0" style={styles.amountInput} /><View style={styles.rowBetween}><TextLabel size={11} color={colors.textDim}>Disponible</TextLabel><TextLabel size={11} color={colors.textMuted}>{formatXof(availableXof)}</TextLabel></View></Card>
          <View style={styles.chips}>{[5000, 10000, 25000, 50000].map((chip) => <PressableScale key={chip} onPress={() => setAmount(chip.toLocaleString('fr-FR'))} style={styles.chip}><TextLabel size={12} color={colors.textMuted}>{chip.toLocaleString('fr-FR')}</TextLabel></PressableScale>)}</View>
          <Card style={styles.feeCard}><ReviewLine label="Frais de retrait (1 %)" value={formatXof(fee)} /><ReviewLine label="Vous recevez" value={formatXof(value - fee)} green /></Card>
          <Button onPress={() => { if (!Number.isSafeInteger(value) || value <= 0 || debitEurc > balances.EURC) setError('Solde insuffisant.'); else { setError(''); setStep('review'); } }}>Continuer</Button>
          {error ? <TextLabel size={12} color={colors.danger}>{error}</TextLabel> : null}
        </>
      ) : (
        <>
          <PageTitle title="Confirmez votre retrait" subtitle="La demande sera envoyée à votre opérateur." />
          <Card style={styles.reviewCard}><ReviewLine label="Destination" value={`${railName} · ${destination}`} /><ReviewLine label="Montant" value={formatXof(value)} /><ReviewLine label="Frais (1 %)" value={formatXof(fee)} /><View style={styles.divider} /><ReviewLine label="Débité" value={formatAmount(debitEurc, 'EURC')} /><ReviewLine label="Vous recevez" value={formatXof(value - fee)} green bold /></Card>
          <Card style={styles.feeHint}><ShieldCheck size={16} color={colors.success} /><TextLabel size={12} color={colors.success}>Frais réseau offerts par le Trésor.</TextLabel></Card>
          {error ? <TextLabel size={12} color={colors.danger}>{error}</TextLabel> : null}
          <Button disabled={loading} onPress={submit}>{loading ? 'Confirmation…' : 'Confirmer le retrait'}</Button>
        </>
      )}
      <Sheet visible={pinOpen} title="Confirmez avec votre code" onClose={() => setPinOpen(false)}>
        <TextLabel size={13} color={colors.textMuted} style={styles.center}>Saisissez votre code secret pour confirmer.</TextLabel>
        <PinPad value={pin} onChange={(next) => { setPin(next); setPinError(false); }} onComplete={submitPin} error={pinError} />
        {pinError ? <TextLabel size={12} color={colors.danger} style={styles.center}>Code incorrect. Réessayez.</TextLabel> : null}
      </Sheet>
      <ProcessingOverlay visible={loading} title="Retrait en cours…" subtitle={`Vers ${railName}`} />
    </Screen>
  );
}

function DestinationCard({ active, icon: Icon, title, subtitle, onPress }: { active: boolean; icon: LucideIcon; title: string; subtitle: string; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return <PressableScale onPress={onPress} style={[styles.destinationCard, active && styles.destinationActive]}><View style={styles.destinationIcon}><Icon size={18} color={colors.accent} /></View><View style={{ flex: 1, gap: 4 }}><TextLabel size={14} weight={fonts.bodySemi}>{title}</TextLabel><TextLabel size={11} color={colors.textDim}>{subtitle}</TextLabel></View>{active ? <CircleDollarSign size={19} color={colors.accent} /> : null}</PressableScale>;
}

function ReviewLine({ label, value, green = false, bold = false }: { label: string; value: string; green?: boolean; bold?: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return <View style={styles.reviewLine}><TextLabel size={13} color={colors.textMuted}>{label}</TextLabel><TextLabel size={13} weight={bold ? fonts.bodyBold : fonts.bodySemi} color={green ? colors.success : colors.text}>{value}</TextLabel></View>;
}

function xofToEurcDebitBaseUnits(xof: number): bigint {
  if (!Number.isSafeInteger(xof) || xof <= 0) return 0n;
  return (BigInt(xof) * 1_000_000_000n + 655_956n) / 655_957n;
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  content: { paddingTop: spacing(1), gap: spacing(3) },
  fieldLabel: { marginTop: spacing(1) },
  contactRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing(2), borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  contactAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  feeHint: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), padding: spacing(3) },
  amountCard: { gap: spacing(2) },
  amountInput: { fontFamily: fonts.displayBold, fontSize: 25 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  currencyButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.bgElevated, borderRadius: radius.pill, padding: 6 },
  feeCard: { gap: spacing(3) },
  reviewCard: { gap: spacing(3) },
  reviewLine: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing(2) },
  divider: { height: 1, backgroundColor: colors.border },
  center: { textAlign: 'center', marginBottom: spacing(3) },
  destinationCard: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: spacing(2), borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: spacing(3) },
  destinationActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  destinationIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: colors.primarySoft },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  denomRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), minHeight: 54, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
});
