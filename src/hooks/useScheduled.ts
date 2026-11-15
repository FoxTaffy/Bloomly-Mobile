import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteScheduled, fetchScheduled, publishScheduledNow, saveScheduled, type SavedPost } from '@/api/scheduled';

export function useScheduled() {
  return useQuery({ queryKey: ['scheduled-posts'], queryFn: fetchScheduled });
}

export function useSaveScheduled() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: saveScheduled, onSuccess: () => qc.invalidateQueries({ queryKey: ['scheduled-posts'] }) });
}

/** Удалить или опубликовать сейчас: строка пропадает сразу (веб: posts.value.filter); опубликованный пост появится в лентах и профиле. */
export function useScheduledActions() {
  const qc = useQueryClient();
  const drop = (id: string) => qc.setQueryData<SavedPost[]>(['scheduled-posts'], (list) => list?.filter((p) => p.id !== id));
  return {
    remove: useMutation({ mutationFn: (id: string) => deleteScheduled(id), onSuccess: (_d, id) => drop(id) }),
    publishNow: useMutation({
      mutationFn: (id: string) => publishScheduledNow(id),
      onSuccess: (_d, id) => {
        drop(id);
        qc.invalidateQueries({ queryKey: ['feed'] });
        qc.invalidateQueries({ queryKey: ['profile-posts'] });
      },
    }),
  };
}
