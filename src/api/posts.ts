import { api } from './client';
import type { Comment, CursorPage, NsfwMode, Post } from '@/shared/api-types';
import { exploreRequest, feedRequest, isRenderablePost, SEARCH_PAGE_SIZE, type ExplorePeriod, type ExploreSort, type FeedMode } from '@/shared/feed';

export async function fetchTrendingTags(includeNsfw = false): Promise<{ id: string; name: string; count: number }[]> {
  const res = await api.get('/posts/trending-tags', { params: { includeNsfw: String(includeNsfw) } });
  return res.data.data.tags;
}

export async function fetchFeed(params: { personalized: boolean }): Promise<Post[]> {
  const path = params.personalized ? '/posts/personalized' : '/posts';
  const res = await api.get(path);
  return res.data.data.posts as Post[];
}

export async function searchPosts(q: string): Promise<Post[]> {
  const res = await api.get('/posts/search', { params: { q, limit: 20 } });
  return res.data.data.posts as Post[];
}

/** Состояние читателя по постам (оценка, репост, закладка): web — `loadViewerState` в composables/useFeed.ts. */
const STATUS_BATCH = 50;

async function attachMyVote(posts: Post[]): Promise<Post[]> {
  const votes = new Map<string, -1 | 0 | 1>();
  for (let i = 0; i < posts.length; i += STATUS_BATCH) {
    const ids = posts.slice(i, i + STATUS_BATCH).map((p) => p.id);
    try {
      const res = await api.get('/posts/status', { params: { ids: ids.join(',') } });
      for (const s of (res.data?.data ?? []) as { id: string; userVote?: -1 | 0 | 1 }[]) votes.set(s.id, s.userVote ?? 0);
    } catch {
      // не критично: карточка покажет нейтральное состояние (как на вебе)
    }
  }
  return posts.map((p) => (votes.has(p.id) ? { ...p, my_vote: votes.get(p.id) } : p));
}

export async function fetchPost(id: string): Promise<Post> {
  const res = await api.get(`/posts/${id}`);
  return (await attachMyVote([res.data.data.post as Post]))[0];
}

export async function fetchComments(postId: string): Promise<{ comments: Comment[]; canModerate: boolean }> {
  const res = await api.get(`/posts/${postId}/comments`);
  return { comments: (res.data.data.comments ?? []) as Comment[], canModerate: !!res.data.data.canModerate };
}

async function getPostsPage(path: string, params: Record<string, string>): Promise<CursorPage<Post>> {
  const res = await api.get(path, { params });
  const posts = await attachMyVote(((res.data.data.posts ?? []) as Post[]).filter(isRenderablePost));
  return { items: posts, nextCursor: res.data.data.nextCursor ?? null };
}

export function fetchFeedPage(opts: { mode: FeedMode; nsfw: NsfwMode; cursor?: string | null }) {
  const { path, params } = feedRequest(opts);
  return getPostsPage(path, params);
}

export function fetchExplorePage(opts: { sort: ExploreSort; period: ExplorePeriod; tag?: string; nsfw: NsfwMode; cursor?: string | null }) {
  const { path, params } = exploreRequest(opts);
  return getPostsPage(path, params);
}

export async function searchPostsPage(q: string, page: number, nsfw: NsfwMode = 'hide'): Promise<Post[]> {
  const res = await api.get('/posts/search', { params: { q, limit: SEARCH_PAGE_SIZE, page, sort: 'relevance', synonyms: 'true', nsfw } });
  return attachMyVote((res.data.data.posts ?? []) as Post[]);
}

export async function searchTags(q: string): Promise<{ id: string; name: string; count: number }[]> {
  const res = await api.get('/posts/search/tags', { params: { q, limit: 20 } });
  return res.data.data.tags ?? [];
}

export async function createComment(postId: string, content: string, parentId?: string): Promise<Comment> {
  const res = await api.post(`/posts/${postId}/comments`, { content, parentId });
  return res.data.data.comment as Comment;
}

export async function fetchUserPosts(userId: string, tab: 'posts' | 'media' | 'likes' | 'repaws' = 'posts'): Promise<Post[]> {
  const suffix = tab === 'posts' ? '' : `/${tab}`;
  const res = await api.get(`/posts/user/${userId}${suffix}`);
  return attachMyVote(res.data.data.posts as Post[]);
}

/** Тело как у веба (PostComposer.vue payload + subscriberOnly). */
export interface CreatePostBody {
  content?: string;
  tags?: string[];
  isNsfw?: boolean;
  isAiGenerated?: boolean;
  category?: string;
  mediaUrls?: string[];
  mediaOriginalUrls?: string[];
  subscriberOnly?: boolean;
}

export async function createPost(body: CreatePostBody): Promise<Post> {
  const res = await api.post('/posts', body);
  return res.data.data.post as Post;
}

export async function suggestTags(q: string): Promise<{ name: string; count: number }[]> {
  const res = await api.get('/posts/tags/suggest', { params: { q } });
  return res.data.data.tags ?? [];
}

/** Как на вебе: шлём нажатую стрелку (1 или -1), повтор той же снимает оценку. Сервер отдаёт новый рейтинг. */
export async function votePost(id: string, value: 1 | -1): Promise<number | null> {
  const res = await api.post(`/posts/${id}/vote`, { value });
  return typeof res.data?.data?.rating === 'number' ? res.data.data.rating : null;
}

export async function repawPost(id: string) {
  await api.post(`/posts/${id}/repaw`);
}

export async function favouritePost(id: string) {
  await api.post(`/posts/${id}/favourite`);
}
