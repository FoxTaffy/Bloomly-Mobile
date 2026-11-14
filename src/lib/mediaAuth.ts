import { WEB_URL } from '@/lib/config';
import { useSession } from '@/stores/session';

/**
 * Заголовки для чтения закрытых файлов нашего сервера (сообщения, закрытые посты): бэкенд (`/api/media/authz`) принимает Bearer
 * мобильного клиента вместо cookie веба. Токен уходит только на свой сайт: чужие адреса получают пустые заголовки.
 */
export function mediaHeaders(url: string): Record<string, string> | undefined {
  const token = useSession.getState().token;
  if (!token) return undefined;
  try {
    if (new URL(url).origin !== new URL(WEB_URL).origin) return undefined;
  } catch {
    return undefined;
  }
  return { Authorization: `Bearer ${token}` };
}
