import { api } from './client';
import type { Comment, CursorPage, NsfwMode, Post } from '@/shared/api-types';
import { exploreRequest, feedRequest, isRenderablePost, SEARCH_PAGE_SIZE, type ExplorePeriod, type ExploreSort, type FeedMode, type FeedSort } from '@/shared/feed';

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

type ViewerState = { id: string; userVote?: -1 | 0 | 1; repawed?: boolean; favourited?: boolean };

async function attachMyVote(posts: Post[]): Promise<Post[]> {
  const states = new Map<string, ViewerState>();
  for (let i = 0; i < posts.length; i += STATUS_BATCH) {
    const ids = posts.slice(i, i + STATUS_BATCH).map((p) => p.id);
    try {
      const res = await api.get('/posts/status', { params: { ids: ids.join(',') } });
      for (const s of (res.data?.data ?? []) as ViewerState[]) states.set(s.id, s);
    } catch {
      // не критично: карточка покажет нейтральное состояние (как на вебе)
    }
  }
  return posts.map((p) => {
    const s = states.get(p.id);
    return s ? { ...p, my_vote: s.userVote ?? 0, repawed: !!s.repawed, favourited: !!s.favourited } : p;
  });
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

export function fetchFeedPage(opts: { mode: FeedMode; nsfw: NsfwMode; sort?: FeedSort; cursor?: string | null }) {
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

export async function fetchUserPosts(userId: string, tab: 'posts' | 'media' | 'likes' | 'repaws' | 'archive' = 'posts'): Promise<Post[]> {
  // «Архив» — только свои архивированные посты (бэкенд: /user/:id/archived)
  const suffix = tab === 'posts' ? '' : tab === 'archive' ? '/archived' : `/${tab}`;
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

/** Переключатель репоста (web: toggleRepaw). Сервер отдаёт итог: стоит ли репост и сколько их всего. */
export async function repawPost(id: string): Promise<{ repawed: boolean; repaw_count: number | null }> {
  const res = await api.post(`/posts/${id}/repaw`, {});
  const d = res.data?.data ?? {};
  return { repawed: !!d.repawed, repaw_count: typeof d.repaw_count === 'number' ? d.repaw_count : null };
}

/** Переключатель закладки (web: toggleFavourite). */
export async function favouritePost(id: string): Promise<boolean> {
  const res = await api.post(`/posts/${id}/favourite`);
  return !!res.data?.data?.favourited;
}

/** Правка своего поста (web: saveEdit → PATCH /posts/:id). */
export interface EditPostBody {
  content: string;
  tags: string[];
  isNsfw: boolean;
  isAiGenerated: boolean;
  addMediaUrls: string[];
  addMediaOriginalUrls: string[];
}

export async function editPost(id: string, body: EditPostBody): Promise<Post> {
  const res = await api.patch(`/posts/${id}`, body);
  return res.data.data.post as Post;
}

export async function deletePost(id: string) {
  await api.delete(`/posts/${id}`);
}

/** Архив — переключатель: пост уходит из лент в «Архив» профиля и обратно. */
export async function toggleArchivePost(id: string) {
  await api.post(`/posts/${id}/archive`);
}

export async function toggleCommentsDisabled(id: string): Promise<boolean> {
  const res = await api.post(`/posts/${id}/comments-toggle`);
  return !!res.data?.data?.commentsDisabled;
}

export async function setNotInterested(id: string, value: boolean) {
  await api.post(`/posts/${id}/not-interested`, { value });
}

/** Оценка комментария: шлём нажатую стрелку, повтор снимает оценку; сервер отдаёт новый рейтинг (web: voteComment). */
export async function voteComment(commentId: string, value: 1 | -1): Promise<number | null> {
  const res = await api.post(`/posts/comments/${commentId}/vote`, { value });
  return typeof res.data?.data?.rating === 'number' ? res.data.data.rating : null;
}

export async function deleteComment(commentId: string) {
  await api.delete(`/posts/comments/${commentId}`);
}

/** Посты, которые лайкнул человек (из уведомления о пачке лайков; веб: NotificationLikesView). */
export async function fetchLikedBy(userId: string): Promise<{ posts: Post[]; liker: { id: string; username: string; display_name: string | null } | null }> {
  const res = await api.get(`/posts/me/liked-by/${userId}`);
  const d = res.data.data;
  return { posts: await attachMyVote((d.posts ?? []) as Post[]), liker: d.liker ?? null };
}

export async function pinPost(id: string) {
  await api.put(`/users/me/pin/${id}`);
}

export async function unpinPost() {
  await api.delete('/users/me/pin');
}
