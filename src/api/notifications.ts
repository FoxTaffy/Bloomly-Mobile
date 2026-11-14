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
