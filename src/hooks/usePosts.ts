import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { createPost, fetchExplorePage, fetchFeedPage, fetchTrendingTags, repawPost, votePost } from '@/api/posts';
import { useNsfwMode } from '@/hooks/useNsfwMode';
import { FEED_CACHE_MAX_AGE_MS } from '@/shared/feedCache';
import type { CursorPage, Post } from '@/shared/api-types';
import { appendUnique, type ExplorePeriod, type ExploreSort, type FeedMode } from '@/shared/feed';

function flatten(data: InfiniteData<CursorPage<Post>> | undefined): Post[] {
  return (data?.pages ?? []).reduce<Post[]>((acc, page) => appendUnique(acc, page.items), []);
}

/** Первая страница ленты (без догрузки). */
export function usePosts(mode: FeedMode = 'for-you') {
  const { nsfwMode } = useNsfwMode();
  return useQuery({ queryKey: ['feed', mode, nsfwMode, 'first'], queryFn: () => fetchFeedPage({ mode, nsfw: nsfwMode }).then((p) => p.items) });
}

/** Лента с догрузкой по курсору сервера (nextCursor). */
export function useInfinitePosts(mode: FeedMode = 'for-you') {
  const { nsfwMode } = useNsfwMode();
  const query = useInfiniteQuery({
    queryKey: ['feed', mode, nsfwMode],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchFeedPage({ mode, nsfw: nsfwMode, cursor: pageParam }),
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

export function useVotePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, value }: { id: string; value: -1 | 0 | 1 }) => votePost(id, value),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['explore'] });
      qc.invalidateQueries({ queryKey: ['post', id] });
    },
  });
}

export function useRepawPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repawPost(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['post', id] });
    },
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => createPost({ content }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });
}
