const OWN_HOSTS = ['bloomly.fun', 'www.bloomly.fun'];

/**
 * Путь веба (адрес из push `data.url` или ссылка bloomly.fun) → маршрут мобильного приложения; null — открыть нельзя.
 * Используется для нажатия на push и для универсальных ссылок (app/+native-intent.tsx).
 */
export function webPathToRoute(url: string | null | undefined): string | null {
  if (!url) return null;
  let path = url;
  try {
    if (/^https?:\/\//.test(url)) {
      const u = new URL(url);
      // Только свой сайт: чужой адрес не превращаем в маршрут приложения
      if (!OWN_HOSTS.includes(u.host)) return null;
      path = u.pathname + u.search;
    } else if (/^bloomly:\/\//i.test(url)) {
      // bloomly://post/<id>: хост схемы — первый сегмент пути
      path = '/' + url.replace(/^bloomly:\/\//i, '');
    }
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

/**
 * Путь, с которым открыто приложение по ссылке (`+native-intent`): известный адрес веба → маршрут приложения,
 * неизвестный путь своего приложения/сайта уходит в +not-found (брендированный экран), а не молча на главную.
 * OAuth-возврат не трогаем: его обрабатывает app/auth/callback.tsx. Пустой путь → главная (index).
 */
export function systemPathToRoute(path: string): string {
  if (/(^|[/:])auth\/callback/.test(path)) return path;
  const mapped = webPathToRoute(path);
  if (mapped) return mapped;
  const clean = path.split(/[?#]/)[0];
  if (!clean || clean === '/' || clean === '//') return '/';
  return clean.startsWith('/') ? clean : `/${clean}`;
}
