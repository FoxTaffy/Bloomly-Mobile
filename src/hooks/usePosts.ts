import { useCallback, useRef } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { createPost, fetchExplorePage, fetchFeedPage, fetchTrendingTags, votePost } from '@/api/posts';
import { useNsfwMode } from '@/hooks/useNsfwMode';
import { patchPostEverywhere } from '@/hooks/usePostActions';
import { FEED_CACHE_MAX_AGE_MS } from '@/shared/feedCache';
import type { CursorPage, Post } from '@/shared/api-types';
import { appendUnique, isSortableMode, type ExplorePeriod, type ExploreSort, type FeedMode, type FeedSort } from '@/shared/feed';

function flatten(data: InfiniteData<CursorPage<Post>> | undefined): Post[] {
  return (data?.pages ?? []).reduce<Post[]>((acc, page) => appendUnique(acc, page.items), []);
}

/** Первая страница ленты (без догрузки). */
export function usePosts(mode: FeedMode = 'for-you') {
  const { nsfwMode } = useNsfwMode();
  return useQuery({ queryKey: ['feed', mode, nsfwMode, 'first'], queryFn: () => fetchFeedPage({ mode, nsfw: nsfwMode }).then((p) => p.items) });
}

/** Лента с догрузкой по курсору сервера (nextCursor). */
export function useInfinitePosts(mode: FeedMode = 'for-you', sort: FeedSort = 'smart') {
  const { nsfwMode } = useNsfwMode();
  // Сортировка есть только у общих вкладок: у остальных она не входит в ключ и в запрос
  const appliedSort: FeedSort = isSortableMode(mode) ? sort : 'smart';
  const query = useInfiniteQuery({
    // У «Для вас» и «Подписок» ключ прежний (3 элемента): по нему лента сохраняется на диск (shared/feedCache.ts)
    queryKey: isSortableMode(mode) ? ['feed', mode, nsfwMode, appliedSort] : ['feed', mode, nsfwMode],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchFeedPage({ mode, nsfw: nsfwMode, sort: appliedSort, cursor: pageParam }),
    getNextPageParam: (last) => last.nextCursor,
    // Лента «Для вас» сохраняется на диск для чтения без сети (lib/queryPersist.ts): держим её в памяти не меньше срока кэша
    gcTime: mode === 'for-you' ? FEED_CACHE_MAX_AGE_MS : undefined,
  });
  return { ...query, posts: flatten(query.data) };
}

/** Обзор: «Актуальное» / «Новое», период и тег (web: useExploreFeed). */
export function useExplorePosts(opts: { sort: ExploreSort; period: ExplorePeriod; tag?: string }) {
  const { nsfwMode } = useNsfwMode();
  const query = useInfiniteQuery({
    queryKey: ['explore', opts.sort, opts.period, opts.tag ?? '', nsfwMode],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchExplorePage({ ...opts, nsfw: nsfwMode, cursor: pageParam }),
    getNextPageParam: (last) => last.nextCursor,
  });
  return { ...query, posts: flatten(query.data) };
}

export function useTrendingTags() {
  const { nsfwMode } = useNsfwMode();
  return useQuery({ queryKey: ['trending-tags', nsfwMode !== 'hide'], queryFn: () => fetchTrendingTags(nsfwMode !== 'hide') });
}

/**
 * Оценка поста ▲/▼ как на вебе (PostCard.vue → vote): оптимистично, повтор той же стрелки снимает голос,
 * рейтинг берётся из ответа сервера, при ошибке откат. Состояние лежит в кэше запросов, а не в карточке:
 * список переиспользует карточки, и локальная оценка переезжала бы на чужой пост. Ленты не перезапрашиваем.
 */
export function usePostVote(post: Post) {
  const qc = useQueryClient();
  const pending = useRef(false);
  const vote: -1 | 0 | 1 = post.my_vote ?? 0;
  const rating = post.rating ?? 0;

  const cast = useCallback(
    async (value: 1 | -1) => {
      if (pending.current) return;
      pending.current = true;
      const next: -1 | 0 | 1 = vote === value ? 0 : value;
      patchPostEverywhere(qc, post.id, (p) => ({ ...p, my_vote: next, rating: rating + (next - vote) }));
      try {
        const serverRating = await votePost(post.id, value);
        if (serverRating !== null) patchPostEverywhere(qc, post.id, (p) => ({ ...p, rating: serverRating }));
      } catch {
        patchPostEverywhere(qc, post.id, (p) => ({ ...p, my_vote: vote, rating }));
      } finally {
        pending.current = false;
      }
    },
    [qc, post.id, vote, rating],
  );

  return { vote, rating, cast };
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => createPost({ content }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });
}
