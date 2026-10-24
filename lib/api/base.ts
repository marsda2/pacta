import { Platform } from 'react-native';

export function apiBase(): string {
  if (Platform.OS === 'web' && !__DEV__) return '';
  return (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
}
