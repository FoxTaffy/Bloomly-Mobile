import { systemPathToRoute } from '@/shared/links';

/**
 * Входящая ссылка из системы (https://bloomly.fun/..., bloomly://...) → маршрут приложения. Логику разбора см. в shared/links.ts.
 * Защищённые адреса без сессии обрабатывает +not-found (запоминает цель и ведёт на вход).
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return systemPathToRoute(path);
}
