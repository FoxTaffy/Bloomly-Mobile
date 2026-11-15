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

// ── Фурсона, фурсьют, альбомы (только чтение; веб: composables/profile/useProfileFursonas.ts, AlbumsPanel.vue) ──────

export interface Fursona {
  id: string;
  name: string;
  species: string[];
  species_other: string | null;
  colors: string[];
  likes_dislikes_visible: boolean;
  likes: string[];
  dislikes: string[];
  is_primary: boolean;
  cover_image_url: string | null;
}

export async function fetchFursonas(userId: string): Promise<Fursona[]> {
  const res = await api.get(`/users/${userId}/fursonas`);
  return (res.data.data.fursonas ?? []) as Fursona[];
}

export interface FursonaReference {
  id: string;
  image_url: string;
  artist_name?: string | null;
}

export async function fetchFursonaReferences(userId: string, fursonaId: string): Promise<FursonaReference[]> {
  const res = await api.get(`/users/${userId}/fursonas/${fursonaId}/references`);
  return (res.data.data.referenceImages ?? []) as FursonaReference[];
}

export interface Fursuit {
  id: string;
  image_url: string | null;
  maker_id: string | null;
  description: string | null;
  is_nsfw: boolean;
}

export async function fetchFursuits(userId: string): Promise<Fursuit[]> {
  const res = await api.get(`/users/${userId}/fursuits`);
  return (res.data.data.fursuits ?? []) as Fursuit[];
}

export interface Album {
  id: string;
  title: string;
  description: string | null;
  privacy: 'public' | 'friends' | 'private';
  items: { media_url: string }[];
  _count?: { items: number };
}

export async function fetchAlbums(userId: string): Promise<Album[]> {
  const res = await api.get('/albums', { params: { userId } });
  return (res.data.data.albums ?? []) as Album[];
}

export async function fetchAlbum(id: string): Promise<Album> {
  const res = await api.get(`/albums/${id}`);
  return res.data.data.album as Album;
}
