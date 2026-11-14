import { WEB_URL } from '@/lib/config';
import { isOwnHttpsUrl } from '@/shared/mediaHost';
import { useSession } from '@/stores/session';

/**
 * Заголовки для чтения закрытых файлов нашего сервера (сообщения, закрытые посты): бэкенд (`/api/media/authz`) принимает Bearer
 * мобильного клиента вместо cookie веба. Токен уходит ТОЛЬКО на наш хост по https (точное совпадение имени хоста, правило и
 * проверка в `shared/mediaHost.ts`): чужие и CDN-адреса получают пустые заголовки. Публичные файлы открываются и без токена, а
 * просроченный токен сервер считает гостем, так что заголовок не мешает.
 */
export function mediaHeaders(url: string): Record<string, string> | undefined {
  const token = useSession.getState().token;
  if (!token || !isOwnHttpsUrl(url, WEB_URL)) return undefined;
  return { Authorization: `Bearer ${token}` };
}

/** Источник для expo-image и expo-video: адрес и, для своего хоста, заголовок доступа. */
export function mediaSource(url: string): { uri: string; headers?: Record<string, string> } {
  const headers = mediaHeaders(url);
  return headers ? { uri: url, headers } : { uri: url };
}
