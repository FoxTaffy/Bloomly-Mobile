import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPost, suggestTags, type CreatePostBody } from '@/api/posts';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

/** Публикация поста (веб: PostComposer.vue publish → POST /posts). После успеха обновляем ленты. */
export function usePublishPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePostBody) => createPost(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['explore'] });
      qc.invalidateQueries({ queryKey: ['profile-posts'] });
    },
  });
}

/** Подсказки тегов по набранному (веб: useTagSuggestions, debounce). */
export function useTagSuggestions(input: string) {
  const q = useDebouncedValue(input.trim().replace(/^#/, ''), 250);
  const query = useQuery({ queryKey: ['tag-suggest', q], queryFn: () => suggestTags(q), enabled: q.length > 0, staleTime: 60_000 });
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(q.length > 0), [q]);
  return visible ? (query.data ?? []) : [];
}
