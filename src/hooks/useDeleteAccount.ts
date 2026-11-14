import { useMutation, useQuery } from '@tanstack/react-query';
import { deleteMyAccount, fetchDeletionRequirements, sendDeletionCode } from '@/api/account';
import { useSession } from '@/stores/session';

/** Удаление аккаунта (веб: components/settings/SettingsDangerSection.vue). Без кэша: требования читаются при каждом открытии. */
export function useDeleteAccount() {
  const logout = useSession((s) => s.logout);
  const requirements = useQuery({ queryKey: ['account-deletion-requirements'], queryFn: fetchDeletionRequirements, gcTime: 0, staleTime: 0, retry: false });
  const sendCode = useMutation({ mutationFn: sendDeletionCode });
  const remove = useMutation({
    mutationFn: (body: { password?: string; code?: string }) => deleteMyAccount(body),
    // Сервер отозвал сессии: локально выходим (логаут сам очистит токены и кэш запросов)
    onSuccess: () => logout(),
  });
  return { requirements, sendCode, remove };
}
