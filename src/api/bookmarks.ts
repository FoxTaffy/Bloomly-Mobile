import { api } from './client';
import type { Group, Post, UserSummary } from '@/shared/api-types';

// Закладки (веб: composables/useBookmarkPosts.ts и useBookmarkList.ts). Лоты Dealers' Den в приложении не показываются.

export type BookmarkSort = 'newest' | 'oldest' | 'top';
export const BOOKMARK_PAGE_SIZE = 20;

export interface BookmarkPostsPage {
  posts: Post[];
  total: number;
  hasMore: boolean;
}

export async function fetchBookmarkedPosts(opts: { skip: number; sort: BookmarkSort; mediaOnly: boolean; q: string }): Promise<BookmarkPostsPage> {
  const params: Record<string, string | number> = { skip: opts.skip, take: BOOKMARK_PAGE_SIZE, sort: opts.sort };
  if (opts.mediaOnly) params.hasMedia = 'true';
  if (opts.q) params.q = opts.q;
  const res = await api.get('/posts/me/bookmarks', { params });
  const d = res.data.data;
  return { posts: (d.posts ?? []) as Post[], total: d.total ?? 0, hasMore: !!d.hasMore };
}

export type BookmarkKind = 'users' | 'groups';

export async function fetchBookmarkedUsers(): Promise<UserSummary[]> {
  const res = await api.get('/bookmarks/users');
  return (res.data.data.users ?? []) as UserSummary[];
}

export async function fetchBookmarkedGroups(): Promise<Group[]> {
  const res = await api.get('/bookmarks/groups');
  return (res.data.data.groups ?? []) as Group[];
}

/** Бэкенд отдаёт переключатель: тот же POST и убирает, и возвращает закладку. */
export async function toggleBookmark(kind: BookmarkKind, id: string) {
  await api.post(`/bookmarks/${kind}/${id}`);
}
