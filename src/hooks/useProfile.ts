import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toggleFollow } from '@/api/follows';
import { getOrCreateConversation } from '@/api/messages';
import { fetchUserPosts, pinPost, unpinPost } from '@/api/posts';
import { blockUser, fetchAchievements, fetchAlbum, fetchAlbums, fetchBlockStatus, fetchFursonaReferences, fetchFursonas, fetchFursuits, fetchUserProfile, unblockUser } from '@/api/users';

export type ProfileTab = 'posts' | 'media' | 'likes' | 'repaws' | 'archive' | 'fursona' | 'albums';
/** Вкладки со списком постов; «Фурсона» и «Альбомы» — свои данные. */
export const isPostTab = (tab: ProfileTab): tab is 'posts' | 'media' | 'likes' | 'repaws' | 'archive' => tab !== 'fursona' && tab !== 'albums';

/** Профиль по имени пользователя или id. 403/404 = не найден (retry отключён). */
export function useProfile(username: string) {
  return useQuery({ queryKey: ['profile', username], queryFn: () => fetchUserProfile(username), enabled: !!username, retry: false });
}

export function useUserPosts(userId: string | undefined, tab: ProfileTab) {
  return useQuery({ queryKey: ['profile-posts', userId, tab], queryFn: () => fetchUserPosts(userId!, tab as Exclude<ProfileTab, 'fursona' | 'albums'>), enabled: !!userId && isPostTab(tab) });
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

/** Значки профиля. Сбой не ломает страницу: блока просто не будет (как на вебе). */
export function useAchievements(userId: string | undefined) {
  return useQuery({ queryKey: ['achievements', userId], queryFn: () => fetchAchievements(userId!), enabled: !!userId, retry: false, staleTime: 60_000 });
}

export function useFursonas(userId: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: ['fursonas', userId], queryFn: () => fetchFursonas(userId!), enabled: enabled && !!userId, retry: false });
}

export function useFursonaReferences(userId: string | undefined, fursonaId: string | undefined) {
  return useQuery({ queryKey: ['fursona-refs', userId, fursonaId], queryFn: () => fetchFursonaReferences(userId!, fursonaId!), enabled: !!userId && !!fursonaId, retry: false });
}

export function useFursuits(userId: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: ['fursuits', userId], queryFn: () => fetchFursuits(userId!), enabled: enabled && !!userId, retry: false });
}

export function useAlbums(userId: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: ['albums', userId], queryFn: () => fetchAlbums(userId!), enabled: enabled && !!userId, retry: false });
}

export function useAlbum(id: string | null) {
  return useQuery({ queryKey: ['album', id], queryFn: () => fetchAlbum(id!), enabled: !!id, retry: false });
}
