import { api } from './client';
import type { AppNotification } from '@/shared/api-types';

export async function fetchNotifications(): Promise<AppNotification[]> {
  const res = await api.get('/notifications');
  return res.data.data.notifications as AppNotification[];
}

export async function markNotificationsRead(ids?: string[]) {
  await api.post('/notifications/read', ids ? { ids } : {});
}
