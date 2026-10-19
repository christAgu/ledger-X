export type Palette = {
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  accent: string;
  glow: string;
  text: string;
  textMuted: string;
  textDim: string;
  success: string;
  danger: string;
  warning: string;
  paper: string;
  ink: string;
  onPrimary: string;
  overlay: string;
  heroFade: string;
  segmentTrack: string;
  outline: string;
  listTile: string;
};

export const darkColors: Palette = {
  bg: '#05112A',
  bgElevated: '#071632',
  surface: '#0E2246',
  surfaceAlt: '#102449',
  border: '#29426A',
  primary: '#2458ED',
  primaryPressed: '#1F4BD0',
  primarySoft: 'rgba(36,88,237,0.16)',
  accent: '#8AB4FF',
  glow: '#9FC4FF',
  text: '#FFFFFF',
  textMuted: '#9DB2D2',
  textDim: '#7793BD',
  success: '#3DDC97',
  danger: '#FF5C7A',
  warning: '#FFB547',
  paper: '#F7F8FB',
  ink: '#101D38',
  onPrimary: '#FFFFFF',
  overlay: 'rgba(3,10,28,0.72)',
  heroFade: '#0A2147',
  segmentTrack: '#071632',
  outline: '#29426A',
  listTile: '#0E2246',
};

export const lightColors: Palette = {
  bg: '#FFFFFF',
  bgElevated: '#FFFFFF',
  surface: '#F2F5F9',
  surfaceAlt: '#E8EDF4',
  border: '#E9EDF3',
  primary: '#2458ED',
  primaryPressed: '#1F4BD0',
  primarySoft: 'rgba(36,88,237,0.10)',
  accent: '#2458ED',
  glow: '#9FC4FF',
  text: '#0E1B33',
  textMuted: '#55607A',
  textDim: '#8B94A8',
  success: '#0FA968',
  danger: '#E5405E',
  warning: '#D98A0B',
  paper: '#FFFFFF',
  ink: '#0E1B33',
  onPrimary: '#FFFFFF',
  overlay: 'rgba(14,27,51,0.40)',
  heroFade: '#FFFFFF',
  segmentTrack: '#EEF1F6',
  outline: 'transparent',
  listTile: 'transparent',
};

export const radius = { sm: 10, md: 16, lg: 24, xl: 32, pill: 999 } as const;
export const spacing = (n: number) => n * 4;
export const fonts = {
  display: 'Manrope_700Bold',
  displayBold: 'Manrope_800ExtraBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export function withAlpha(color: string, opacity: number) {
  const value = color.replace('#', '');
  const channels = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
  return `rgba(${channels[0]},${channels[1]},${channels[2]},${opacity})`;
}
