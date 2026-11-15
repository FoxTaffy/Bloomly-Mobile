import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  answerDmRequest,
  createGroupChat,
  deleteConversation,
  deleteMessage,
  editMessage,
  forwardMessage,
  setArchived,
  setChatPinned,
  setMute,
  toggleReaction,
} from '@/api/messages';
import type { Conversation, Message } from '@/shared/api-types';

/** Действия с сообщением: ответ сервера кладём в кэш беседы (то же делают события WebSocket message_updated / message_deleted). */
export function useMessageActions(conversationId: string) {
  const qc = useQueryClient();
  const key = ['messages', conversationId];
  const replace = (m: Message) => qc.setQueryData<Message[]>(key, (old) => old?.map((x) => (x.id === m.id ? { ...x, ...m } : x)));

  return {
    edit: useMutation({ mutationFn: ({ id, text }: { id: string; text: string }) => editMessage(id, text), onSuccess: replace }),
    react: useMutation({ mutationFn: ({ id, emoji }: { id: string; emoji: string }) => toggleReaction(id, emoji), onSuccess: replace }),
    remove: useMutation({
      mutationFn: (id: string) => deleteMessage(id),
      onSuccess: (_d, id) => {
        qc.setQueryData<Message[]>(key, (old) => old?.filter((x) => x.id !== id));
        qc.invalidateQueries({ queryKey: ['conversations'] });
      },
    }),
    forward: useMutation({
      mutationFn: ({ id, to }: { id: string; to: string }) => forwardMessage(id, to),
      onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
    }),
  };
}

/** Действия с беседой в списке: закрепить, без звука, архив, удалить у себя, ответ на запрос переписки. */
export function useConversationActions() {
  const qc = useQueryClient();
  const patch = (id: string, fn: (c: Conversation) => Conversation | null) =>
    qc.setQueryData<Conversation[]>(['conversations'], (old) => old?.flatMap((c) => (c.id === id ? (fn(c) ? [fn(c)!] : []) : [c])));
  const mine = (c: Conversation, p: Partial<NonNullable<Conversation['my_participant']>>): Conversation => ({
    ...c,
    my_participant: { archived: false, ...c.my_participant, ...p },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['conversations'] });

  return {
    pin: useMutation({
      mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) => setChatPinned(id, pinned),
      onSuccess: (_d, { id, pinned }) => patch(id, (c) => mine(c, { pinned_at: pinned ? new Date().toISOString() : null })),
      onError: refresh,
    }),
    mute: useMutation({
      mutationFn: ({ id, until }: { id: string; until: string | null }) => setMute(id, until),
      onSuccess: (_d, { id, until }) => patch(id, (c) => mine(c, { muted_until: until })),
      onError: refresh,
    }),
    archive: useMutation({
      mutationFn: ({ id, archived }: { id: string; archived: boolean }) => setArchived(id, archived),
      onSuccess: (_d, { id, archived }) => patch(id, (c) => mine(c, { archived })),
      onError: refresh,
    }),
    remove: useMutation({
      mutationFn: (id: string) => deleteConversation(id, 'me'),
      onSuccess: (_d, id) => patch(id, () => null),
      onError: refresh,
    }),
    answerRequest: useMutation({
      mutationFn: ({ id, accept }: { id: string; accept: boolean }) => answerDmRequest(id, accept),
      onSuccess: (_d, { id, accept }) => (accept ? patch(id, (c) => ({ ...c, request_status: 'accepted' })) : patch(id, () => null)),
      onError: refresh,
    }),
  };
}

export function useCreateGroupChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, userIds }: { name: string; userIds: string[] }) => createGroupChat(name, userIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}
