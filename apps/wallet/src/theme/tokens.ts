export const colors = {
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
} as const;

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
