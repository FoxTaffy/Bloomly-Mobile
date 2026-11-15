import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTicket, fetchTickets, replyTicket, type SupportTicket } from '@/api/support';

export function useTickets() {
  return useQuery({ queryKey: ['support-tickets'], queryFn: fetchTickets });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTicket,
    onSuccess: (ticket) => qc.setQueryData<SupportTicket[]>(['support-tickets'], (l) => [ticket, ...(l ?? [])]),
  });
}

/** Ответ в обращении: сообщение и новый статус от сервера кладём в кэш (веб: applyReply). */
export function useReplyTicket(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => replyTicket(id, message),
    onSuccess: ({ message, status }) =>
      qc.setQueryData<SupportTicket[]>(['support-tickets'], (l) => l?.map((t) => (t.id === id ? { ...t, status, messages: [...t.messages, message] } : t))),
  });
}
