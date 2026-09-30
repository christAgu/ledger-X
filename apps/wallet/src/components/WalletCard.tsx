import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LockKeyhole, Plus } from 'lucide-react-native';
import { colors, fonts, spacing } from '@/theme/tokens';
import { PressableScale, TextLabel } from '@/components/ui';

type WalletCardProps = {
  variant: 'blue' | 'navy';
  label: string;
  balance: string;
  last4: string;
  expiry: string;
  frozen?: boolean;
  onPress?: () => void;
  width: number;
  empty?: boolean;
};

export function WalletCard({
  variant,
  label,
  balance,
  last4,
  expiry,
  frozen = false,
  onPress,
  width,
  empty = false,
}: WalletCardProps) {
  const height = width * 0.62;

  const card = (
    <View style={[styles.card, { width, height }, variant === 'navy' && styles.navyBorder]}>
      <LinearGradient
        colors={frozen
          ? ['#28374D', '#19283D']
          : variant === 'blue'
            ? ['#4F7BFF', '#2458ED', '#1B3FB8']
            : ['#1B2F6B', '#0E2246', '#071632']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.topCircle} />
      <View style={styles.bottomCircle} />
      <Image source={require('@/assets/brand/acxa-mark.png')} style={styles.watermark} resizeMode="contain" />
      {empty ? (
        <View style={styles.emptyContent}>
          <View style={styles.plusCircle}><Plus size={21} color={colors.text} /></View>
          <TextLabel size={13} weight={fonts.bodySemi}>Ajouter une carte</TextLabel>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.topRow}>
            <TextLabel size={15} weight={fonts.displayBold} style={styles.visa}>VISA</TextLabel>
            <View style={styles.topMeta}>
              <TextLabel size={9} color={colors.textMuted} weight={fonts.bodySemi}>{label}</TextLabel>
              {frozen ? (
                <View style={styles.frozenChip}>
                  <LockKeyhole size={10} color={colors.textMuted} />
                  <TextLabel size={8} weight={fonts.bodySemi} color={colors.textMuted}>Gelée</TextLabel>
                </View>
              ) : null}
            </View>
          </View>
          <View style={styles.balance}>
            <TextLabel size={10} color={colors.textMuted}>Solde</TextLabel>
            <TextLabel size={20} weight={fonts.displayBold} numberOfLines={1} adjustsFontSizeToFit>{balance}</TextLabel>
          </View>
          <View style={styles.bottomRow}>
            <TextLabel size={11} weight={fonts.bodySemi}>•• {last4}</TextLabel>
            <TextLabel size={11} weight={fonts.bodySemi}>{expiry}</TextLabel>
          </View>
        </View>
      )}
    </View>
  );

  return onPress ? (
    <PressableScale accessibilityRole="button" onPress={onPress} style={{ width }}>
      {card}
    </PressableScale>
  ) : card;
}

const styles = StyleSheet.create({
  card: { position: 'relative', borderRadius: 20, overflow: 'hidden', justifyContent: 'space-between' },
  navyBorder: { borderWidth: 1, borderColor: 'rgba(138,180,255,0.18)' },
  topCircle: { position: 'absolute', width: 180, height: 180, borderRadius: 90, top: -94, right: -70, backgroundColor: 'rgba(255,255,255,0.1)', pointerEvents: 'none' },
  bottomCircle: { position: 'absolute', width: 140, height: 140, borderRadius: 70, bottom: -84, left: -54, backgroundColor: 'rgba(255,255,255,0.06)', pointerEvents: 'none' },
  watermark: { position: 'absolute', right: -13, bottom: -30, width: 112, height: 126, opacity: 0.08 },
  content: { flex: 1, justifyContent: 'space-between', padding: spacing(3) },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(2) },
  visa: { fontStyle: 'italic', letterSpacing: 0.5 },
  topMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  frozenChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(7,17,37,0.3)' },
  balance: { gap: 2 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  emptyContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing(2) },
  plusCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.08)' },
});
