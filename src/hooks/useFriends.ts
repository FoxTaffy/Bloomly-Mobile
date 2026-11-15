import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchFriendList, fetchSuggestions, removeFriend, sendFriendRequest, type FriendTab } from '@/api/friends';
import { toggleFollow } from '@/api/follows';

export function useFriendList(tab: FriendTab) {
  return useQuery({ queryKey: ['friends', tab], queryFn: () => fetchFriendList(tab) });
}

export function useSuggestions() {
  return useQuery({ queryKey: ['friends', 'suggestions'], queryFn: fetchSuggestions });
}

/** После любой смены связи человек переезжает между вкладками (друзья ↔ подписчики ↔ подписки), поэтому обновляем все. */
function useRefreshLists() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['friends'] });
    qc.invalidateQueries({ queryKey: ['profile'] });
  };
}

export function useSendFriendRequest() {
  const refresh = useRefreshLists();
  return useMutation({ mutationFn: (target: string) => sendFriendRequest(target.trim()), onSuccess: refresh });
}

export function useRemoveFriend() {
  const refresh = useRefreshLists();
  return useMutation({ mutationFn: (id: string) => removeFriend(id), onSuccess: refresh });
}

export function useUnfollow() {
  const refresh = useRefreshLists();
  return useMutation({ mutationFn: (id: string) => toggleFollow(id), onSuccess: refresh });
}
