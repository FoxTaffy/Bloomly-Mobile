import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createStory, deleteStory, fetchStories, fetchStoryViewers, viewStory, voteStory } from '@/api/stories';
import type { Story } from '@/shared/api-types';
import { getOrCreateConversation, sendMessage } from '@/api/messages';
import { buildStoryReply, groupStories } from '@/shared/stories';

export function useStories() {
  return useQuery({ queryKey: ['stories'], queryFn: fetchStories });
}

/** Истории по авторам: каждая группа — одно кольцо в ленте. */
export function useStoryGroups() {
  const query = useStories();
  const groups = useMemo(() => groupStories(query.data ?? []), [query.data]);
  return { ...query, groups };
}

/** Правка одной истории в кэше (оценка, счётчик): ответы сервера кладём сюда, чтобы не перезапрашивать список. */
function patchStory(qc: ReturnType<typeof useQueryClient>, id: string, patch: Partial<Story>) {
  qc.setQueryData<Story[]>(['stories'], (list) => list?.map((s) => (s.id === id ? { ...s, ...patch } : s)));
}

/** Оценка истории: оптимистично, при ошибке откат (web: castVote). */
export function useVoteStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ story, value }: { story: Story; value: 1 | -1 }) => voteStory(story.id, value),
    onMutate: ({ story, value }) => {
      const next: -1 | 0 | 1 = story.my_vote === value ? 0 : value;
      patchStory(qc, story.id, { my_vote: next, score: story.score - story.my_vote + next });
      return { story };
    },
    onSuccess: (r, { story }) => patchStory(qc, story.id, r),
    onError: (_e, _v, ctx) => ctx && patchStory(qc, ctx.story.id, { my_vote: ctx.story.my_vote, score: ctx.story.score }),
  });
}

/** Отметка просмотра: один раз на историю за показ, свои и повторы не отправляем (web: trackView). */
export function useTrackView() {
  return useMutation({ mutationFn: (id: string) => viewStory(id) });
}

export function useStoryViewers(id: string | null) {
  return useQuery({ queryKey: ['story-viewers', id], queryFn: () => fetchStoryViewers(id!), enabled: !!id });
}

export function usePublishStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createStory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stories'] }),
  });
}

export function useDeleteStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStory(id),
    onSuccess: (_d, id) => qc.setQueryData<Story[]>(['stories'], (list) => list?.filter((s) => s.id !== id)),
  });
}

/** Ответ на историю: сообщение в личный диалог с автором в формате веба (web: StoryViewer sendReply). */
export function useSendStoryReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ story, text }: { story: Story; text: string }) => {
      const conv = await getOrCreateConversation(story.user.id);
      await sendMessage(conv.id, { content: buildStoryReply(story, text) });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}
