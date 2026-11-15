import { api } from './client';

// Отложенные посты и черновики (веб: components/feed/ScheduledPostsList.vue, PostComposer.vue → /posts/scheduled).

export interface SavedPost {
  id: string;
  content: string;
  title: string | null;
  media_urls: string[];
  media_original_urls: string[];
  post_type?: string;
  is_nsfw: boolean;
  is_ai_generated: boolean;
  tags: string[];
  status: 'draft' | 'scheduled' | 'failed';
  scheduled_at: string | null;
  timezone: string | null;
  repeat_interval: 'daily' | 'weekly' | 'monthly' | null;
  last_error: string | null;
  group: { id: string; slug: string; name: string; avatar_url: string | null } | null;
}

export async function fetchScheduled(): Promise<SavedPost[]> {
  const res = await api.get('/posts/scheduled');
  return (res.data.data.posts ?? []) as SavedPost[];
}

export interface SaveScheduledBody {
  content: string;
  tags?: string[];
  isNsfw?: boolean;
  isAiGenerated?: boolean;
  mediaUrls?: string[];
  mediaOriginalUrls?: string[];
  /** ISO (UTC), строго в будущем; без него пост сохраняется черновиком. */
  scheduledAt?: string;
  timezone?: string;
}

export async function saveScheduled(body: SaveScheduledBody): Promise<SavedPost> {
  const res = await api.post('/posts/scheduled', body);
  return res.data.data.post as SavedPost;
}

export async function deleteScheduled(id: string) {
  await api.delete(`/posts/scheduled/${id}`);
}

export async function publishScheduledNow(id: string) {
  await api.post(`/posts/scheduled/${id}/publish-now`);
}
