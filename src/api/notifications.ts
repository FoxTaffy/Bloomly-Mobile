import { api } from './client';
import type { AppNotification } from '@/shared/api-types';

export async function fetchNotificationsPage(cursor?: string | null): Promise<{ notifications: AppNotification[]; nextCursor: string | null; unread: number }> {
  const res = await api.get('/notifications', { params: cursor ? { cursor, limit: 30 } : { limit: 30 } });
  const d = res.data.data;
  return { notifications: (d.notifications ?? []) as AppNotification[], nextCursor: d.nextCursor ?? null, unread: d.unread ?? 0 };
}

export async function fetchUnreadNotifications(): Promise<number> {
  const res = await api.get('/notifications/count');
  return res.data.data?.count ?? res.data.data?.unread ?? 0;
}

export async function markNotificationsRead(ids?: string[]) {
  await api.post('/notifications/read', ids ? { ids } : {});
}

/** Удаление: `ids` не передан — все. Сервер отдаёт, что именно удалил, чтобы «отменить» вернуло ровно это. */
export async function deleteNotifications(ids?: string[]): Promise<string[]> {
  const res = ids ? await api.post('/notifications/delete', { ids }) : await api.delete('/notifications');
  return (res.data.data?.ids ?? ids ?? []) as string[];
}

/** Не больше 500 id за запрос (web: MAX_IDS). */
const RESTORE_CHUNK = 500;
export async function restoreNotifications(ids: string[]) {
  for (let i = 0; i < ids.length; i += RESTORE_CHUNK) await api.post('/notifications/restore', { ids: ids.slice(i, i + RESTORE_CHUNK) });
}
