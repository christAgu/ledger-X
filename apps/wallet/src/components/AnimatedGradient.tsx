import { useEffect, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Circle, Defs, RadialGradient, Stop, Svg } from 'react-native-svg';
import { spacing } from '@/theme/tokens';

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
  { size: 300, color: '#2458ED', opacity: 0.27, duration: 10000, left: -40, top: -42, ampX: 70, ampY: 35, phase: 0.02, phase2: 0.12 },
  { size: 360, color: '#3A6BFF', opacity: 0.24, duration: 13000, left: 38, top: -110, ampX: 95, ampY: 50, phase: 0.23, phase2: 0.46 },
  { size: 420, color: '#8AB4FF', opacity: 0.22, duration: 15000, left: 104, top: -26, ampX: 110, ampY: 58, phase: 0.47, phase2: 0.72 },
  { size: 280, color: '#1B3FB8', opacity: 0.38, duration: 17000, left: -55, top: 92, ampX: 60, ampY: 30, phase: 0.68, phase2: 0.91 },
  { size: 240, color: '#2458ED', opacity: 0.3, duration: 20000, left: 170, top: 90, ampX: 82, ampY: 42, phase: 0.84, phase2: 0.32 },
];

function SmokeBlob({ color, duration, left, opacity, phase, phase2, size, top, ampX, ampY }: SmokeBlobConfig) {
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
    const scaleX = 1 + 0.18 * Math.sin(morphAngle);
    return {
      transform: [
        { translateX: Math.sin(angle) * ampX },
        { translateY: Math.cos(angle) * ampY },
        { rotate: `${Math.sin(morphAngle) * 15}deg` },
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
  const reducedMotion = useReducedMotion();
  const shade = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    shade.value = withRepeat(withTiming(1, { duration: 12000, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(shade);
  }, [reducedMotion, shade]);

  const layerAStyle = useAnimatedStyle(() => ({ opacity: 0.6 - shade.value * 0.4 }));
  const lightOverlayStyle = useAnimatedStyle(() => ({ opacity: 1 - shade.value }));
  const darkOverlayStyle = useAnimatedStyle(() => ({ opacity: shade.value * 0.45 }));

  return (
    <View
      style={[
        styles.container,
        { height, marginHorizontal: -spacing(5), marginTop: -spacing(1) },
      ]}>
      <Animated.View style={[StyleSheet.absoluteFill, layerAStyle]}>
        <LinearGradient colors={['#2458ED', '#12306E', 'rgba(7,22,50,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <View style={[StyleSheet.absoluteFill, styles.layerB]}>
        <LinearGradient colors={['#0B2A7A', '#3A6BFF', 'rgba(7,22,50,0)']} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>
      {smokeBlobs.map((blob, index) => <SmokeBlob key={`smoke-${index}`} {...blob} />)}
      <Animated.View style={[StyleSheet.absoluteFill, styles.lightOverlay, lightOverlayStyle]}>
        <LinearGradient colors={['rgba(138,180,255,0.18)', 'rgba(138,180,255,0)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.darkOverlay, darkOverlayStyle]} />
      <View style={[StyleSheet.absoluteFill, styles.dim]} />
      <LinearGradient colors={['rgba(7,22,50,0)', '#0A2147']} locations={[0, 1]} style={styles.fade} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' },
  blob: { position: 'absolute' },
  layerB: { opacity: 0.3 },
  lightOverlay: { opacity: 1 },
  darkOverlay: { backgroundColor: '#030A1C' },
  dim: { backgroundColor: '#030A1C', opacity: 0.22 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 140 },
});
