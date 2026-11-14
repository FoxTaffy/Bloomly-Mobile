/**
 * Путь веба (адрес из push `data.url` или ссылка bloomly.fun) → маршрут мобильного приложения; null — открыть нельзя.
 * Пока приложение v1 без универсальных ссылок: используется для нажатия на push.
 */
export function webPathToRoute(url: string | null | undefined): string | null {
  if (!url) return null;
  let path = url;
  try {
    if (/^https?:\/\//.test(url)) path = new URL(url).pathname + new URL(url).search;
  } catch {
    return null;
  }
  const chat = path.match(/^\/messages\?(?:.*&)?c=([0-9a-f-]{36})/i);
  if (chat) return `/messages/${chat[1]}`;
  if (path === '/messages' || path.startsWith('/messages?')) return '/messages';
  if (path.startsWith('/notifications')) return '/notifications';
  const post = path.match(/^\/post\/([0-9a-f-]{36})/i);
  if (post) return `/post/${post[1]}`;
  const profile = path.match(/^\/profile\/([^/?#]+)/);
  if (profile) return `/profile/${profile[1]}`;
  const group = path.match(/^\/groups\/([^/?#]+)\/?$/);
  if (group) return `/groups/${group[1]}`;
  const event = path.match(/^\/events\/([^/?#]+)\/?$/);
  if (event) return `/events/${event[1]}`;
  return null;
}
