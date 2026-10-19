import { useEffect, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Circle, Defs, RadialGradient, Stop, Svg } from 'react-native-svg';
import { spacing, type Palette } from '@/theme/tokens';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';

type SmokeBlobConfig = {
  color: string;
  duration: number;
  left: number;
  opacity: number;
  phase: number;
  phase2: number;
  size: number;
  top: number;
  ampX: number;
  ampY: number;
};

const smokeBlobs: SmokeBlobConfig[] = [
  { size: 300, color: '#2458ED', opacity: 0.34, duration: 8000, left: -40, top: -42, ampX: 85, ampY: 45, phase: 0.02, phase2: 0.12 },
  { size: 360, color: '#3A6BFF', opacity: 0.3, duration: 10500, left: 38, top: -110, ampX: 115, ampY: 62, phase: 0.23, phase2: 0.46 },
  { size: 420, color: '#8AB4FF', opacity: 0.28, duration: 12000, left: 104, top: -26, ampX: 135, ampY: 72, phase: 0.47, phase2: 0.72 },
  { size: 280, color: '#1B3FB8', opacity: 0.46, duration: 14000, left: -55, top: 92, ampX: 75, ampY: 40, phase: 0.68, phase2: 0.91 },
  { size: 240, color: '#2458ED', opacity: 0.38, duration: 16000, left: 170, top: 90, ampX: 100, ampY: 55, phase: 0.84, phase2: 0.32 },
  { size: 200, color: '#9FC4FF', opacity: 0.32, duration: 9000, left: 60, top: 30, ampX: 90, ampY: 48, phase: 0.55, phase2: 0.05 },
];

function SmokeBlob({ color, duration, left, opacity, phase, phase2, size, top, ampX, ampY }: SmokeBlobConfig) {
  const styles = useThemedStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const gradientId = `smoke-${useId().replace(/:/g, '')}`;
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    progress.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(progress);
  }, [duration, progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => {
    const angle = 2 * Math.PI * (progress.value + phase);
    const morphAngle = 2 * Math.PI * (progress.value + phase2);
    const scaleX = 1 + 0.3 * Math.sin(morphAngle);
    return {
      transform: [
        { translateX: Math.sin(angle) * ampX },
        { translateY: Math.cos(angle) * ampY },
        { rotate: `${Math.sin(morphAngle) * 24}deg` },
        { scaleX },
        { scaleY: 1 / scaleX },
      ],
    };
  });

  return (
    <Animated.View style={[styles.blob, { width: size, height: size, left, top }, animatedStyle]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={opacity} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${gradientId})`} />
      </Svg>
    </Animated.View>
  );
}

export function AnimatedGradientBackdrop({ height }: { height: number }) {
  const { mode, colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const shade = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    shade.value = withRepeat(withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(shade);
  }, [reducedMotion, shade]);

  const layerAStyle = useAnimatedStyle(() => ({ opacity: mode === 'light' ? 0.9 : 0.85 - shade.value * 0.55 }), [mode]);
  const lightOverlayStyle = useAnimatedStyle(() => ({ opacity: 1 - shade.value }));
  const darkOverlayStyle = useAnimatedStyle(() => ({ opacity: mode === 'light' ? 0 : shade.value * 0.55 }), [mode]);
  const layerAColors: readonly [string, string, string] = mode === 'light'
    ? ['#C9DCFF', '#DEEAFF', 'rgba(255,255,255,0)']
    : ['#2458ED', '#12306E', 'rgba(7,22,50,0)'];
  const layerBColors: readonly [string, string, string] = mode === 'light'
    ? ['#AFCBFF', '#D0E0FF', 'rgba(255,255,255,0)']
    : ['#0B2A7A', '#3A6BFF', 'rgba(7,22,50,0)'];

  return (
    <View
      style={[
        styles.container,
        { height, marginHorizontal: -spacing(5), marginTop: -spacing(1) },
      ]}>
      <Animated.View style={[StyleSheet.absoluteFill, layerAStyle]}>
        <LinearGradient colors={layerAColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <View style={[StyleSheet.absoluteFill, styles.layerB]}>
        <LinearGradient colors={layerBColors} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>
      {smokeBlobs.map((blob, index) => <SmokeBlob key={`smoke-${index}`} {...blob} opacity={blob.opacity * (mode === 'light' ? 0.95 : 1)} />)}
      <Animated.View style={[StyleSheet.absoluteFill, styles.lightOverlay, lightOverlayStyle]}>
        <LinearGradient
          colors={mode === 'light' ? ['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)'] : ['rgba(138,180,255,0.18)', 'rgba(138,180,255,0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {mode === 'dark' ? <Animated.View style={[StyleSheet.absoluteFill, styles.darkOverlay, darkOverlayStyle]} /> : null}
      {mode === 'dark' ? <View style={[StyleSheet.absoluteFill, styles.dim]} /> : null}
      <LinearGradient colors={[mode === 'light' ? 'rgba(244,246,251,0)' : 'rgba(7,22,50,0)', colors.heroFade]} locations={[0, 1]} style={styles.fade} />
    </View>
  );
}

const makeStyles = (_colors: Palette) => StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' },
  blob: { position: 'absolute' },
  layerB: { opacity: 0.45 },
  lightOverlay: { opacity: 1 },
  darkOverlay: { backgroundColor: '#030A1C' },
  dim: { backgroundColor: '#030A1C', opacity: 0.22 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 140 },
});
