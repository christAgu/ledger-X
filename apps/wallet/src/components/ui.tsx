import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextProps,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, SlideInDown, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, Copy, Eye, EyeOff, type LucideIcon } from 'lucide-react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform } from 'react-native';
import { colors, fonts, radius, spacing } from '@/theme/tokens';
import type { Denom } from '@/services/ledgerx/types';
import { formatAmount } from '@/utils/format';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TextLabel({
  children,
  style,
  size = 14,
  color = colors.text,
  weight = fonts.body,
  ...props
}: PropsWithChildren<{ style?: StyleProp<TextStyle>; size?: number; color?: string; weight?: string } & Omit<TextProps, 'style' | 'children'>>) {
  return <Text {...props} style={[{ color, fontFamily: weight, fontSize: size }, style]}>{children}</Text>;
}

export function PressableScale({ children, style, onPress, disabled, ...props }: PressableProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        scale.set(withSpring(0.96, { damping: 14, stiffness: 280 }));
        props.onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(withSpring(1, { damping: 14, stiffness: 280 }));
        props.onPressOut?.(event);
      }}
      onPress={(event) => {
        if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(event);
      }}
      style={[animatedStyle, style]}>
      {children}
    </AnimatedPressable>
  );
}

type ButtonProps = PropsWithChildren<{
  onPress?: () => void;
  kind?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function Button({ children, onPress, kind = 'primary', disabled = false, style }: ButtonProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        kind === 'primary' && styles.buttonPrimary,
        kind === 'secondary' && styles.buttonSecondary,
        kind === 'ghost' && styles.buttonGhost,
        disabled && styles.buttonDisabled,
        style,
      ]}>
      <TextLabel size={15} weight={fonts.bodyBold} color={kind === 'ghost' ? colors.accent : colors.text}>{children}</TextLabel>
    </PressableScale>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Screen({
  children,
  scroll = false,
  gradient = false,
  style,
}: PropsWithChildren<{ scroll?: boolean; gradient?: boolean; style?: StyleProp<ViewStyle> }>) {
  const content = scroll ? (
    <ScrollView contentContainerStyle={[styles.screenContent, style]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.screenContent, styles.flexContent, style]}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {gradient ? (
        <LinearGradient colors={['#143A79', '#081C3C', colors.bg]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      ) : null}
      {content}
    </SafeAreaView>
  );
}

export function Header({ title, right, back = true }: { title: string; right?: React.ReactNode; back?: boolean }) {
  return (
    <View style={styles.header}>
      {back ? (
        <PressableScale onPress={() => router.back()} style={styles.iconButton}>
          <ChevronLeft color={colors.text} size={22} />
        </PressableScale>
      ) : <View style={styles.iconButton} />}
      <TextLabel size={18} weight={fonts.bodySemi}>{title}</TextLabel>
      <View style={[styles.headerRight, !right && styles.iconButton]}>{right}</View>
    </View>
  );
}

export function AmountText({
  value,
  denom,
  hidden = false,
  size = 30,
  style,
}: { value: number; denom: Denom; hidden?: boolean; size?: number; style?: StyleProp<TextStyle> }) {
  return (
    <TextLabel size={size} weight={fonts.displayBold} style={style}>
      {hidden ? '••••••' : formatAmount(value, denom)}
    </TextLabel>
  );
}

const assetColor: Record<Denom, string> = {
  aXOF: '#F1A132', aEUR: '#2B71F0', aUSD: '#45B989', USDC: '#2775CA', USDT: '#26A17B', BTC: '#F7931A', SOL: '#8B5CF6',
};
const assetIconText: Record<Denom, string> = {
  aXOF: 'X', aEUR: '€', aUSD: '$', USDC: '◉', USDT: '₮', BTC: '₿', SOL: '◎',
};

export function AssetIcon({ denom, size = 42 }: { denom: Denom; size?: number }) {
  return (
    <View style={[styles.assetIcon, { width: size, height: size, borderRadius: size / 2, backgroundColor: assetColor[denom] }]}>
      <TextLabel size={size * 0.48} weight={fonts.displayBold}>{assetIconText[denom]}</TextLabel>
    </View>
  );
}

export function AssetRow({ denom, balance, fiat, onPress, hidden = false, index = 0 }: { denom: Denom; balance: number; fiat: string; onPress?: () => void; hidden?: boolean; index?: number }) {
  const names: Record<Denom, string> = { aXOF: 'Franc CFA', aEUR: 'Euro', aUSD: 'Dollar US', USDC: 'USD Coin', USDT: 'Tether', BTC: 'Bitcoin', SOL: 'Solana' };
  return (
    <Animated.View entering={FadeInDown.delay(index * 45).duration(300)}>
      <PressableScale onPress={onPress} style={styles.assetRow}>
        <AssetIcon denom={denom} />
        <View style={styles.assetName}>
          <TextLabel size={14} weight={fonts.bodySemi}>{names[denom]}</TextLabel>
          <TextLabel size={12} color={colors.textDim}>{denom} · Ledger X</TextLabel>
        </View>
        <View style={styles.assetAmount}>
          <TextLabel size={14} weight={fonts.bodySemi}>{hidden ? '••••••' : formatAmount(balance, denom)}</TextLabel>
          <TextLabel size={12} color={colors.textDim}>{hidden ? '••••' : fiat}</TextLabel>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

export function QuickAction({ label, icon: Icon, onPress, primary = false }: { label: string; icon: LucideIcon; onPress: () => void; primary?: boolean }) {
  return (
    <PressableScale onPress={onPress} style={styles.quickAction}>
      <View style={[styles.quickCircle, primary && styles.quickPrimary]}><Icon size={21} color={primary ? colors.text : colors.accent} strokeWidth={2} /></View>
      <TextLabel size={11} color={colors.textMuted} style={styles.quickLabel}>{label}</TextLabel>
    </PressableScale>
  );
}

export function SegmentedControl({ options, selected, onSelect }: { options: string[]; selected: string; onSelect: (value: string) => void }) {
  return (
    <View style={styles.segment}>
      {options.map((option) => (
        <PressableScale key={option} onPress={() => onSelect(option)} style={[styles.segmentItem, selected === option && styles.segmentSelected]}>
          <TextLabel size={12} weight={selected === option ? fonts.bodySemi : fonts.bodyMedium} color={selected === option ? colors.text : colors.textDim}>{option}</TextLabel>
        </PressableScale>
      ))}
    </View>
  );
}

export function Sheet({ visible, title, onClose, children }: PropsWithChildren<{ visible: boolean; title: string; onClose: () => void }>) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Animated.View entering={SlideInDown.duration(250)} style={styles.sheet}>
          <Pressable onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <TextLabel size={18} weight={fonts.bodySemi}>{title}</TextLabel>
              <PressableScale onPress={onClose}><TextLabel size={22} color={colors.textDim}>×</TextLabel></PressableScale>
            </View>
            {children}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

export function Toast({ message, visible }: { message: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <Animated.View entering={FadeInUp.duration(180)} style={styles.toast}>
      <TextLabel size={13} weight={fonts.bodySemi}>{message}</TextLabel>
    </Animated.View>
  );
}

export function PinPad({ value, onChange, onComplete, error = false }: { value: string; onChange: (value: string) => void; onComplete?: (value: string) => void; error?: boolean }) {
  const press = (digit: string) => {
    if (digit === '⌫') { onChange(value.slice(0, -1)); return; }
    if (value.length >= 6) return;
    const next = value + digit;
    onChange(next);
    if (next.length === 6) onComplete?.(next);
  };
  return (
    <View style={styles.pinWrap}>
      <View style={styles.pinDots}>
        {Array.from({ length: 6 }, (_, index) => <View key={index} style={[styles.pinDot, index < value.length && styles.pinDotFilled, error && styles.pinDotError]} />)}
      </View>
      <View style={styles.pinGrid}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((digit, index) => (
          <Pressable key={`${digit}-${index}`} disabled={!digit} onPress={() => press(digit)} style={styles.pinKey}>
            <TextLabel size={digit === '⌫' ? 22 : 24} weight={fonts.bodyMedium}>{digit}</TextLabel>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function OtpInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <View>
      <TextInput
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        maxLength={6}
        style={styles.otpHiddenInput}
        autoFocus
      />
      <View style={styles.otpBoxes}>
        {Array.from({ length: 6 }, (_, index) => (
          <View key={index} style={[styles.otpBox, index === value.length && styles.otpActive]}>
            <TextLabel size={21} weight={fonts.display}>{value[index] ?? ''}</TextLabel>
          </View>
        ))}
      </View>
    </View>
  );
}

export function SuccessView({ title, subtitle, detail, onDone }: { title: string; subtitle: string; detail?: string; onDone: () => void }) {
  return (
    <View style={styles.successView}>
      <Animated.View entering={FadeInDown.springify()} style={styles.successRing}><TextLabel size={40} weight={fonts.displayBold} color={colors.success}>✓</TextLabel></Animated.View>
      <TextLabel size={26} weight={fonts.displayBold} style={styles.center}>{title}</TextLabel>
      <TextLabel size={14} color={colors.textMuted} style={styles.center}>{subtitle}</TextLabel>
      {detail ? <TextLabel size={11} color={colors.textDim} style={styles.center}>{detail}</TextLabel> : null}
      <Button onPress={onDone} style={styles.fullButton}>Terminé</Button>
    </View>
  );
}

export function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.stepRow}>
      {Array.from({ length: total }, (_, index) => <View key={index} style={[styles.stepLine, index <= step && styles.stepLineActive]} />)}
    </View>
  );
}

export function SwitchRow({ title, subtitle, value, onValueChange }: { title: string; subtitle?: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return (
    <PressableScale onPress={() => onValueChange(!value)} style={styles.switchRow}>
      <View style={styles.assetName}>
        <TextLabel size={14} weight={fonts.bodySemi}>{title}</TextLabel>
        {subtitle ? <TextLabel size={12} color={colors.textDim}>{subtitle}</TextLabel> : null}
      </View>
      <View style={[styles.switch, value && styles.switchActive]}><View style={[styles.switchKnob, value && styles.switchKnobActive]} /></View>
    </PressableScale>
  );
}

export function Skeleton({ width = '100%', height = 18 }: { width?: number | `${number}%`; height?: number }) {
  const opacity = useSharedValue(0.4);
  const shimmerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  useEffect(() => {
    opacity.set(withRepeat(withSequence(withTiming(0.85, { duration: 700 }), withTiming(0.4, { duration: 700 })), -1));
    return () => cancelAnimation(opacity);
  }, [opacity]);
  return <Animated.View entering={FadeInDown.duration(300)} style={[{ width, height, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt }, shimmerStyle]} />;
}

export function CopyButton({ value, onCopy }: { value: string; onCopy: (value: string) => void }) {
  return <PressableScale onPress={() => onCopy(value)} style={styles.copyButton}><Copy color={colors.accent} size={17} /></PressableScale>;
}

export function Input({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize = 'none',
  prefix,
  style: inputStyle,
  ...props
}: React.ComponentProps<typeof TextInput> & { prefix?: string }) {
  return (
    <View style={styles.inputWrap}>
      {prefix ? <TextLabel size={15} color={colors.textMuted}>{prefix}</TextLabel> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={[styles.input, inputStyle]}
        selectionColor={colors.accent}
        {...props}
      />
    </View>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Animated.View entering={FadeInDown.duration(260)} style={styles.pageTitle}>
      <TextLabel size={27} weight={fonts.displayBold}>{title}</TextLabel>
      {subtitle ? <TextLabel size={14} color={colors.textMuted}>{subtitle}</TextLabel> : null}
    </Animated.View>
  );
}

export function LoadingButton({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) {
  return <Button onPress={onPress} disabled={loading}>{loading ? <ActivityIndicator color={colors.text} /> : label}</Button>;
}

export function EyeToggle({ hidden, onPress }: { hidden: boolean; onPress: () => void }) {
  const Icon = hidden ? Eye : EyeOff;
  return <PressableScale onPress={onPress} style={styles.iconButton}><Icon size={19} color={colors.textMuted} /></PressableScale>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenContent: { paddingHorizontal: spacing(5), paddingTop: spacing(3), paddingBottom: spacing(7), gap: spacing(4) },
  flexContent: { flex: 1 },
  button: { height: 54, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing(4) },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  buttonGhost: { backgroundColor: 'transparent' },
  buttonDisabled: { opacity: 0.4 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing(4) },
  header: { height: 50, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing(2) },
  headerRight: { alignItems: 'center', justifyContent: 'center' },
  iconButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  assetIcon: { alignItems: 'center', justifyContent: 'center' },
  assetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing(2.5), borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing(3) },
  assetName: { flex: 1, gap: 4 },
  assetAmount: { alignItems: 'flex-end', gap: 4 },
  quickAction: { alignItems: 'center', width: 66, gap: spacing(1.5) },
  quickCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  quickPrimary: { backgroundColor: colors.primary },
  quickLabel: { textAlign: 'center', minHeight: 26 },
  segment: { flexDirection: 'row', padding: 4, backgroundColor: colors.bgElevated, borderRadius: radius.md, gap: 3 },
  segmentItem: { flex: 1, minHeight: 39, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, paddingHorizontal: 6 },
  segmentSelected: { backgroundColor: colors.surface },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(1,7,20,0.75)' },
  sheet: { backgroundColor: colors.bgElevated, paddingHorizontal: spacing(5), paddingTop: spacing(2), paddingBottom: spacing(7), borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderColor: colors.border, borderWidth: 1, maxHeight: '86%' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing(4) },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(4) },
  toast: { position: 'absolute', left: 28, right: 28, bottom: 38, backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing(3), alignItems: 'center', zIndex: 50 },
  pinWrap: { alignItems: 'center', width: '100%', gap: spacing(5) },
  pinDots: { flexDirection: 'row', gap: spacing(3), marginTop: spacing(3) },
  pinDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderWidth: 1 },
  pinDotFilled: { backgroundColor: colors.accent, borderColor: colors.accent },
  pinDotError: { backgroundColor: colors.danger, borderColor: colors.danger },
  pinGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 290 },
  pinKey: { width: 84, height: 60, margin: 4, alignItems: 'center', justifyContent: 'center' },
  otpHiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  otpBoxes: { flexDirection: 'row', gap: 8, justifyContent: 'center', pointerEvents: 'none' },
  otpBox: { width: 44, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  otpActive: { borderColor: colors.accent },
  successView: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing(4) },
  successRing: { width: 96, height: 96, borderRadius: 48, borderWidth: 1, borderColor: colors.success, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(61,220,151,0.12)', marginBottom: spacing(2) },
  center: { textAlign: 'center' },
  fullButton: { width: '100%', marginTop: spacing(4) },
  stepRow: { flexDirection: 'row', gap: 6 },
  stepLine: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.surfaceAlt },
  stepLineActive: { backgroundColor: colors.primary },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing(3), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  switch: { width: 48, height: 28, borderRadius: 14, backgroundColor: colors.surfaceAlt, justifyContent: 'center', padding: 3 },
  switchActive: { backgroundColor: colors.primary },
  switchKnob: { width: 22, height: 22, backgroundColor: colors.textMuted, borderRadius: 11 },
  switchKnobActive: { alignSelf: 'flex-end', backgroundColor: colors.text },
  copyButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  inputWrap: { minHeight: 54, paddingHorizontal: spacing(3), borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  input: { color: colors.text, fontFamily: fonts.body, fontSize: 16, flex: 1, paddingVertical: spacing(2) },
  pageTitle: { gap: spacing(1) },
});
