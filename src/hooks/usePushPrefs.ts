import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPushPrefs, updatePushPrefs, type PushPrefs } from '@/api/push';

export function usePushPrefs() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['push-prefs'], queryFn: fetchPushPrefs });
  const update = useMutation({
    mutationFn: (prefs: Partial<PushPrefs>) => updatePushPrefs(prefs),
    // Переключатель отвечает сразу; при ошибке возвращаем прежнее значение
    onMutate: async (prefs) => {
      await qc.cancelQueries({ queryKey: ['push-prefs'] });
      const prev = qc.getQueryData<PushPrefs>(['push-prefs']);
      qc.setQueryData<PushPrefs>(['push-prefs'], (old) => (old ? { ...old, ...prefs } : old));
      return { prev };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(['push-prefs'], ctx.prev);
    },
    onSuccess: (data) => qc.setQueryData(['push-prefs'], data),
  });
  return { query, update };
}
