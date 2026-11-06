import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const REFRESH_KEY = 'bloomly_refresh_token';
const DEVICE_KEY = 'bloomly_device_id';

// Refresh-токен — только в Keychain (iOS) / Keystore (Android). Access-токен живёт в памяти, как на вебе.
export const refreshTokenStore = {
  get: () => SecureStore.getItemAsync(REFRESH_KEY),
  set: (v: string) => SecureStore.setItemAsync(REFRESH_KEY, v),
  clear: () => SecureStore.deleteItemAsync(REFRESH_KEY),
};

let deviceId: string | null = null;

// Стабильный id устройства для заголовка X-Device-Id (без cookie jar бэкенд иначе считает каждый вход «новым устройством»).
export async function getDeviceId(): Promise<string> {
  if (deviceId) return deviceId;
  let id = await SecureStore.getItemAsync(DEVICE_KEY);
  if (!id) {
    id = Crypto.randomUUID();
    await SecureStore.setItemAsync(DEVICE_KEY, id);
  }
  deviceId = id;
  return id;
}
