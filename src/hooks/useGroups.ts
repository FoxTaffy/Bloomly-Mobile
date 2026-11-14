import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMyGroups, fetchRecommendedGroups, joinGroup } from '@/api/groups';

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}
