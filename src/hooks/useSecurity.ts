import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSessions, revokeOtherSessions, revokeSession, type DeviceSession } from '@/api/account';

export function useSessions() {
  return useQuery({ queryKey: ['sessions'], queryFn: fetchSessions });
}

/** Завершить сеанс на другом устройстве или все остальные: строки пропадают сразу (веб: sessions.filter). */
export function useSessionActions() {
  const qc = useQueryClient();
  return {
    revoke: useMutation({
      mutationFn: (id: string) => revokeSession(id),
      onSuccess: (_d, id) => qc.setQueryData<DeviceSession[]>(['sessions'], (l) => l?.filter((s) => s.id !== id)),
    }),
    revokeOthers: useMutation({
      mutationFn: () => revokeOtherSessions(),
      onSuccess: () => qc.setQueryData<DeviceSession[]>(['sessions'], (l) => l?.filter((s) => s.current)),
    }),
  };
}
