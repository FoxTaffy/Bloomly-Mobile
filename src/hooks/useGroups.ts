import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchGroup, fetchMyGroups, fetchRecommendedGroups, joinGroup } from '@/api/groups';

export function useMyGroups() {
  return useQuery({ queryKey: ['groups', 'me'], queryFn: fetchMyGroups });
}

export function useRecommendedGroups() {
  return useQuery({ queryKey: ['groups', 'discover'], queryFn: fetchRecommendedGroups });
}

export function useJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => joinGroup(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['group'] });
    },
  });
}

export function useGroup(id: string) {
  return useQuery({ queryKey: ['group', id], queryFn: () => fetchGroup(id), enabled: !!id, retry: false });
}
