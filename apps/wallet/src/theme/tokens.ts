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
};

export const lightColors: Palette = {
  bg: '#F4F6FB',
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF2FA',
  border: '#E0E5EF',
  primary: '#2458ED',
  primaryPressed: '#1F4BD0',
  primarySoft: 'rgba(36,88,237,0.10)',
  accent: '#2458ED',
  glow: '#9FC4FF',
  text: '#101D38',
  textMuted: '#59647A',
  textDim: '#7A859B',
  success: '#0FA968',
  danger: '#E5405E',
  warning: '#D98A0B',
  paper: '#F7F8FB',
  ink: '#101D38',
  onPrimary: '#FFFFFF',
  overlay: 'rgba(16,29,56,0.45)',
  heroFade: '#F4F6FB',
  segmentTrack: '#E6EBF5',
};

export const radius = { sm: 8, md: 14, lg: 20, xl: 28, pill: 999 } as const;
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
