import { useEffect, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Circle, Defs, RadialGradient, Stop, Svg } from 'react-native-svg';
import { spacing } from '@/theme/tokens';

export function AnimatedGradientBackdrop({ height }: { height: number }) {
  const reducedMotion = useReducedMotion();
  const firstBlobId = `home-first-blob-${useId().replace(/:/g, '')}`;
  const secondBlobId = `home-second-blob-${useId().replace(/:/g, '')}`;
  const blend = useSharedValue(0);
  const firstBlobDrift = useSharedValue(0);
  const secondBlobDrift = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    blend.value = withRepeat(withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.sin) }), -1, true);
    firstBlobDrift.value = withRepeat(withTiming(1, { duration: 11000, easing: Easing.inOut(Easing.sin) }), -1, true);
    secondBlobDrift.value = withRepeat(withTiming(1, { duration: 13000, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => {
      cancelAnimation(blend);
      cancelAnimation(firstBlobDrift);
      cancelAnimation(secondBlobDrift);
    };
  }, [blend, firstBlobDrift, reducedMotion, secondBlobDrift]);

  const layerAStyle = useAnimatedStyle(() => ({ opacity: 0.1 + blend.value * 0.5 }));
  const layerBStyle = useAnimatedStyle(() => ({ opacity: 0.6 - blend.value * 0.5 }));
  const firstBlobStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: firstBlobDrift.value * 140 - 70 },
      { translateY: firstBlobDrift.value * 60 - 30 },
      { scale: 1 + firstBlobDrift.value * 0.2 },
    ],
  }));
  const secondBlobStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: secondBlobDrift.value * -70 },
      { translateY: secondBlobDrift.value * -30 },
      { scale: 1 + secondBlobDrift.value * 0.15 },
    ],
  }));

  return (
    <View
      style={[
        styles.container,
        { height, marginHorizontal: -spacing(5), marginTop: -spacing(1) },
      ]}>
      <Animated.View style={[StyleSheet.absoluteFill, layerAStyle]}>
        <LinearGradient colors={['#2458ED', '#12306E', 'rgba(7,22,50,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, layerBStyle]}>
        <LinearGradient colors={['#0B2A7A', '#3A6BFF', 'rgba(7,22,50,0)']} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[styles.firstBlob, firstBlobStyle]}>
        <Svg width={320} height={320} viewBox="0 0 320 320">
          <Defs>
            <RadialGradient id={firstBlobId} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#8AB4FF" stopOpacity={0.55} />
              <Stop offset="1" stopColor="#8AB4FF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={160} cy={160} r={160} fill={`url(#${firstBlobId})`} />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.secondBlob, secondBlobStyle]}>
        <Svg width={280} height={280} viewBox="0 0 280 280">
          <Defs>
            <RadialGradient id={secondBlobId} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#2458ED" stopOpacity={0.6} />
              <Stop offset="1" stopColor="#2458ED" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={140} cy={140} r={140} fill={`url(#${secondBlobId})`} />
        </Svg>
      </Animated.View>
      <LinearGradient colors={['rgba(7,22,50,0)', '#0A2147']} locations={[0, 1]} style={styles.fade} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' },
  firstBlob: { position: 'absolute', width: 320, height: 320, top: -48, left: '38%' },
  secondBlob: { position: 'absolute', width: 280, height: 280, top: 80, left: -60 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 140 },
});
