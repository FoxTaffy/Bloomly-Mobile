/**
 * Правило токена: Bearer отправляется ТОЛЬКО на наш собственный хост. Сравнивается разобранное имя хоста (URL.hostname)
 * на точное совпадение с хостом настроенного API, схема только https, без логина и пароля в адресе. Подстроки, поддомены и
 * чужие CDN не проходят: https://bloomly.fun.evil.com, https://evil.com/?https://bloomly.fun, https://bloomly.fun@evil.com,
 * https://cdn.bloomly.fun, http://bloomly.fun. Без React и зависимостей: проверяется scripts/check-media-host.mjs.
 */
export function isOwnHttpsUrl(url: string, ownBaseUrl: string): boolean {
  try {
    const target = new URL(url);
    const own = new URL(ownBaseUrl);
    if (target.protocol !== 'https:' || own.protocol !== 'https:') return false;
    if (target.username || target.password) return false;
    return target.hostname !== '' && target.hostname.toLowerCase() === own.hostname.toLowerCase();
  } catch {
    return false;
  }
}
