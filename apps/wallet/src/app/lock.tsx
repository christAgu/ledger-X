import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Fingerprint, LockKeyhole } from 'lucide-react-native';
import { authenticate } from '@/services/auth';
import { useWalletStore, verifyPin } from '@/state/wallet';
import { colors, fonts, spacing } from '@/theme/tokens';
import { PinPad, PressableScale, Screen, TextLabel } from '@/components/ui';

export default function LockScreen() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const displayName = useWalletStore((state) => state.displayName);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  useEffect(() => {
    let mounted = true;
    const unlockBiometric = async () => {
      const { isBiometricAvailable } = await import('@/services/auth');
      const available = await isBiometricAvailable();
      if (mounted) setBiometricAvailable(available);
      if (available && useWalletStore.getState().settings.biometricsEnabled) {
        const success = await authenticate('Déverrouiller Ledger X');
        if (success) router.replace('/home');
      }
    };
    void unlockBiometric();
    return () => { mounted = false; };
  }, []);

  const unlock = async (value: string) => {
    if (await verifyPin(value)) {
      setError(false);
      router.replace('/home');
    } else {
      setPin('');
      setError(true);
      shake.set(withSequence(withTiming(-9, { duration: 45 }), withTiming(9, { duration: 45 }), withTiming(-6, { duration: 45 }), withTiming(0, { duration: 45 })));
    }
  };

  return (
    <Screen style={styles.content}>
      <View style={styles.brand}><View style={styles.mark}><Image source={require('@/assets/brand/acxa-mark.png')} style={styles.logo} /></View><TextLabel size={17} weight={fonts.bodyBold}>LEDGER <TextLabel size={17} weight={fonts.displayBold} color={colors.accent}>X</TextLabel></TextLabel></View>
      <View style={styles.lockIcon}><LockKeyhole size={26} color={colors.accent} /></View>
      <TextLabel size={25} weight={fonts.displayBold}>Bon retour, {displayName.split(' ')[0]}</TextLabel>
      <TextLabel size={13} color={colors.textMuted}>Entrez votre code secret pour continuer.</TextLabel>
      <Animated.View style={[styles.pin, shakeStyle]}>
        <PinPad value={pin} onChange={(value) => { setPin(value); setError(false); }} onComplete={unlock} error={error} />
      </Animated.View>
      {error ? <TextLabel size={12} color={colors.danger}>Code incorrect · réessayez</TextLabel> : null}
      {biometricAvailable ? <PressableScale onPress={async () => { if (await authenticate('Déverrouiller Ledger X')) router.replace('/home'); }} style={styles.bioButton}><Fingerprint size={19} color={colors.accent} /><TextLabel size={13} color={colors.accent}>Utiliser la biométrie</TextLabel></PressableScale> : null}
      <View style={{ flex: 1 }} />
      <TextLabel size={12} color={colors.textDim}>Smart account Cosmos · sécurisé par MPC</TextLabel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', paddingTop: spacing(5), gap: spacing(2) },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginBottom: spacing(4) },
  mark: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  logo: { width: 21, height: 23 },
  lockIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginVertical: spacing(2) },
  pin: { width: '100%', flex: 1, justifyContent: 'center', alignItems: 'center' },
  bioButton: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing(2) },
});
