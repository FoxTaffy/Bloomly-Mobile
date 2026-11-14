// Чистая логика ленты и обзора. Перенос frontend/src/lib/feed.ts и composables/useExploreFeed.ts.

export type FeedMode = 'for-you' | 'subscriptions' | 'news';
export type ExploreSort = 'hot' | 'new';
export type ExplorePeriod = 'day' | 'week' | 'month' | 'all';

export const EXPLORE_SORTS: readonly ExploreSort[] = ['hot', 'new'];
export const EXPLORE_PERIODS: readonly ExplorePeriod[] = ['day', 'week', 'month', 'all'];
export const EXPLORE_PAGE_SIZE = 24;
export const SEARCH_PAGE_SIZE = 20;

/** Посты без автора не показываем, кроме групповых: у них автор скрыт бэкендом намеренно. */
export const isRenderablePost = (post: {
  id?: string;
  author?: unknown;
  groupPosts?: unknown[];
} | null | undefined): boolean =>
  !!post && !!post.id && (!!post.author || (Array.isArray(post.groupPosts) && post.groupPosts.length > 0));

/** Лента сдвигается, пока пользователь читает, — отсекаем повторы на стыке страниц. */
export function appendUnique<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const known = new Set(existing.map((p) => p.id));
  const fresh = incoming.filter((p) => !known.has(p.id));
  return fresh.length ? [...existing, ...fresh] : existing;
}

/** Параметры запроса обзора. «Актуальное» (hot) идёт через /posts/personalized со scope=explore, «Новое» — хронология /posts. */
export function exploreRequest(opts: {
  sort: ExploreSort;
  period: ExplorePeriod;
  tag?: string;
  nsfw: string;
  cursor?: string | null;
}): { path: string; params: Record<string, string> } {
  const personalized = opts.sort === 'hot';
  const params: Record<string, string> = {
    limit: String(EXPLORE_PAGE_SIZE),
    nsfw: opts.nsfw,
    ...(personalized ? { scope: 'explore' } : { sort: 'new', hasMedia: 'true' }),
  };
  if (opts.cursor) params.cursor = opts.cursor;
  if (personalized && opts.period !== 'all') params.period = opts.period;
  if (opts.tag) {
    params.tag = opts.tag.replace(/^#/, '');
    params.synonyms = 'true';
  }
  return { path: personalized ? '/posts/personalized' : '/posts', params };
}

/** Параметры страницы ленты (web: feedUrl). */
export function feedRequest(opts: { mode: FeedMode; nsfw: string; cursor?: string | null }): { path: string; params: Record<string, string> } {
  const params: Record<string, string> = opts.cursor ? { nsfw: opts.nsfw, cursor: opts.cursor } : { page: '1', nsfw: opts.nsfw };
  if (opts.mode === 'for-you') return { path: '/posts/personalized', params };
  if (opts.mode === 'subscriptions') return { path: '/follows/feed', params };
  params.excludeOwn = 'true';
  params.sort = 'smart';
  return { path: '/posts', params };
}
