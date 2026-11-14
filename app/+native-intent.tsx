import { webPathToRoute } from '@/shared/links';

/**
 * Входящая ссылка из системы (https://bloomly.fun/..., bloomly://...) → маршрут приложения.
 * Открываются только пост, профиль, группа и событие; всё остальное ведёт на главную, а не на «не найдено».
 * Возврат OAuth (bloomly://auth/callback?...) не трогаем: его обрабатывает app/auth/callback.tsx.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  if (/(^|[/:])auth\/callback/.test(path)) return path;
  return webPathToRoute(path) ?? '/';
}
