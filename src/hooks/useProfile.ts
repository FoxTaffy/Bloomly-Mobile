import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toggleFollow } from '@/api/follows';
import { getOrCreateConversation } from '@/api/messages';
import { fetchUserPosts } from '@/api/posts';
import { fetchUserProfile } from '@/api/users';

export type ProfileTab = 'posts' | 'media' | 'likes' | 'repaws';

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
