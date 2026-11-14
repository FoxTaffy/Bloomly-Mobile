import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { searchGroups } from '@/api/groups';
import { searchPostsPage, searchTags } from '@/api/posts';
import { searchUsers } from '@/api/users';
import { useNsfwMode } from '@/hooks/useNsfwMode';
import { SEARCH_PAGE_SIZE } from '@/shared/feed';

// Поиск постранично, как на вебе (views/SearchView.vue): есть ещё страница, если пришла полная.
function paged<T extends { id: string }>(key: string, q: string, load: (q: string, page: number) => Promise<T[]>) {
  const query = useInfiniteQuery({
    queryKey: ['search', key, q],
    enabled: q.length > 0,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => load(q, pageParam),
    getNextPageParam: (last, all) => (last.length >= SEARCH_PAGE_SIZE ? all.length + 1 : undefined),
  });
  const seen = new Set<string>();
  const items = (query.data?.pages ?? []).flat().filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
  return { ...query, items };
}

export const useSearchUsers = (q: string) => paged('users', q, searchUsers);
export const useSearchGroups = (q: string) => paged('groups', q, searchGroups);
/** Поиск постов учитывает режим NSFW (hide / blur / show) так же, как лента. */
export function useSearchPosts(q: string) {
  const { nsfwMode } = useNsfwMode();
  return paged(`posts:${nsfwMode}`, q, (query, page) => searchPostsPage(query, page, nsfwMode));
}

export function useSearchTags(q: string) {
  return useQuery({ queryKey: ['search', 'tags', q], queryFn: () => searchTags(q), enabled: q.length > 0 });
}
