import { api } from './client';
import type { UserProfile, UserSummary } from '@/shared/api-types';

export async function fetchUserProfile(idOrUsername: string): Promise<UserProfile> {
  const res = await api.get(`/users/${idOrUsername}`);
  return res.data.data.user as UserProfile;
}

export async function searchUsers(q: string, page = 1): Promise<UserSummary[]> {
  const res = await api.get('/users/search', { params: { q, limit: 20, page } });
  return res.data.data.users as UserSummary[];
}

export async function fetchBlockStatus(userId: string): Promise<boolean> {
  const res = await api.get(`/users/${userId}/block-status`);
  return !!res.data.data?.blocked;
}

export async function blockUser(userId: string) {
  await api.post(`/users/${userId}/block`);
}

export async function unblockUser(userId: string) {
  await api.delete(`/users/${userId}/block`);
}

/** Уведомления о новых постах автора (web: PostCard toggleNotify). */
export async function fetchNotifyStatus(userId: string): Promise<boolean> {
  const res = await api.get(`/users/${userId}/notify-status`);
  return !!res.data?.data?.notifyPosts;
}

export async function toggleNotify(userId: string): Promise<boolean> {
  const res = await api.post(`/users/${userId}/notify-toggle`);
  return !!res.data?.data?.notifyPosts;
}
