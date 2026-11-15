import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchBookmarkedGroups, fetchBookmarkedPosts, fetchBookmarkedUsers, toggleBookmark, type BookmarkKind, type BookmarkSort } from '@/api/bookmarks';
import type { Post } from '@/shared/api-types';
import { appendUnique } from '@/shared/feed';

/** Закладки-посты: страницы по смещению (`skip`), серверный поиск (веб: useBookmarkPosts). */
export function useBookmarkedPosts(opts: { sort: BookmarkSort; mediaOnly: boolean; q: string; enabled: boolean }) {
  const query = useInfiniteQuery({
    queryKey: ['bookmarks', 'posts', opts.sort, opts.mediaOnly, opts.q],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchBookmarkedPosts({ skip: pageParam, sort: opts.sort, mediaOnly: opts.mediaOnly, q: opts.q }),
    getNextPageParam: (last, all) => (last.hasMore ? all.reduce((n, p) => n + p.posts.length, 0) : undefined),
    enabled: opts.enabled,
  });
  const posts = (query.data?.pages ?? []).reduce<Post[]>((acc, p) => appendUnique(acc, p.posts), []);
  return { ...query, posts, total: query.data?.pages[0]?.total ?? 0 };
}

export function useBookmarkedUsers(enabled: boolean) {
  return useQuery({ queryKey: ['bookmarks', 'users'], queryFn: fetchBookmarkedUsers, enabled });
}

export function useBookmarkedGroups(enabled: boolean) {
  return useQuery({ queryKey: ['bookmarks', 'groups'], queryFn: fetchBookmarkedGroups, enabled });
}

/** Убрать из закладок аккаунт или группу: пропадает сразу, при отказе сервера возвращается (веб: useBookmarkList.remove). */
export function useRemoveBookmark(kind: BookmarkKind) {
  const qc = useQueryClient();
  const key = ['bookmarks', kind];
  return useMutation({
    mutationFn: (id: string) => toggleBookmark(kind, id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<{ id: string }[]>(key);
      qc.setQueryData<{ id: string }[]>(key, (list) => list?.filter((x) => x.id !== id));
      return { prev };
    },
    onError: (_e, _id, ctx) => ctx?.prev && qc.setQueryData(key, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
