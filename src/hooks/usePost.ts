import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createComment, fetchComments, fetchPost } from '@/api/posts';

/** Один пост. 403/404 — «не найдено» (web: views/PostView.vue); retry отключён, чтобы не тянуть ответ «нет». */
export function usePost(id: string) {
  return useQuery({ queryKey: ['post', id], queryFn: () => fetchPost(id), enabled: !!id, retry: false });
}

export function usePostComments(postId: string) {
  return useQuery({ queryKey: ['comments', postId], queryFn: () => fetchComments(postId), enabled: !!postId });
}

export function useCreateComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: string }) => createComment(postId, content, parentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', postId] });
      qc.invalidateQueries({ queryKey: ['post', postId] });
    },
  });
}
