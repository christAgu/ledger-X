import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useThemedStyles } from '@/theme/ThemeProvider';
import { type Palette } from '@/theme/tokens';

export default function OnboardingLayout() {
  const styles = useThemedStyles(makeStyles);
  return <Stack screenOptions={{ headerShown: false, contentStyle: styles.content, animation: 'slide_from_right' }} />;
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  content: { backgroundColor: colors.bg },
});
