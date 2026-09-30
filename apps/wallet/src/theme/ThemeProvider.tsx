import { useMemo } from 'react';
import { useWalletStore } from '@/state/wallet';
import { darkColors, lightColors, type Palette } from './tokens';

export function useTheme(): { mode: 'dark' | 'light'; colors: Palette } {
  const mode = useWalletStore((state) => state.settings.themeMode ?? 'dark');
  return { mode, colors: mode === 'light' ? lightColors : darkColors };
}

export function useThemedStyles<T>(factory: (colors: Palette) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
