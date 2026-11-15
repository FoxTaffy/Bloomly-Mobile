import { api } from './client';
import type { FriendUser } from '@/shared/api-types';

// Эндпоинты страницы «Друзья» (веб: stores/friends.ts). Друзья — взаимные подписки; ответ каждого списка — массив в data.

export type FriendTab = 'friends' | 'followers' | 'following';

export async function fetchFriendList(tab: FriendTab): Promise<FriendUser[]> {
  const res = await api.get(tab === 'friends' ? '/friends' : `/friends/${tab}`);
  const list = (res.data.data ?? []) as FriendUser[];
  // Подписчики не подписаны в ответ, подписки — наоборот (как на вебе: loadFollowers/loadFollowing)
  return tab === 'followers' ? list.map((u) => ({ ...u, is_following: false })) : tab === 'following' ? list.map((u) => ({ ...u, is_following: true })) : list;
}

export async function fetchSuggestions(): Promise<FriendUser[]> {
  const res = await api.get('/friends/suggestions');
  return (res.data.data ?? []) as FriendUser[];
}

/** Заявка в друзья: `targetId` — uuid или @username (бэкенд понимает оба). */
export async function sendFriendRequest(targetId: string) {
  await api.post('/friends/request', { targetId });
}

/** Удаление из друзей: бэкенд снимает подписки в обе стороны. */
export async function removeFriend(friendId: string) {
  await api.delete(`/friends/${friendId}`);
}
