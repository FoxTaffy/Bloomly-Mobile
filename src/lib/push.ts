import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { registerExpoToken, unregisterExpoToken } from '@/api/push';
import { colors } from '@/theme/tokens';

const TOKEN_KEY = 'bloomly_push_token';
export const DEFAULT_CHANNEL_ID = 'default';
/** Бэкенд шлёт сообщения чатов в канал `messages` (push/service.ts), остальное — в `default`. */
export const MESSAGES_CHANNEL_ID = 'messages';

// Пока приложение открыто, показываем уведомление баннером.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Канал Android 8+: без него уведомления не показываются. */
async function ensureAndroidChannel(): Promise<void> {
  // Каналы есть только на Android: на iOS вызов не нужен.
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
    name: 'Bloomly',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: colors.accent,
  });
  await Notifications.setNotificationChannelAsync(MESSAGES_CHANNEL_ID, {
    name: 'Сообщения',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: colors.accent,
  });
}

/**
 * Запрашивает разрешение, получает Expo push-токен и отправляет его на бэкенд.
 * Возвращает токен или null (нет разрешения, симулятор, не задан EAS projectId).
 */
export async function registerForPush(): Promise<string | null> {
  try {
    await ensureAndroidChannel();

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return null; // появится после `eas init`, см. docs/ARCHITECTURE.md

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await registerExpoToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    return token;
  } catch {
    // Пуши необязательны: ошибка (симулятор, сеть) не должна ломать вход.
    return null;
  }
}

/** Отвязывает токен от аккаунта; вызывать до выхода, пока есть access-токен. */
export async function unregisterPush(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) return;
    await unregisterExpoToken(token);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // best-effort, как и сам выход
  }
}
