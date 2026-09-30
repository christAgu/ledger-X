import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useWalletStore } from '@/state/wallet';

export default function IndexRoute() {
  const { colors } = useTheme();
  const hydrated = useWalletStore((state) => state.hydrated);
  const onboarded = useWalletStore((state) => state.onboarded);
  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  return <Redirect href={onboarded ? '/lock' : '/welcome'} />;
}
