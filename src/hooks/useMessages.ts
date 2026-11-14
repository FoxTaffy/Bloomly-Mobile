import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { uploadMedia } from '@/api/media';
import { fetchMessages, fetchMessagesPage, fetchUnreadCount, markConversationRead, sendMessage } from '@/api/messages';
import type { Conversation, Message } from '@/shared/api-types';
import { mergeMessages } from '@/shared/messages';

/** Сообщения диалога по возрастанию времени. */
export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => fetchMessages(conversationId),
    enabled: !!conversationId,
    select: (list) => [...list].sort((a, b) => a.created_at.localeCompare(b.created_at)),
  });
}

/** Диалог из кэша списка (без отдельного запроса). */
export function useCachedConversation(conversationId: string): Conversation | undefined {
  const qc = useQueryClient();
  return qc.getQueryData<Conversation[]>(['conversations'])?.find((c) => c.id === conversationId);
}

/** Добавляет сообщение в кэш диалога (свои отправленные и пришедшие по WebSocket) без дублей. */
export function useAppendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useCallback(
    (msg: Message) => {
      qc.setQueryData<Message[]>(['messages', conversationId], (prev) => {
        if (!prev) return [msg];
        return prev.some((m) => m.id === msg.id) ? prev : [...prev, msg];
      });
    },
    [qc, conversationId],
  );
}

export function useSendMessage(conversationId: string, onSent: (msg: Message) => void) {
  const send = useMutation({
    mutationFn: (body: { content: string; file_url?: string; media_type?: string }) => sendMessage(conversationId, body),
    onSuccess: onSent,
  });
  /** Голосовое: загрузка файла, затем сообщение. Возвращает false, если загрузка не удалась. */
  const sendVoice = async (uri: string): Promise<boolean> => {
    try {
      const { url } = await uploadMedia(uri, 'messages', 'audio/m4a');
      await send.mutateAsync({ content: '', file_url: url, media_type: 'voice' });
      return true;
    } catch {
      return false;
    }
  };
  return { send, sendVoice };
}

export function useMarkConversationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => markConversationRead(conversationId),
    onSuccess: (_d, conversationId) => {
      qc.setQueryData<Conversation[]>(['conversations'], (old) => old?.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c)));
      qc.invalidateQueries({ queryKey: ['unread-messages'] });
    },
  });
}

/** Догрузка более старых сообщений по курсору `before` (веб: stores/messages.ts fetchMessagesPage). */
export function useOlderMessages(conversationId: string) {
  const qc = useQueryClient();
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const loadOlder = useCallback(async () => {
    const current = qc.getQueryData<Message[]>(['messages', conversationId]);
    if (!current?.length || loading || !hasMore) return;
    setLoading(true);
    try {
      const oldest = [...current].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
      const page = await fetchMessagesPage(conversationId, oldest.created_at);
      setHasMore(page.hasMore);
      qc.setQueryData<Message[]>(['messages', conversationId], (prev) => mergeMessages(prev ?? [], page.messages));
    } finally {
      setLoading(false);
    }
  }, [qc, conversationId, loading, hasMore]);
  return { loadOlder, loading, hasMore };
}

/** Число непрочитанных диалогов-сообщений для значка на вкладке (личные + групповые). */
export function useUnreadMessages() {
  const q = useQuery({ queryKey: ['unread-messages'], queryFn: fetchUnreadCount, staleTime: 15_000 });
  return (q.data?.personal ?? 0) + (q.data?.group ?? 0);
}
