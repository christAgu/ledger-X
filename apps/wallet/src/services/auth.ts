import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hasHardware && isEnrolled;
}

export async function authenticate(reason: string): Promise<boolean> {
  if (!(await isBiometricAvailable())) return false;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    fallbackLabel: 'Utiliser le code',
    disableDeviceFallback: false,
  });
  return result.success;
}
