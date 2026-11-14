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

export async function fetchPost(id: string): Promise<Post> {
  const res = await api.get(`/posts/${id}`);
  return res.data.data.post as Post;
}

export async function fetchComments(postId: string): Promise<{ comments: Comment[]; canModerate: boolean }> {
  const res = await api.get(`/posts/${postId}/comments`);
  return { comments: (res.data.data.comments ?? []) as Comment[], canModerate: !!res.data.data.canModerate };
}

async function getPostsPage(path: string, params: Record<string, string>): Promise<CursorPage<Post>> {
  const res = await api.get(path, { params });
  const posts = ((res.data.data.posts ?? []) as Post[]).filter(isRenderablePost);
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
  return (res.data.data.posts ?? []) as Post[];
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
  return res.data.data.posts as Post[];
}

export async function createPost(body: {
  content?: string;
  isNsfw?: boolean;
  category?: string;
  mediaUrls?: string[];
  mediaOriginalUrls?: string[];
}): Promise<Post> {
  const res = await api.post('/posts', body);
  return res.data.data.post as Post;
}

export async function votePost(id: string, value: -1 | 0 | 1) {
  await api.post(`/posts/${id}/vote`, { value });
}

export async function repawPost(id: string) {
  await api.post(`/posts/${id}/repaw`);
}

export async function favouritePost(id: string) {
  await api.post(`/posts/${id}/favourite`);
}
