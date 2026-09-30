import { useEffect, useId } from 'react';
import { Image, Modal, StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Circle, Defs, RadialGradient, Stop, Svg } from 'react-native-svg';
import { fonts, spacing, type Palette } from '@/theme/tokens';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { TextLabel } from '@/components/ui';

type OrbitElectronProps = {
  size: number;
  radius: number;
  haloSize: number;
  coreSize: number;
  duration: number;
  direction: 1 | -1;
  startAngle: number;
  reducedMotion: boolean;
};

function OrbitElectron({ size, radius, haloSize, coreSize, duration, direction, startAngle, reducedMotion }: OrbitElectronProps) {
  const styles = useThemedStyles(makeStyles);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!reducedMotion) {
      progress.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
    }
    return () => cancelAnimation(progress);
  }, [duration, progress, reducedMotion]);

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${startAngle + progress.value * direction * 360}deg` }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, orbitStyle]}>
      <View style={[
        styles.electronHalo,
        {
          width: haloSize,
          height: haloSize,
          borderRadius: haloSize / 2,
          top: size / 2 - radius - haloSize / 2,
          left: size / 2 - haloSize / 2,
        },
      ]}>
        <View style={[styles.electronCore, { width: coreSize, height: coreSize, borderRadius: coreSize / 2 }]} />
      </View>
    </Animated.View>
  );
}

export function OrbitLoader({ size = 220 }: { size?: number }) {
  const styles = useThemedStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const nucleusScale = useSharedValue(1);
  const gradientId = `orbit-glow-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  useEffect(() => {
    if (!reducedMotion) {
      nucleusScale.value = withRepeat(withTiming(1.06, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true);
    }
    return () => cancelAnimation(nucleusScale);
  }, [nucleusScale, reducedMotion]);

  const nucleusStyle = useAnimatedStyle(() => ({
    transform: [{ scale: nucleusScale.value }],
  }));
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#8AB4FF" stopOpacity={0.35} />
            <Stop offset="100%" stopColor="#8AB4FF" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={center} cy={center} r={center} fill={`url(#${gradientId})`} />
        <Circle cx={center} cy={center} r={size * 0.28} fill="none" stroke="rgba(138,180,255,0.35)" strokeWidth={1} />
        <Circle cx={center} cy={center} r={size * 0.38} fill="none" stroke="rgba(138,180,255,0.22)" strokeWidth={1} />
        <Circle cx={center} cy={center} r={size * 0.48} fill="none" stroke="rgba(138,180,255,0.3)" strokeWidth={1} strokeDasharray="4 6" />
      </Svg>
      <OrbitElectron size={size} radius={size * 0.28} haloSize={16} coreSize={6} duration={2400} direction={1} startAngle={0} reducedMotion={reducedMotion} />
      <OrbitElectron size={size} radius={size * 0.38} haloSize={22} coreSize={8} duration={3600} direction={-1} startAngle={120} reducedMotion={reducedMotion} />
      <OrbitElectron size={size} radius={size * 0.48} haloSize={22} coreSize={8} duration={5200} direction={1} startAngle={240} reducedMotion={reducedMotion} />
      <Animated.View style={[
        styles.nucleus,
        {
          width: size * 0.36,
          height: size * 0.36,
          borderRadius: size * 0.18,
          left: size * 0.32,
          top: size * 0.32,
        },
        nucleusStyle,
      ]}>
        <Image
          source={require('@/assets/brand/acxa-mark.png')}
          resizeMode="contain"
          style={{ width: size * 0.18, height: size * 0.18 }}
        />
      </Animated.View>
    </View>
  );
}

export function ProcessingOverlay({ visible, title, subtitle }: { visible: boolean; title: string; subtitle: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => undefined}>
      <View style={styles.processingBackdrop}>
        <OrbitLoader />
        <TextLabel size={22} weight={fonts.displayBold} color={colors.onPrimary} style={styles.processingTitle}>{title}</TextLabel>
        <TextLabel size={13} color="rgba(255,255,255,0.72)" style={styles.processingSubtitle}>{subtitle}</TextLabel>
      </View>
    </Modal>
  );
}

const makeStyles = (_colors: Palette) => StyleSheet.create({
  electronHalo: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(138,180,255,0.18)', borderWidth: 1, borderColor: 'rgba(138,180,255,0.6)' },
  electronCore: { backgroundColor: '#EAF1FF' },
  nucleus: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0E2246', borderWidth: 1, borderColor: 'rgba(138,180,255,0.4)' },
  processingBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing(5), backgroundColor: 'rgba(5,17,42,0.94)' },
  processingTitle: { marginTop: spacing(3), textAlign: 'center' },
  processingSubtitle: { marginTop: spacing(1), textAlign: 'center' },
});
