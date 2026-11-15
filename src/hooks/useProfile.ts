import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toggleFollow } from '@/api/follows';
import { getOrCreateConversation } from '@/api/messages';
import { fetchUserPosts, pinPost, unpinPost } from '@/api/posts';
import { blockUser, fetchBlockStatus, fetchUserProfile, unblockUser } from '@/api/users';

export type ProfileTab = 'posts' | 'media' | 'likes' | 'repaws' | 'archive';

/** Профиль по имени пользователя или id. 403/404 = не найден (retry отключён). */
export function useProfile(username: string) {
  return useQuery({ queryKey: ['profile', username], queryFn: () => fetchUserProfile(username), enabled: !!username, retry: false });
}

export function useUserPosts(userId: string | undefined, tab: ProfileTab) {
  return useQuery({ queryKey: ['profile-posts', userId, tab], queryFn: () => fetchUserPosts(userId!, tab), enabled: !!userId });
}

export function useToggleFollow(username: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => toggleFollow(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', username] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

/** Открыть (или создать) личный диалог с пользователем. */
export function useOpenConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => getOrCreateConversation(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

export function useBlockStatus(userId: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: ['block-status', userId], queryFn: () => fetchBlockStatus(userId!), enabled: enabled && !!userId });
}

export function useToggleBlock(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (blocked: boolean) => (blocked ? unblockUser(userId) : blockUser(userId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['block-status', userId] });
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

/** Закрепить свой пост в профиле или открепить (веб: PUT /users/me/pin/:id, DELETE /users/me/pin). */
export function useTogglePin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, pinned }: { postId: string; pinned: boolean }) => (pinned ? unpinPost() : pinPost(postId)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });
}
