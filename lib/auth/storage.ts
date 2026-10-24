import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// OAuth credentials stay on this device. API keys never enter the client bundle.
export const authStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return globalThis.sessionStorage?.getItem(key) ?? null;
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') { globalThis.sessionStorage.setItem(key, value); return; }
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') { globalThis.sessionStorage?.removeItem(key); return; }
    await SecureStore.deleteItemAsync(key);
  },
};
