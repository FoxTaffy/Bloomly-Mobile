import * as SecureStore from 'expo-secure-store';
import { randomUUID } from 'expo-crypto';

// Стабильный идентификатор устройства: сервер по нему отличает «то же устройство» от нового (сессии, уведомления о входе,
// grace-период обновления токена). Формат /^[A-Za-z0-9-]{16,64}$/ (backend auth/controller.ts), uuid v4 подходит.
// Переживает выход из аккаунта: logout удаляет только токены и пользователя, этот ключ не трогает.
const DEVICE_ID_KEY = 'bloomly_device_id';

let cached: string | null = null;
let pending: Promise<string> | null = null;

async function load(): Promise<string> {
  try {
    const stored = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (stored) return stored;
  } catch {
    // хранилище недоступно: ниже сгенерируем идентификатор на время работы приложения
  }
  const id = randomUUID();
  try {
    await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  } catch {
    // без записи идентификатор действует до перезапуска
  }
  return id;
}

/** uuid устройства: читается из SecureStore один раз, дальше из памяти; создаётся при первом запуске. */
export function getDeviceId(): Promise<string> {
  if (cached) return Promise.resolve(cached);
  pending ??= load().then((id) => {
    cached = id;
    return id;
  });
  return pending;
}
