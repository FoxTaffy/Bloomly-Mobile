import { api } from './client';
import type { Story, StoryViewer } from '@/shared/api-types';

export async function fetchStories(): Promise<Story[]> {
  const res = await api.get('/stories');
  return res.data.data.stories as Story[];
}

/** Публикация истории: файл уже загружен в `posts` (папки stories у загрузки нет — бэкенд принимает ссылку из posts). */
export async function createStory(body: { image_url?: string; video_url?: string }): Promise<Story> {
  const res = await api.post('/stories', body);
  return res.data.data.story as Story;
}

/** Оценка истории: повтор той же кнопки снимает голос; сервер отдаёт итог (web: castVote). */
export async function voteStory(id: string, value: 1 | -1): Promise<{ my_vote: -1 | 0 | 1; score: number }> {
  const res = await api.post(`/stories/${id}/vote`, { value });
  return { my_vote: res.data.data.my_vote, score: res.data.data.score };
}

export async function viewStory(id: string) {
  await api.post(`/stories/${id}/view`);
}

/** Кто смотрел свою историю. */
export async function fetchStoryViewers(id: string): Promise<StoryViewer[]> {
  const res = await api.get(`/stories/${id}/viewers`);
  return (res.data.data.viewers ?? []) as StoryViewer[];
}

export async function deleteStory(id: string) {
  await api.delete(`/stories/${id}`);
}
