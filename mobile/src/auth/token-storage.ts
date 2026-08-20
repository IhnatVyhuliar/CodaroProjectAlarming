import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'codaro.auth.token';

/**
 * Fallback used when the secure store is unavailable (web preview, tests).
 * The token then lives only in memory — never in plaintext persistent storage.
 */
let memoryToken: string | null = null;

async function secureStoreAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export const tokenStorage = {
  async read(): Promise<string | null> {
    if (!(await secureStoreAvailable())) {
      return memoryToken;
    }

    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return memoryToken;
    }
  },

  async write(token: string): Promise<void> {
    memoryToken = token;

    if (!(await secureStoreAvailable())) {
      return;
    }

    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch {
      // Keeping the in-memory copy is the best we can do here.
    }
  },

  async clear(): Promise<void> {
    memoryToken = null;

    if (!(await secureStoreAvailable())) {
      return;
    }

    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      // Ignored — the in-memory token is already gone.
    }
  },
};
