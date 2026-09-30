import { useEffect, useRef } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useWalletStore } from '@/state/wallet';
import { colors } from '@/theme/tokens';

function BackgroundLock() {
  const backgroundedAt = useRef<number | null>(null);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') backgroundedAt.current = Date.now();
      if (state === 'active' && backgroundedAt.current && Date.now() - backgroundedAt.current > 30_000) {
        if (useWalletStore.getState().onboarded) router.replace('/lock');
        backgroundedAt.current = null;
      }
    });
    return () => subscription.remove();
  }, []);
  return null;
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!loaded) return <View style={styles.loading} />;
  return (
    <GestureHandlerRootView style={styles.root}>
      <BackgroundLock />
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="deposit" options={{ presentation: 'card' }} />
        <Stack.Screen name="receive" options={{ presentation: 'card' }} />
        <Stack.Screen name="send" options={{ presentation: 'card' }} />
        <Stack.Screen name="cashout" options={{ presentation: 'card' }} />
        <Stack.Screen name="lock" />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, backgroundColor: colors.bg },
});
