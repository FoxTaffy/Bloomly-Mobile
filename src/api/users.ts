import { api } from './client';
import type { UserProfile, UserSummary } from '@/shared/api-types';
import type { AchievementsData } from '@/shared/achievements';

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

/** Поля профиля, которые можно менять в приложении (веб: SettingsBasicSection, SettingsInterestsSection, SettingsPrivacySection). */
export interface ProfilePatch {
  display_name?: string;
  bio?: string;
  pronouns?: string;
  location?: string;
  website?: string;
  avatar_url?: string;
  avatar_video_url?: string | null;
  banner_url?: string;
  likes?: string[];
  dislikes?: string[];
  profile_visibility?: PrivacyLevel;
  friends_list_visibility?: PrivacyLevel;
  messages_privacy?: PrivacyLevel;
  comments_privacy?: PrivacyLevel;
  mentions_privacy?: PrivacyLevel;
  online_status_visibility?: PrivacyLevel;
}
export type PrivacyLevel = 'everyone' | 'friends' | 'nobody' | 'only_me';

/** Тело PATCH — только изменённые поля (как на вебе: чужое устаревшее значение не затирает свежее). */
export async function updateMyProfile(body: ProfilePatch): Promise<UserProfile> {
  const res = await api.patch('/users/me', body);
  return res.data.data.user as UserProfile;
}

/** Смена @ника: 409 USERNAME_TAKEN — занят, 422 USERNAME_INVALID — не подходит (текст — в ответе сервера). */
export async function updateUsername(username: string): Promise<{ username: string }> {
  const res = await api.patch('/users/me/username', { username });
  return res.data.data.user as { username: string };
}

export async function fetchAchievements(userId: string): Promise<AchievementsData> {
  const res = await api.get(`/achievements/users/${encodeURIComponent(userId)}`);
  return res.data.data as AchievementsData;
}
