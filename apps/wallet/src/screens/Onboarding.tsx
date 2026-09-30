import { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Check, ChevronDown, Fingerprint, ShieldCheck, Sparkles } from 'lucide-react-native';
import { colors, fonts, radius, spacing } from '@/theme/tokens';
import { ledgerx } from '@/services/ledgerx';
import { savePin, useWalletStore } from '@/state/wallet';
import { shortAddress } from '@/utils/format';
import {
  Button,
  Card,
  Input,
  OtpInput,
  PageTitle,
  PinPad,
  PressableScale,
  Screen,
  Sheet,
  StepIndicator,
  TextLabel,
} from '@/components/ui';

const slides = [
  { title: 'Votre argent local,\nsans frontières', text: 'Votre wallet digital pour garder le contrôle de votre argent.', icon: '✦' },
  { title: 'Rechargez avec MTN MoMo,\nrecevez en EUR et USD', text: 'Un seul wallet, plusieurs devises. Sans intermédiaire crypto.', icon: '⇄' },
  { title: 'Sans phrase secrète,\nsans frais réseau', text: 'Votre numéro suffit. Les frais sont offerts par le Trésor.', icon: '⌁' },
];

export function OnboardingLanding() {
  const [slide, setSlide] = useState(0);
  const { width } = useWindowDimensions();
  const slideWidth = width - spacing(8);
  return (
    <Screen gradient style={styles.landing}>
      <View style={styles.brandRow}>
        <View style={styles.brandMark}><Image source={require('@/assets/brand/acxa-mark.png')} style={styles.logo} resizeMode="contain" /></View>
        <TextLabel size={18} weight={fonts.bodyBold}>LEDGER <TextLabel size={18} weight={fonts.displayBold} color={colors.accent}>X</TextLabel></TextLabel>
        <View style={{ flex: 1 }} />
        <TextLabel size={12} color={colors.textMuted}>FR</TextLabel>
      </View>
      <FlatList
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(event) => setSlide(Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width))}
        scrollEventThrottle={16}
        keyExtractor={(item) => item.title}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: slideWidth }]}>
            <Animated.View entering={FadeInDown.duration(500)} style={styles.heroArt}>
              <View style={styles.orbitOne} />
              <View style={styles.orbitTwo} />
              <View style={styles.orbitCore}><Image source={require('@/assets/brand/acxa-mark.png')} style={styles.heroLogo} resizeMode="contain" /></View>
              <View style={styles.floatBadge}><TextLabel size={17} weight={fonts.displayBold} color={colors.success}>XOF</TextLabel></View>
              <View style={[styles.floatBadge, styles.floatBadgeAlt]}><TextLabel size={16} weight={fonts.displayBold} color={colors.accent}>€</TextLabel></View>
            </Animated.View>
            <TextLabel size={29} weight={fonts.displayBold} style={styles.slideCopy}>{item.title}</TextLabel>
            <TextLabel size={14} color={colors.textMuted} style={styles.slideCopy}>{item.text}</TextLabel>
          </View>
        )}
      />
      <View style={styles.dots}>
        {slides.map((_, index) => <View key={index} style={[styles.dot, slide === index && styles.dotActive]} />)}
      </View>
      <Button onPress={() => router.push('/(onboarding)/phone')} style={styles.landingButton}>Créer mon wallet</Button>
      <Button kind="ghost" onPress={() => router.push('/(onboarding)/phone')}>J&rsquo;ai déjà un compte</Button>
      <TextLabel size={11} color={colors.textDim} style={styles.center}>En continuant, vous acceptez nos conditions d&rsquo;utilisation.</TextLabel>
    </Screen>
  );
}

const countries = [
  { name: 'Bénin', flag: '🇧🇯', dial: '+229' }, { name: 'Côte d’Ivoire', flag: '🇨🇮', dial: '+225' },
  { name: 'Sénégal', flag: '🇸🇳', dial: '+221' }, { name: 'Togo', flag: '🇹🇬', dial: '+228' },
  { name: 'Mali', flag: '🇲🇱', dial: '+223' }, { name: 'Burkina Faso', flag: '🇧🇫', dial: '+226' },
  { name: 'Niger', flag: '🇳🇪', dial: '+227' }, { name: 'France', flag: '🇫🇷', dial: '+33' },
  { name: 'États-Unis', flag: '🇺🇸', dial: '+1' },
];

export function PhoneStep() {
  const [country, setCountry] = useState(countries[0]);
  const [phone, setPhoneInput] = useState('97 00 00 00');
  const [picker, setPicker] = useState(false);
  const setPhone = useWalletStore((state) => state.setPhone);
  const next = () => {
    setPhone(`${country.dial} ${phone}`);
    router.push('/(onboarding)/otp');
  };
  return (
    <Screen scroll>
      <StepIndicator step={0} total={6} />
      <PageTitle title="Votre numéro de téléphone" subtitle="Nous vous enverrons un code pour sécuriser votre wallet." />
      <PressableScale onPress={() => setPicker(true)} style={styles.countrySelect}>
        <TextLabel size={22}>{country.flag}</TextLabel>
        <View style={styles.countryText}><TextLabel size={14} weight={fonts.bodySemi}>{country.name}</TextLabel><TextLabel size={12} color={colors.textDim}>{country.dial}</TextLabel></View>
        <ChevronDown size={18} color={colors.textMuted} />
      </PressableScale>
      <Input value={phone} onChangeText={setPhoneInput} prefix={country.dial} keyboardType="phone-pad" placeholder="Votre numéro" />
      <Card style={styles.noteCard}><ShieldCheck size={18} color={colors.accent} /><TextLabel size={12} color={colors.textMuted} style={{ flex: 1 }}>Votre numéro est protégé par un chiffrement de bout en bout.</TextLabel></Card>
      <View style={styles.bottomAction}><Button onPress={next}>Continuer</Button></View>
      <Sheet visible={picker} title="Choisir un pays" onClose={() => setPicker(false)}>
        {countries.map((item) => (
          <PressableScale key={item.dial} onPress={() => { setCountry(item); setPicker(false); }} style={styles.countryRow}>
            <TextLabel size={20}>{item.flag}</TextLabel><TextLabel size={14} style={{ flex: 1 }}>{item.name}</TextLabel><TextLabel size={13} color={colors.textMuted}>{item.dial}</TextLabel>
          </PressableScale>
        ))}
      </Sheet>
    </Screen>
  );
}

export function OtpStep() {
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(30);
  useEffect(() => {
    if (!countdown) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);
  return (
    <Screen scroll>
      <StepIndicator step={1} total={6} />
      <PageTitle title="Vérifiez votre numéro" subtitle={`Saisissez le code envoyé au ${useWalletStore.getState().phone}`} />
      <OtpInput value={otp} onChange={setOtp} />
      <TextLabel size={13} color={colors.textMuted} style={styles.center}>Code démo : <TextLabel size={13} color={colors.accent} weight={fonts.bodySemi}>123456</TextLabel></TextLabel>
      <PressableScale onPress={() => setCountdown(30)} disabled={countdown > 0} style={styles.resend}>
        <TextLabel size={13} color={countdown > 0 ? colors.textDim : colors.accent}>{countdown > 0 ? `Renvoyer le code dans 00:${countdown.toString().padStart(2, '0')}` : 'Renvoyer le code'}</TextLabel>
      </PressableScale>
      <View style={styles.bottomAction}><Button disabled={otp.length !== 6} onPress={() => router.push('/(onboarding)/tag')}>Continuer</Button></View>
    </Screen>
  );
}

export function TagStep() {
  const [tag, setTagInput] = useState('');
  const [availability, setAvailability] = useState<{ tag: string; available: boolean } | null>(null);
  const setTag = useWalletStore((state) => state.setTag);
  const normalized = tag.toLowerCase();
  const validFormat = /^[a-z0-9_]{3,20}$/.test(normalized);
  const available = availability?.tag === normalized ? availability.available : null;
  const checking = validFormat && available === null;
  useEffect(() => {
    if (!validFormat) return;
    let active = true;
    const timer = setTimeout(() => {
      ledgerx.isTagAvailable(normalized).then((result) => { if (active) setAvailability({ tag: normalized, available: result }); });
    }, 350);
    return () => { active = false; clearTimeout(timer); };
  }, [normalized, validFormat]);
  const valid = available === true;
  return (
    <Screen scroll>
      <StepIndicator step={2} total={6} />
      <PageTitle title="Choisissez votre @tag" subtitle="Un identifiant simple pour recevoir de l'argent." />
      <Input value={tag} onChangeText={(value) => setTagInput(value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} prefix="@" placeholder="votre_tag" maxLength={20} autoCapitalize="none" />
      <TextLabel size={12} color={checking ? colors.textDim : valid ? colors.success : available === false ? colors.danger : colors.textDim}>
        {checking ? 'Vérification de la disponibilité…' : valid ? '✓ Ce tag est disponible' : available === false ? 'Ce tag est déjà utilisé' : '3 à 20 caractères · lettres, chiffres et _'}
      </TextLabel>
      <Card style={styles.tagPreview}><View style={styles.tagAvatar}><TextLabel size={20} weight={fonts.displayBold}>A</TextLabel></View><View style={{ flex: 1, gap: 4 }}><TextLabel size={14} weight={fonts.bodySemi}>Votre identifiant</TextLabel><TextLabel size={12} color={colors.textMuted}>Vos proches pourront vous envoyer de l&rsquo;argent via @{tag || 'votre_tag'}</TextLabel></View></Card>
      <View style={styles.bottomAction}><Button disabled={!valid} onPress={() => { setTag(tag); router.push('/(onboarding)/pin'); }}>Continuer</Button></View>
    </Screen>
  );
}

export function PinStep() {
  const [value, setValue] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState(false);
  const finish = async (pin: string) => {
    if (!firstPin) { setFirstPin(pin); setValue(''); return; }
    if (pin !== firstPin) { setError(true); setFirstPin(''); setValue(''); return; }
    await savePin(pin);
    router.push('/(onboarding)/biometrics');
  };
  return (
    <Screen>
      <StepIndicator step={3} total={6} />
      <PageTitle title={firstPin ? 'Confirmez votre code' : 'Créez votre code secret'} subtitle="Choisissez un code à 6 chiffres pour protéger votre wallet." />
      <View style={styles.pinSection}><PinPad value={value} onChange={(next) => { setValue(next); setError(false); }} onComplete={finish} error={error} /></View>
      {error ? <TextLabel color={colors.danger} size={13} style={styles.center}>Les codes ne correspondent pas. Recommencez.</TextLabel> : null}
    </Screen>
  );
}

export function BiometricsStep() {
  const updateSettings = useWalletStore((state) => state.updateSettings);
  const activate = async () => {
    const { authenticate } = await import('@/services/auth');
    const success = await authenticate('Activer la biométrie pour Ledger X');
    if (success) updateSettings({ biometricsEnabled: true });
    router.push('/(onboarding)/creating');
  };
  return (
    <Screen>
      <StepIndicator step={4} total={6} />
      <View style={styles.bioArt}><View style={styles.bioGlow}><Fingerprint color={colors.accent} size={76} strokeWidth={1.25} /></View><View style={styles.bioSpark}><Sparkles size={18} color={colors.glow} /></View></View>
      <View style={styles.bioCopy}><TextLabel size={27} weight={fonts.displayBold} style={styles.center}>Activer Face ID / empreinte</TextLabel><TextLabel size={14} color={colors.textMuted} style={styles.center}>Connectez-vous rapidement et sécurisez chaque action sensible.</TextLabel></View>
      <View style={styles.bottomAction}><Button onPress={activate}>Activer la biométrie</Button><Button kind="ghost" onPress={() => router.push('/(onboarding)/creating')}>Plus tard</Button></View>
    </Screen>
  );
}

export function CreatingStep() {
  const [step, setStep] = useState(0);
  const [address, setAddress] = useState('');
  const [failed, setFailed] = useState(false);
  const phone = useWalletStore((state) => state.phone);
  const tag = useWalletStore((state) => state.tag);
  const setAccount = useWalletStore((state) => state.setAccount);
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setStep(1);
        await new Promise((resolve) => setTimeout(resolve, 700));
        if (cancelled) return;
        setStep(2);
        await new Promise((resolve) => setTimeout(resolve, 650));
        if (cancelled) return;
        const account = await ledgerx.createSmartAccount({ phone, tag });
        if (cancelled) return;
        setAccount(account);
        setAddress(account.address);
        setStep(3);
      } catch {
        setFailed(true);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [phone, setAccount, tag]);
  return (
    <Screen>
      <StepIndicator step={5} total={6} />
      <View style={styles.creatingArt}><View style={styles.orbitOne} /><View style={styles.orbitTwo} /><View style={styles.orbitCore}><Image source={require('@/assets/brand/acxa-mark.png')} style={styles.heroLogo} resizeMode="contain" /></View></View>
      <TextLabel size={24} weight={fonts.displayBold} style={styles.center}>{step === 3 ? 'Votre wallet est prêt !' : 'Création de votre smart account Cosmos…'}</TextLabel>
      <View style={styles.createSteps}>
        {['Génération des clés MPC', 'Enregistrement x/auth', 'Subvention des frais (x/feegrant)'].map((label, index) => (
          <View style={styles.createStep} key={label}>
            <View style={[styles.stepCheck, index < step && styles.stepCheckDone]}>{index < step ? <Check size={14} color={colors.text} /> : <View style={styles.stepDot} />}</View>
            <TextLabel size={13} color={index < step ? colors.text : colors.textDim}>{label}</TextLabel>
          </View>
        ))}
      </View>
      {address ? <Card style={styles.addressCard}><TextLabel size={11} color={colors.textDim}>VOTRE ADRESSE COSMOS</TextLabel><TextLabel size={12} color={colors.accent}>{shortAddress(address)}</TextLabel></Card> : null}
      {failed ? <TextLabel color={colors.danger}>Une erreur est survenue, veuillez réessayer.</TextLabel> : null}
      {step === 3 ? <Button onPress={() => { useWalletStore.getState().setOnboarded(true); router.replace('/home'); }}>Accéder à mon wallet</Button> : <TextLabel size={12} color={colors.textDim} style={styles.center}>Cela ne prendra qu&rsquo;un instant…</TextLabel>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  landing: { paddingBottom: spacing(2), justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  brandMark: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 22, height: 24 },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing(3), paddingHorizontal: spacing(2) },
  heroArt: { width: 250, height: 250, alignItems: 'center', justifyContent: 'center', marginBottom: spacing(4) },
  orbitOne: { position: 'absolute', width: 230, height: 230, borderRadius: 115, borderWidth: 1, borderColor: 'rgba(138,180,255,.2)' },
  orbitTwo: { position: 'absolute', width: 174, height: 174, borderRadius: 87, borderWidth: 1, borderColor: 'rgba(138,180,255,.25)' },
  orbitCore: { width: 108, height: 108, borderRadius: 54, backgroundColor: '#0D2B5B', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', boxShadow: '0px 0px 24px rgba(159,196,255,0.4)' },
  heroLogo: { width: 62, height: 68 },
  floatBadge: { position: 'absolute', right: 18, top: 36, width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  floatBadgeAlt: { top: 'auto', bottom: 30, left: 22, right: 'auto' },
  center: { textAlign: 'center' },
  slideCopy: { textAlign: 'center', alignSelf: 'stretch', flexShrink: 1 },
  resend: { alignItems: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: spacing(3) },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { width: 20, backgroundColor: colors.accent },
  landingButton: { marginBottom: spacing(1) },
  countrySelect: { minHeight: 68, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing(3), flexDirection: 'row', alignItems: 'center', gap: spacing(3) },
  countryText: { flex: 1, gap: 4 },
  noteCard: { flexDirection: 'row', gap: spacing(2), alignItems: 'center', padding: spacing(3) },
  bottomAction: { marginTop: 'auto', gap: spacing(1) },
  countryRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing(3), borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  tagPreview: { flexDirection: 'row', gap: spacing(3), alignItems: 'center' },
  tagAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  pinSection: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bioArt: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bioGlow: { width: 160, height: 160, borderRadius: 80, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  bioSpark: { position: 'absolute', top: '32%', right: '26%' },
  bioCopy: { gap: spacing(2), paddingHorizontal: spacing(2) },
  creatingArt: { flex: 1, minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  createSteps: { gap: spacing(3), marginTop: spacing(1) },
  createStep: { flexDirection: 'row', alignItems: 'center', gap: spacing(3) },
  stepCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepCheckDone: { backgroundColor: colors.success, borderColor: colors.success },
  stepDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textDim },
  addressCard: { gap: spacing(1) },
});
