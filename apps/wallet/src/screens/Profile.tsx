import { useState } from 'react';
import type { ComponentType } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { ChevronRight, Copy, QrCode, ShieldCheck, Wallet } from 'lucide-react-native';
import { savePin, useWalletStore, verifyPin } from '@/state/wallet';
import { shortAddress } from '@/utils/format';
import { colors, fonts, radius, spacing } from '@/theme/tokens';
import { Button, Card, Header, PinPad, PressableScale, Screen, Sheet, SwitchRow, TextLabel, Toast } from '@/components/ui';

const fallbackAddress = 'ledgerx1q9p8v6d4c2x7m3n5k8h0t6w4s2j9p7f3d5g1c';

export default function Profile() {
  const account = useWalletStore((state) => state.account);
  const tag = useWalletStore((state) => state.tag);
  const displayName = useWalletStore((state) => state.displayName);
  const settings = useWalletStore((state) => state.settings);
  const updateSettings = useWalletStore((state) => state.updateSettings);
  const resetDemo = useWalletStore((state) => state.resetDemo);
  const [currencySheet, setCurrencySheet] = useState(false);
  const [resetSheet, setResetSheet] = useState(false);
  const [pinSheet, setPinSheet] = useState(false);
  const [autoLockSheet, setAutoLockSheet] = useState(false);
  const [pinStep, setPinStep] = useState<'current' | 'new' | 'confirm'>('current');
  const [pinValue, setPinValue] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [toast, setToast] = useState(false);
  const address = account?.address ?? fallbackAddress;
  const copy = async (value: string) => { await Clipboard.setStringAsync(value); setToast(true); setTimeout(() => setToast(false), 1600); };
  const reset = () => {
    resetDemo();
    setResetSheet(false);
    router.replace('/welcome');
  };
  const closePinSheet = () => {
    setPinSheet(false);
    setPinStep('current');
    setPinValue('');
    setNewPin('');
    setPinError(false);
  };
  const advancePinChange = async (value: string) => {
    setPinValue('');
    setPinError(false);
    if (pinStep === 'current') {
      if (await verifyPin(value)) setPinStep('new');
      else setPinError(true);
      return;
    }
    if (pinStep === 'new') {
      setNewPin(value);
      setPinStep('confirm');
      return;
    }
    if (value !== newPin) {
      setPinStep('new');
      setNewPin('');
      setPinError(true);
      return;
    }
    await savePin(value);
    closePinSheet();
  };

  return (
    <Screen scroll style={styles.content}>
      <Header title="Profil" back={false} />
      <View style={styles.profileHero}>
        <View style={styles.avatarRing}><Image source={require('@/assets/brand/avatar-acxa-preview.png')} style={styles.avatar} /></View>
        <TextLabel size={22} weight={fonts.displayBold}>{displayName}</TextLabel>
        <TextLabel size={13} color={colors.accent}>@{tag || 'amina'}</TextLabel>
        <PressableScale onPress={() => copy(address)} style={styles.address}>
          <TextLabel size={11} color={colors.textMuted}>{shortAddress(address)}</TextLabel><Copy size={14} color={colors.accent} />
        </PressableScale>
      <PressableScale onPress={() => router.push({ pathname: '/receive', params: { rail: 'Ledger X' } })} style={styles.qrLink}><QrCode size={15} color={colors.accent} /><TextLabel size={12} color={colors.accent}>Mon QR code</TextLabel></PressableScale>
      </View>

      <TextLabel size={12} color={colors.textDim} weight={fonts.bodySemi}>SÉCURITÉ</TextLabel>
      <Card style={styles.sectionCard}>
        <SwitchRow title="Biométrie" subtitle="Face ID / empreinte digitale" value={settings.biometricsEnabled} onValueChange={(biometricsEnabled) => updateSettings({ biometricsEnabled })} />
        <ProfileLink icon={ShieldCheck} title="Changer le code secret" subtitle="Mettez à jour votre code à 6 chiffres" onPress={() => setPinSheet(true)} />
        <ProfileLink icon={ShieldCheck} title="Verrouillage automatique" subtitle="Après 30 secondes d'inactivité" onPress={() => setAutoLockSheet(true)} />
      </Card>

      <TextLabel size={12} color={colors.textDim} weight={fonts.bodySemi}>PRÉFÉRENCES</TextLabel>
      <Card style={styles.sectionCard}>
        <ProfileLink icon={Wallet} title="Devise d'affichage" subtitle={settings.displayCurrency} onPress={() => setCurrencySheet(true)} />
        <SwitchRow title="Masquer les soldes" subtitle="Sur l'écran d'accueil" value={settings.hideBalances} onValueChange={(hideBalances) => updateSettings({ hideBalances })} />
      </Card>

      <TextLabel size={12} color={colors.textDim} weight={fonts.bodySemi}>RÉSEAU</TextLabel>
      <Card style={styles.networkCard}>
        <View style={styles.networkMark}><Image source={require('@/assets/brand/acxa-mark.png')} style={styles.networkLogo} /></View>
        <View style={{ flex: 1, gap: 5 }}><TextLabel size={14} weight={fonts.bodySemi}>Ledger X · Cosmos SDK</TextLabel><TextLabel size={12} color={colors.textDim}>App-chain · CometBFT · x/feegrant</TextLabel></View>
        <View style={styles.onlineDot} />
        <TextLabel size={11} color={colors.success}>Gasless</TextLabel>
      </Card>
      <Button kind="secondary" onPress={() => router.push('/receive')}>Coordonnées de réception</Button>
      <Button kind="ghost" onPress={() => setResetSheet(true)}>Réinitialiser la démo</Button>
      <TextLabel size={10} color={colors.textDim} style={styles.center}>Ledger X · Version démo 0.1 · Cosmos smart account</TextLabel>

      <Sheet visible={currencySheet} title="Devise d'affichage" onClose={() => setCurrencySheet(false)}>
        {(['XOF', 'EUR', 'USD'] as const).map((currency) => (
          <PressableScale key={currency} onPress={() => { updateSettings({ displayCurrency: currency }); setCurrencySheet(false); }} style={styles.currencyRow}>
            <TextLabel size={15} weight={fonts.bodySemi}>{currency}</TextLabel><TextLabel size={13} color={colors.textDim}>{currency === 'XOF' ? 'Franc CFA' : currency === 'EUR' ? 'Euro' : 'Dollar américain'}</TextLabel><View style={{ flex: 1 }} />{settings.displayCurrency === currency ? <TextLabel color={colors.accent}>✓</TextLabel> : null}
          </PressableScale>
        ))}
      </Sheet>
      <Sheet visible={resetSheet} title="Réinitialiser la démo ?" onClose={() => setResetSheet(false)}>
        <TextLabel size={14} color={colors.textMuted}>Votre wallet et ses transactions seront réinitialisés aux données de démonstration.</TextLabel>
        <Button onPress={reset}>Réinitialiser le wallet</Button>
      </Sheet>
      <Sheet visible={pinSheet} title={pinStep === 'current' ? 'Code actuel' : pinStep === 'new' ? 'Nouveau code secret' : 'Confirmer le nouveau code'} onClose={closePinSheet}>
        <TextLabel size={13} color={colors.textMuted} style={styles.pinHint}>
          {pinStep === 'current' ? 'Saisissez votre code actuel.' : pinStep === 'new' ? 'Choisissez un nouveau code à 6 chiffres.' : 'Saisissez à nouveau votre nouveau code.'}
        </TextLabel>
        <PinPad value={pinValue} onChange={(value) => { setPinValue(value); setPinError(false); }} onComplete={advancePinChange} error={pinError} />
        {pinError ? <TextLabel size={12} color={colors.danger} style={styles.pinHint}>{pinStep === 'current' ? 'Code incorrect. Réessayez.' : 'Les codes ne correspondent pas.'}</TextLabel> : null}
      </Sheet>
      <Sheet visible={autoLockSheet} title="Verrouillage automatique" onClose={() => setAutoLockSheet(false)}>
        <TextLabel size={14} color={colors.textMuted}>Votre wallet se verrouille automatiquement lorsque l’application reste en arrière-plan pendant 30 secondes.</TextLabel>
        <Button kind="secondary" onPress={() => setAutoLockSheet(false)}>Compris</Button>
      </Sheet>
      <Toast message="Adresse copiée" visible={toast} />
    </Screen>
  );
}

function ProfileLink({ icon: Icon, title, subtitle, onPress }: { icon: ComponentType<{ size?: number; color?: string }>; title: string; subtitle: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={styles.profileLink}>
      <View style={styles.linkIcon}><Icon size={17} color={colors.accent} /></View>
      <View style={{ flex: 1, gap: 4 }}><TextLabel size={13} weight={fonts.bodySemi}>{title}</TextLabel><TextLabel size={11} color={colors.textDim}>{subtitle}</TextLabel></View>
      <ChevronRight size={18} color={colors.textDim} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing(1), gap: spacing(2) },
  profileHero: { alignItems: 'center', gap: spacing(1.5), paddingVertical: spacing(3) },
  avatarRing: { padding: 3, borderWidth: 1, borderColor: colors.border, borderRadius: 38 },
  avatar: { width: 66, height: 66, borderRadius: 33 },
  address: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.surface },
  qrLink: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 4 },
  sectionCard: { paddingVertical: spacing(1), paddingHorizontal: spacing(3) },
  networkCard: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), padding: spacing(3) },
  networkMark: { width: 44, height: 44, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  networkLogo: { width: 25, height: 28 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  profileLink: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing(2), borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  linkIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  currencyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), minHeight: 54, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  center: { textAlign: 'center', marginTop: spacing(1) },
  pinHint: { textAlign: 'center', marginBottom: spacing(3) },
});
