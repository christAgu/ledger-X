import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Path, Svg } from 'react-native-svg';
import { type Palette, withAlpha } from '@/theme/tokens';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type RippleRingProps = {
  diameter: number;
  delay: number;
  color: string;
};

function RippleRing({ diameter, delay, color }: RippleRingProps) {
  const styles = useThemedStyles(makeStyles);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    scale.set(withDelay(delay, withTiming(1.9, { duration: 1100, easing: Easing.out(Easing.cubic) })));
    opacity.set(withDelay(delay, withSequence(
      withTiming(0.45, { duration: 1 }),
      withTiming(0, { duration: 1100, easing: Easing.out(Easing.cubic) }),
    )));
    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [delay, opacity, scale]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ripple,
        { width: diameter, height: diameter, borderRadius: diameter / 2, borderColor: color },
        animatedStyle,
      ]}
    />
  );
}

type ConfettiParticleProps = {
  size: number;
  index: number;
  color: string;
};

function ConfettiParticle({ size, index, color }: ConfettiParticleProps) {
  const styles = useThemedStyles(makeStyles);
  const progress = useSharedValue(0);
  const isBar = index % 2 === 1;
  const width = isBar ? 4 : 6;
  const height = isBar ? 10 : 6;
  const angle = (index * 30 + (isBar ? 8 : -6)) * Math.PI / 180;
  const startRadius = size * 0.26;
  const endRadius = size * (index % 3 === 0 ? 0.62 : 0.52);
  const rotation = isBar ? 180 : -180;

  useEffect(() => {
    progress.set(withDelay(420, withTiming(1, { duration: 750, easing: Easing.out(Easing.quad) })));
    return () => cancelAnimation(progress);
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const radius = startRadius + (endRadius - startRadius) * progress.value;
    return {
      opacity: interpolate(progress.value, [0, 0.2, 1], [0, 1, 0]),
      transform: [
        { translateX: Math.cos(angle) * radius },
        { translateY: Math.sin(angle) * radius },
        { rotate: `${rotation * progress.value}deg` },
        { scale: interpolate(progress.value, [0, 1], [1, 0.5]) },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          width,
          height,
          top: size / 2 - height / 2,
          left: size / 2 - width / 2,
          borderRadius: isBar ? 2 : width / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

export function SuccessBurst({ size = 168 }: { size?: number }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const discDiameter = size * 0.52;
  const haloDiameter = size * 0.7;
  const discScale = useSharedValue(reducedMotion ? 1 : 0);
  const haloOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const checkOffset = useSharedValue(reducedMotion ? 0 : 62);

  useEffect(() => {
    if (reducedMotion) return;

    discScale.set(withDelay(120, withSpring(1, { damping: 11, stiffness: 180 })));
    haloOpacity.set(withDelay(120, withTiming(1, { duration: 300 })));
    checkOffset.set(withDelay(380, withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) })));

    const hapticTimer = Platform.OS === 'web'
      ? undefined
      : setTimeout(() => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      }, 400);

    return () => {
      cancelAnimation(discScale);
      cancelAnimation(haloOpacity);
      cancelAnimation(checkOffset);
      if (hapticTimer) clearTimeout(hapticTimer);
    };
  }, [checkOffset, discScale, haloOpacity, reducedMotion]);

  const discStyle = useAnimatedStyle(() => ({
    transform: [{ scale: discScale.value }],
  }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: haloOpacity.value }));
  const checkAnimatedProps = useAnimatedProps(() => ({ strokeDashoffset: checkOffset.value }));
  const particleColors = [colors.primary, colors.accent, colors.success, colors.warning, colors.glow];

  return (
    <View pointerEvents="none" style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {!reducedMotion ? (
        <>
          <RippleRing diameter={discDiameter} delay={380} color={colors.success} />
          <RippleRing diameter={discDiameter} delay={600} color={colors.success} />
        </>
      ) : null}
      <Animated.View
        style={[
          styles.halo,
          { width: haloDiameter, height: haloDiameter, borderRadius: haloDiameter / 2 },
          haloStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.disc,
          { width: discDiameter, height: discDiameter, borderRadius: discDiameter / 2 },
          discStyle,
        ]}
      >
        <Svg width={discDiameter * 0.9} height={discDiameter * 0.9} viewBox="0 0 100 100">
          <AnimatedPath
            d="M30 52 L45 66 L72 38"
            fill="none"
            stroke={colors.onPrimary}
            strokeWidth={8}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={62}
            animatedProps={checkAnimatedProps}
          />
        </Svg>
      </Animated.View>
      {!reducedMotion
        ? Array.from({ length: 12 }, (_, index) => (
          <ConfettiParticle key={index} size={size} index={index} color={particleColors[index % particleColors.length]} />
        ))
        : null}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  ripple: { position: 'absolute', borderWidth: 2 },
  halo: { position: 'absolute', backgroundColor: withAlpha(colors.success, 0.14) },
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    shadowColor: colors.success,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  particle: { position: 'absolute' },
});
