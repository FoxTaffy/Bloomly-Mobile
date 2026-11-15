import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelJoinRequest,
  fetchGroup,
  fetchGroupEvents,
  fetchGroupMembers,
  fetchGroupPosts,
  fetchGroupReviews,
  fetchMyInvites,
  fetchMyJoinRequest,
  fetchMyMemberships,
  fetchMyGroups,
  fetchRecommendedGroups,
  GROUP_PAGE_SIZE,
  joinGroupRequest,
  leaveGroup,
  respondToInvite,
} from '@/api/groups';
import { useNsfwMode } from '@/hooks/useNsfwMode';
import type { Post } from '@/shared/api-types';
import { appendUnique } from '@/shared/feed';

export function useMyGroups() {
  return useQuery({ queryKey: ['groups', 'me'], queryFn: fetchMyGroups });
}

/** Членство: роль в каждой моей группе (по нему экран группы решает «вступить / выйти»). */
export function useMemberships() {
  return useQuery({ queryKey: ['groups', 'memberships'], queryFn: fetchMyMemberships });
}

export function useRecommendedGroups() {
  return useQuery({ queryKey: ['groups', 'discover'], queryFn: fetchRecommendedGroups });
}

export function useGroup(id: string) {
  return useQuery({ queryKey: ['group', id], queryFn: () => fetchGroup(id), enabled: !!id, retry: false });
}

/** Состояние вступления: участник ли я, жду ли ответа на заявку (закрытая группа). */
export function useGroupActions(groupId: string) {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['groups'] });
    qc.invalidateQueries({ queryKey: ['group', groupId] });
    qc.invalidateQueries({ queryKey: ['group-join-request', groupId] });
  };
  return {
    join: useMutation({ mutationFn: () => joinGroupRequest(groupId), onSuccess: refresh }),
    leave: useMutation({ mutationFn: () => leaveGroup(groupId), onSuccess: refresh }),
    cancelRequest: useMutation({ mutationFn: () => cancelJoinRequest(groupId), onSuccess: refresh }),
  };
}

export function useJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => joinGroupRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['group'] });
    },
  });
}

export function useMyJoinRequest(groupId: string, enabled: boolean) {
  return useQuery({ queryKey: ['group-join-request', groupId], queryFn: () => fetchMyJoinRequest(groupId), enabled: enabled && !!groupId });
}

/** Посты группы страницами; 18+ скрывает сама карточка (`PostCard` по режиму NSFW). */
export function useGroupPosts(groupId: string, enabled = true) {
  const query = useInfiniteQuery({
    queryKey: ['group-posts', groupId],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchGroupPosts(groupId, pageParam),
    getNextPageParam: (last, all) => (last.length >= GROUP_PAGE_SIZE ? all.length + 1 : undefined),
    enabled: enabled && !!groupId,
  });
  const posts = (query.data?.pages ?? []).reduce<Post[]>((acc, page) => appendUnique(acc, page), []);
  return { ...query, posts };
}

export function useGroupMembers(groupId: string, enabled: boolean) {
  const query = useInfiniteQuery({
    queryKey: ['group-members', groupId],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchGroupMembers(groupId, pageParam),
    getNextPageParam: (last, all) => (last.length >= GROUP_PAGE_SIZE ? all.length + 1 : undefined),
    enabled: enabled && !!groupId,
  });
  const seen = new Set<string>();
  const members = (query.data?.pages ?? []).flat().filter((m) => (seen.has(m.user_id) ? false : (seen.add(m.user_id), true)));
  return { ...query, members };
}

export function useGroupEvents(groupId: string, enabled: boolean) {
  return useQuery({ queryKey: ['group-events', groupId], queryFn: () => fetchGroupEvents(groupId), enabled: enabled && !!groupId });
}

export function useGroupReviews(groupId: string, enabled: boolean) {
  return useQuery({ queryKey: ['group-reviews', groupId], queryFn: () => fetchGroupReviews(groupId), enabled: enabled && !!groupId });
}

/** Приглашения в группы (web: «Мои приглашения»); учитывают режим 18+. */
export function useInvites() {
  const { nsfwMode } = useNsfwMode();
  return useQuery({ queryKey: ['groups', 'invites', nsfwMode], queryFn: () => fetchMyInvites(nsfwMode) });
}

export function useRespondInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) => respondToInvite(id, accept),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}
