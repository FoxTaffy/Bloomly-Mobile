// Что можно сохранить на диск для чтения без сети: только первая страница ленты «Для вас» и только публичные посты.
// Никаких токенов, личных сообщений, уведомлений, профиля пользователя. Чистые функции без React.
import type { CursorPage, Post } from './api-types';

/** Ключ запроса ленты с курсорами: ['feed', режим, nsfw]. Первая страница (`'first'`) и остальные ключи не сохраняются. */
export function isCacheableFeedKey(key: readonly unknown[]): boolean {
  return key.length === 3 && key[0] === 'feed' && key[1] === 'for-you';
}

/** Пост пригоден для кэша: публичный (не только для подписчиков) и без 18+. */
const isPublicPost = (p: Post) => !p.subscriber_only && !p.is_nsfw;

/** Пост без данных конкретного читателя (его оценка, награда). */
function stripViewerData(p: Post): Post {
  const { my_vote: _vote, ...rest } = p;
  return { ...rest, rewardForUser: null };
}

export interface FeedCacheData {
  pages: CursorPage<Post>[];
  pageParams: unknown[];
}

/** Первая страница, только публичные посты, без данных читателя. */
export function sanitizeFeedData(data: FeedCacheData | undefined): FeedCacheData | undefined {
  const first = data?.pages?.[0];
  if (!first) return undefined;
  return {
    pages: [{ items: first.items.filter(isPublicPost).map(stripViewerData), nextCursor: first.nextCursor }],
    pageParams: [null],
  };
}

/** Срок годности сохранённой ленты: старше — не показываем (3 суток). */
export const FEED_CACHE_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
