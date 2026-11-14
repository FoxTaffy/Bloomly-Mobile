import { useQuery } from '@tanstack/react-query';
import { fetchConversations } from '@/api/messages';

export function useConversations() {
  return useQuery({ queryKey: ['conversations'], queryFn: fetchConversations });
}
