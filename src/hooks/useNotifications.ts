import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchNotifications, markNotificationsRead } from '@/api/notifications';
import { acceptRelationship, declineRelationship } from '@/api/relationships';

export function useNotifications() {
  return useQuery({ queryKey: ['notifications'], queryFn: fetchNotifications });
}

export function useNotificationActions() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  return {
    markRead: useMutation({ mutationFn: () => markNotificationsRead(), onSuccess: refresh }),
    accept: useMutation({ mutationFn: (id: string) => acceptRelationship(id), onSuccess: refresh }),
    decline: useMutation({ mutationFn: (id: string) => declineRelationship(id), onSuccess: refresh }),
  };
}
