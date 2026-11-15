import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createComment, fetchCoauthorStatus, fetchComments, fetchPost, respondCoauthor } from '@/api/posts';

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

/** Приглашён ли я соавтором этого поста: баннер «принять / отклонить» над постом. Автору поста статус не запрашиваем. */
export function useCoauthorInvite(post: { id: string; author_id?: string; author?: { id: string } | null } | undefined, myId: string | undefined) {
  const qc = useQueryClient();
  const authorId = post?.author_id ?? post?.author?.id;
  const enabled = !!post && !!myId && authorId !== myId;
  const status = useQuery({ queryKey: ['coauthor-status', post?.id], queryFn: () => fetchCoauthorStatus(post!.id), enabled, retry: false });
  const respond = useMutation({
    mutationFn: (accept: boolean) => respondCoauthor(post!.id, accept),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coauthor-status', post?.id] });
      qc.invalidateQueries({ queryKey: ['post', post?.id] });
      qc.invalidateQueries({ queryKey: ['profile-posts'] });
    },
  });
  return { pending: status.data === 'pending', respond };
}
